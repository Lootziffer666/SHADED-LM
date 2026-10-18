package com.shadedlm.app

import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract
import com.getcapacitor.JSObject
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.UUID
import java.util.zip.ZipFile

class MaterializationStore(private val context: Context) {
    private val resolver get() = context.contentResolver
    private val baseDir = File(context.cacheDir, "shaded-lm-materialized").apply { mkdirs() }

    fun materialize(bundle: JSONObject): JSObject {
        val id = UUID.randomUUID().toString()
        val root = File(baseDir, id).apply { mkdirs() }
        val members = bundle.getJSONArray("members")
        val primaryPath = BundlePrimaryPath.clean(bundle.getString("primaryMember"))
        val archiveCache = mutableMapOf<String, File>()
        val urls = JSObject()
        val relativePaths = JSONArray()
        var primaryUrl: String? = null
        try {
            for (i in 0 until members.length()) {
                val member = members.getJSONObject(i)
                val relative = SourcePathPolicy.clean(member.getString("relativePath"))
                val target = safeChild(root, relative)
                target.parentFile?.mkdirs()
                copySource(member.getJSONObject("source"), target, archiveCache)
                val url = Uri.fromFile(target).toString()
                urls.put(relative, url)
                relativePaths.put(relative)
                if (BundlePrimaryPath.matches(primaryPath, relative)) primaryUrl = url
            }
            require(primaryUrl != null) { "Primary member not found in bundle members: $primaryPath" }
            return JSObject().apply {
                put("id", id)
                put("primaryUrl", primaryUrl)
                put("memberUrls", urls)
                put("relativePaths", relativePaths)
            }
        } catch (e: Exception) {
            root.deleteRecursively()
            throw e
        } finally {
            archiveCache.values.forEach { if (it.parentFile?.name == "archive-cache") it.delete() }
        }
    }

    fun release(id: String) {
        val root = safeChild(baseDir, SourcePathPolicy.clean(id))
        root.deleteRecursively()
    }

    fun copySource(source: JSONObject, target: File, archiveCache: MutableMap<String, File> = mutableMapOf()) {
        when (source.getString("kind")) {
            "saf-document" -> resolver.openInputStream(documentUri(source)).useRequired { input ->
                FileOutputStream(target).use { output -> input.copyTo(output) }
            }
            "zip-entry" -> {
                val archive = source.getJSONObject("archive")
                val archiveFile = archiveFile(archive, archiveCache)
                val entryPath = SourcePathPolicy.clean(source.getString("entryPath"))
                ZipFile(archiveFile).use { zip ->
                    val entry = zip.getEntry(entryPath) ?: throw IllegalArgumentException("ZIP entry missing: $entryPath")
                    require(!entry.isDirectory) { "Cannot materialize ZIP directory: $entryPath" }
                    zip.getInputStream(entry).use { input -> FileOutputStream(target).use { output -> input.copyTo(output) } }
                }
            }
            else -> throw IllegalArgumentException("Unknown source kind: ${source.optString("kind")}")
        }
    }

    private fun archiveFile(source: JSONObject, cache: MutableMap<String, File>): File {
        val key = sourceIdentity(source)
        return cache.getOrPut(key) {
            val dir = File(baseDir, "archive-cache").apply { mkdirs() }
            val file = File(dir, UUID.randomUUID().toString() + ".zip")
            copySource(source, file, cache)
            file
        }
    }

    private fun sourceIdentity(source: JSONObject): String = when (source.getString("kind")) {
        "saf-document" -> "${source.getString("grantId")}:${source.getString("documentId")}"
        "zip-entry" -> sourceIdentity(source.getJSONObject("archive")) + "!" + source.getString("entryPath")
        else -> source.toString()
    }

    private fun documentUri(source: JSONObject): Uri {
        val grant = Uri.parse(source.getString("grantId"))
        return if (DocumentsContract.isTreeUri(grant)) {
            DocumentsContract.buildDocumentUriUsingTree(grant, source.getString("documentId"))
        } else {
            grant
        }
    }

    private fun safeChild(root: File, relative: String): File {
        val child = File(root, relative)
        val rootPath = root.canonicalFile.toPath()
        val childPath = child.canonicalFile.toPath()
        require(childPath.startsWith(rootPath)) { "Path escapes materialization root" }
        return child
    }

    private inline fun <T : InputStream, R> T?.useRequired(block: (T) -> R): R {
        val stream = this ?: throw IllegalStateException("Unable to open source stream")
        return stream.use(block)
    }
}
