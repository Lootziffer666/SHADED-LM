package com.shadedlm.app

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import org.json.JSONObject
import java.io.File
import java.util.UUID
import java.util.zip.ZipFile

class ZipCatalog(private val store: MaterializationStore, private val tempRoot: File) {
    fun catalog(source: JSONObject, maxDepth: Int): JSObject {
        require(maxDepth in 0..8) { "Invalid ZIP depth" }
        val tempDir = File(tempRoot, "zip-catalog-${UUID.randomUUID()}").apply { mkdirs() }
        val rootZip = File(tempDir, "root.zip")
        val entries = JSArray()
        val warnings = JSArray()
        try {
            store.copySource(source, rootZip)
            walk(rootZip, source, 0, maxDepth, entries, warnings, tempDir)
            return JSObject().apply { put("entries", entries); put("warnings", warnings) }
        } finally {
            tempDir.deleteRecursively()
        }
    }

    private fun walk(zipFile: File, archiveRef: JSONObject, depth: Int, maxDepth: Int, entries: JSArray, warnings: JSArray, tempDir: File) {
        try {
            ZipFile(zipFile).use { zip ->
                val enum = zip.entries()
                while (enum.hasMoreElements()) {
                    val entry = enum.nextElement()
                    val cleanPath = try { SourcePathPolicy.clean(entry.name) } catch (_: IllegalArgumentException) {
                        warnings.put("Unsafe ZIP path ignored: ${entry.name}"); continue
                    }
                    val sourceRef = JSObject().apply {
                        put("kind", "zip-entry")
                        put("archive", JSONObject(archiveRef.toString()))
                        put("entryPath", cleanPath)
                        if (entry.size >= 0) put("size", entry.size)
                        if (entry.crc >= 0) put("crc32", entry.crc)
                        if (entry.time > 0) put("modifiedAt", entry.time)
                    }
                    entries.put(JSObject().apply {
                        put("source", sourceRef)
                        put("entryPath", cleanPath)
                        put("size", if (entry.size >= 0) entry.size else 0L)
                        if (entry.time > 0) put("modifiedAt", entry.time)
                        if (entry.crc >= 0) put("crc32", entry.crc)
                        put("directory", entry.isDirectory)
                        put("depth", depth)
                    })
                    if (!entry.isDirectory && cleanPath.endsWith(".zip", ignoreCase = true)) {
                        if (depth >= maxDepth) {
                            warnings.put("Nested ZIP depth limit $maxDepth reached at $cleanPath")
                        } else {
                            val nested = File(tempDir, "nested-${UUID.randomUUID()}.zip")
                            zip.getInputStream(entry).use { input -> nested.outputStream().use { output -> input.copyTo(output) } }
                            walk(nested, sourceRef, depth + 1, maxDepth, entries, warnings, tempDir)
                            nested.delete()
                        }
                    }
                }
            }
        } catch (e: Exception) {
            warnings.put("ZIP read failed at depth $depth: ${e.message ?: e.javaClass.simpleName}")
        }
    }
}
