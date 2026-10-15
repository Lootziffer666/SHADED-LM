package com.shadedlm.app

import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract
import android.util.Base64
import com.getcapacitor.JSObject
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class ExportStore(private val context: Context, private val materializations: MaterializationStore) {
    private data class Session(val id: String, val name: String, val uri: Uri, val file: File, val zip: ZipOutputStream, val paths: MutableSet<String> = mutableSetOf())
    private val sessions = ConcurrentHashMap<String, Session>()
    private val dir = File(context.cacheDir, "shaded-lm-export").apply { mkdirs() }

    @Synchronized fun start(uri: Uri, suggestedName: String): JSObject {
        val id = UUID.randomUUID().toString()
        val file = File(dir, "$id.zip")
        val zip = ZipOutputStream(FileOutputStream(file))
        sessions[id] = Session(id, suggestedName, uri, file, zip)
        return JSObject().apply { put("id", id); put("name", suggestedName) }
    }

    @Synchronized fun write(targetId: String, rawPath: String, write: JSONObject) {
        val session = sessions[targetId] ?: throw IllegalArgumentException("Export target not found")
        val path = SourcePathPolicy.clean(rawPath)
        require(session.paths.add(path)) { "Duplicate export path: $path" }
        session.zip.putNextEntry(ZipEntry(path))
        try {
            when {
                write.has("base64") -> session.zip.write(Base64.decode(write.getString("base64"), Base64.DEFAULT))
                write.has("source") -> {
                    val temp = File(dir, "source-${UUID.randomUUID()}.bin")
                    try { materializations.copySource(write.getJSONObject("source"), temp); temp.inputStream().use { it.copyTo(session.zip) } } finally { temp.delete() }
                }
                else -> throw IllegalArgumentException("Export write requires base64 or source")
            }
        } finally { session.zip.closeEntry(); session.zip.flush() }
    }

    @Synchronized fun finish(targetId: String): JSObject {
        val session = sessions.remove(targetId) ?: throw IllegalArgumentException("Export target not found")
        return try {
            session.zip.finish(); session.zip.close()
            val bytes = session.file.length()
            context.contentResolver.openOutputStream(session.uri, "w").use { output ->
                requireNotNull(output) { "Unable to open export destination" }
                session.file.inputStream().use { input -> input.copyTo(output) }
            }
            JSObject().apply { put("bytes", bytes) }
        } finally { session.file.delete() }
    }

    @Synchronized fun abort(targetId: String) {
        val session = sessions.remove(targetId) ?: return
        runCatching { session.zip.close() }
        session.file.delete()
        runCatching { DocumentsContract.deleteDocument(context.contentResolver, session.uri) }
    }
}
