package com.shadedlm.app

import android.content.ContentResolver
import android.net.Uri
import android.provider.DocumentsContract
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import java.util.ArrayDeque
import java.util.concurrent.ConcurrentHashMap

class SafTreeWalker(private val resolver: ContentResolver) {
    private val sessions = ConcurrentHashMap<String, List<JSObject>>()
    private val pageSize = 300

    fun validate(grantId: String): String {
        val uri = Uri.parse(grantId)
        val permission = resolver.persistedUriPermissions.firstOrNull { it.uri == uri && it.isReadPermission }
            ?: return "revoked"
        return try {
            resolver.query(
                DocumentsContract.buildDocumentUriUsingTree(uri, DocumentsContract.getTreeDocumentId(uri)),
                arrayOf(DocumentsContract.Document.COLUMN_DOCUMENT_ID), null, null, null
            )?.use { if (it.moveToFirst()) "available" else "missing" } ?: "missing"
        } catch (_: SecurityException) { "revoked" } catch (_: Exception) { "missing" }
    }

    fun listPage(grantId: String, cursor: String?): JSObject {
        val offset = cursor?.toIntOrNull()?.coerceAtLeast(0) ?: 0
        val entries = if (offset == 0 || !sessions.containsKey(grantId)) scan(grantId).also { sessions[grantId] = it } else sessions[grantId]!!
        val end = (offset + pageSize).coerceAtMost(entries.size)
        val result = JSObject()
        val array = JSArray()
        for (i in offset until end) array.put(entries[i])
        result.put("entries", array)
        if (end < entries.size) result.put("nextCursor", end.toString()) else sessions.remove(grantId)
        return result
    }

    private fun scan(grantId: String): List<JSObject> {
        val tree = Uri.parse(grantId)
        val rootId = DocumentsContract.getTreeDocumentId(tree)
        val queue = ArrayDeque<Pair<String, String>>()
        queue.add(rootId to "")
        val out = mutableListOf<JSObject>()
        val projection = arrayOf(
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE,
            DocumentsContract.Document.COLUMN_SIZE,
            DocumentsContract.Document.COLUMN_LAST_MODIFIED
        )
        while (queue.isNotEmpty()) {
            val (parentId, parentPath) = queue.removeFirst()
            val children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, parentId)
            resolver.query(children, projection, null, null, null)?.use { c ->
                val idIx = c.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DOCUMENT_ID)
                val nameIx = c.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
                val mimeIx = c.getColumnIndexOrThrow(DocumentsContract.Document.COLUMN_MIME_TYPE)
                val sizeIx = c.getColumnIndex(DocumentsContract.Document.COLUMN_SIZE)
                val modifiedIx = c.getColumnIndex(DocumentsContract.Document.COLUMN_LAST_MODIFIED)
                while (c.moveToNext()) {
                    val id = c.getString(idIx)
                    val name = c.getString(nameIx) ?: id.substringAfterLast('/')
                    val mime = c.getString(mimeIx) ?: "application/octet-stream"
                    val directory = mime == DocumentsContract.Document.MIME_TYPE_DIR
                    val relative = if (parentPath.isBlank()) name else "$parentPath/$name"
                    if (directory) queue.add(id to relative)
                    val size = if (sizeIx >= 0 && !c.isNull(sizeIx)) c.getLong(sizeIx) else 0L
                    val modified = if (modifiedIx >= 0 && !c.isNull(modifiedIx)) c.getLong(modifiedIx) else 0L
                    val source = JSObject()
                    source.put("kind", "saf-document")
                    source.put("grantId", grantId)
                    source.put("documentId", id)
                    source.put("name", name)
                    source.put("size", size)
                    if (modified > 0L) source.put("modifiedAt", modified)
                    val entry = JSObject()
                    entry.put("source", source)
                    entry.put("name", name)
                    entry.put("relativePath", relative)
                    entry.put("mimeType", mime)
                    entry.put("size", size)
                    if (modified > 0L) entry.put("modifiedAt", modified)
                    entry.put("directory", directory)
                    out.add(entry)
                }
            }
        }
        return out
    }
}
