package com.shadedlm.app

import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class BundleMover(
    private val context: Context,
    private val materializations: MaterializationStore,
    private val journal: MoveJournal
) {
    private val resolver get() = context.contentResolver

    fun move(request: JSONObject): JSObject {
        val journalId = request.getString("journalId")
        val destinations = JSONArray()
        journal.write(journalId, "planned", request, destinations)
        return try {
            val grantId = request.getString("destinationGrantId")
            val result = if (NativeDownloads.isGrant(grantId)) moveToDownloads(request, destinations) else moveToSaf(request, destinations)
            journal.write(journalId, "committed", request, destinations)
            journal.complete(journalId)
            result
        } catch (e: Exception) {
            journal.write(journalId, "failed", request, destinations, e.message ?: e.javaClass.simpleName)
            JSObject().apply { put("journalId", journalId); put("status", "failed"); put("error", e.message ?: "Move failed") }
        }
    }

    private fun moveToDownloads(request: JSONObject, destinations: JSONArray): JSObject {
        require(NativeDownloads.hasAccess()) { "Downloads access is not granted" }
        val journalId = request.getString("journalId")
        val grantId = request.getString("destinationGrantId")
        val root = NativeDownloads.root()
        val destinationPath = request.getJSONArray("destinationPath")
        val pathSegments = (0 until destinationPath.length()).map { destinationPath.getString(it) }
        var destinationRoot = NativeDownloads.ensureDirectory(root, pathSegments)
        val bundle = request.getJSONObject("bundle")
        val members = bundle.getJSONArray("members")
        val primaryPath = SourcePathPolicy.clean(bundle.getString("primaryMember"))
        if (members.length() > 1) {
            val folderName = safeDisplayName(request.optString("displayName", primaryPath.substringAfterLast('/').substringBeforeLast('.')))
            destinationRoot = uniqueDirectory(destinationRoot, folderName)
        }
        journal.write(journalId, "copying", request, destinations)
        val tempRoot = File(context.cacheDir, "move-$journalId").apply { mkdirs() }
        try {
            for (i in 0 until members.length()) {
                val member = members.getJSONObject(i)
                val originalPath = SourcePathPolicy.clean(member.getString("relativePath"))
                val relative = SourcePathPolicy.clean(relativeToPrimary(primaryPath, originalPath))
                val components = relative.split('/').filter { it.isNotBlank() }
                var parent = destinationRoot
                if (components.size > 1) parent = NativeDownloads.ensureDirectory(destinationRoot, components.dropLast(1))
                val originalName = components.lastOrNull() ?: originalPath.substringAfterLast('/')
                val fileName = if (members.length() == 1) uniqueFileName(parent, originalName) else originalName
                val target = File(parent, fileName).canonicalFile
                require(target.toPath().startsWith(root.canonicalFile.toPath())) { "Destination escapes Downloads root" }
                require(!target.exists()) { "Destination already exists: $fileName" }
                val temp = File(tempRoot, "member-$i.bin")
                materializations.copySource(member.getJSONObject("source"), temp)
                temp.inputStream().use { input -> target.outputStream().use { output -> input.copyTo(output) } }
                require(target.length() == temp.length()) { "Verification failed for $fileName: ${temp.length()} != ${target.length()}" }
                destinations.put(JSONObject().apply {
                    put("originalPath", originalPath)
                    put("documentId", NativeDownloads.relative(root, target))
                    put("name", fileName)
                    put("size", target.length())
                    put("grantId", grantId)
                })
                journal.write(journalId, "copying", request, destinations)
            }
        } finally { tempRoot.deleteRecursively() }
        journal.write(journalId, "verifying", request, destinations)
        verifyDestinations(grantId, destinations)
        journal.write(journalId, "deletingSource", request, destinations)
        deleteOriginalMembers(bundle)
        return committedResult(request, destinations)
    }

    private fun moveToSaf(request: JSONObject, destinations: JSONArray): JSObject {
        val journalId = request.getString("journalId")
        val grantId = request.getString("destinationGrantId")
        val tree = Uri.parse(grantId)
        var parentId = DocumentsContract.getTreeDocumentId(tree)
        val destinationPath = request.getJSONArray("destinationPath")
        for (i in 0 until destinationPath.length()) parentId = ensureSafDirectory(tree, parentId, destinationPath.getString(i))
        val bundle = request.getJSONObject("bundle")
        val members = bundle.getJSONArray("members")
        val primaryPath = SourcePathPolicy.clean(bundle.getString("primaryMember"))
        if (members.length() > 1) {
            val folderName = safeDisplayName(request.optString("displayName", primaryPath.substringAfterLast('/').substringBeforeLast('.')))
            parentId = ensureSafDirectory(tree, parentId, folderName)
        }
        journal.write(journalId, "copying", request, destinations)
        val tempRoot = File(context.cacheDir, "move-$journalId").apply { mkdirs() }
        try {
            for (i in 0 until members.length()) {
                val member = members.getJSONObject(i)
                val originalPath = SourcePathPolicy.clean(member.getString("relativePath"))
                val relative = relativeToPrimary(primaryPath, originalPath)
                val components = relative.split('/').filter { it.isNotBlank() }
                var fileParent = parentId
                for (part in components.dropLast(1)) fileParent = ensureSafDirectory(tree, fileParent, part)
                val fileName = components.lastOrNull() ?: originalPath.substringAfterLast('/')
                val temp = File(tempRoot, "member-$i.bin")
                materializations.copySource(member.getJSONObject("source"), temp)
                val document = DocumentsContract.createDocument(resolver, documentUri(tree, fileParent), mimeFor(fileName), fileName)
                    ?: throw IllegalStateException("Unable to create destination for $fileName")
                resolver.openOutputStream(document, "w").use { output ->
                    requireNotNull(output) { "Unable to open destination stream for $fileName" }
                    temp.inputStream().use { input -> input.copyTo(output) }
                }
                val documentId = DocumentsContract.getDocumentId(document)
                val actualSize = querySafSize(tree, documentId)
                require(actualSize == temp.length()) { "Verification failed for $fileName: ${temp.length()} != $actualSize" }
                destinations.put(JSONObject().apply {
                    put("originalPath", originalPath)
                    put("documentId", documentId)
                    put("name", fileName)
                    put("size", actualSize)
                    put("grantId", grantId)
                })
                journal.write(journalId, "copying", request, destinations)
            }
        } finally { tempRoot.deleteRecursively() }
        journal.write(journalId, "verifying", request, destinations)
        verifyDestinations(grantId, destinations)
        journal.write(journalId, "deletingSource", request, destinations)
        deleteOriginalMembers(bundle)
        return committedResult(request, destinations)
    }

    fun recoverAll(): JSObject {
        var recovered = 0
        var failed = 0
        val results = JSArray()
        for (record in journal.pending()) {
            val id = record.getString("id")
            val request = record.getJSONObject("request")
            val destinations = record.optJSONArray("destinations") ?: JSONArray()
            val result = try {
                if (record.optString("phase") == "deletingSource") {
                    deleteOriginalMembers(request.getJSONObject("bundle"))
                    committedResult(request, destinations).also { journal.complete(id) }
                } else {
                    cleanupDestinations(request.getString("destinationGrantId"), destinations)
                    move(request)
                }
            } catch (e: Exception) {
                JSObject().apply { put("journalId", id); put("status", "failed"); put("error", e.message ?: "Recovery failed") }
            }
            results.put(result)
            if (result.optString("status") == "committed") recovered++ else failed++
        }
        return JSObject().apply { put("recovered", recovered); put("failed", failed); put("results", results) }
    }

    private fun committedResult(request: JSONObject, destinations: JSONArray): JSObject {
        val sources = JSObject()
        for (i in 0 until destinations.length()) {
            val d = destinations.getJSONObject(i)
            sources.put(d.getString("originalPath"), JSObject().apply {
                put("kind", "saf-document")
                put("grantId", d.getString("grantId"))
                put("documentId", d.getString("documentId"))
                put("name", d.getString("name"))
                put("size", d.getLong("size"))
            })
        }
        return JSObject().apply {
            put("journalId", request.getString("journalId"))
            if (request.has("assetId")) put("assetId", request.getString("assetId"))
            put("status", "committed")
            put("destinationSources", sources)
            put("destinationPath", request.getJSONArray("destinationPath"))
        }
    }

    private fun verifyDestinations(grantId: String, destinations: JSONArray) {
        if (NativeDownloads.isGrant(grantId)) {
            val root = NativeDownloads.root()
            for (i in 0 until destinations.length()) {
                val d = destinations.getJSONObject(i)
                val file = NativeDownloads.resolve(root, d.getString("documentId"))
                require(file.isFile && file.length() == d.getLong("size")) { "Destination verification failed" }
            }
            return
        }
        val tree = Uri.parse(grantId)
        for (i in 0 until destinations.length()) {
            val d = destinations.getJSONObject(i)
            require(querySafSize(tree, d.getString("documentId")) == d.getLong("size")) { "Destination verification failed" }
        }
    }

    private fun cleanupDestinations(grantId: String, destinations: JSONArray) {
        if (NativeDownloads.isGrant(grantId)) {
            val root = NativeDownloads.root()
            for (i in destinations.length() - 1 downTo 0) {
                val id = destinations.optJSONObject(i)?.optString("documentId") ?: continue
                runCatching { NativeDownloads.resolve(root, id).delete() }
            }
            return
        }
        val tree = Uri.parse(grantId)
        for (i in destinations.length() - 1 downTo 0) {
            val id = destinations.optJSONObject(i)?.optString("documentId") ?: continue
            runCatching { DocumentsContract.deleteDocument(resolver, documentUri(tree, id)) }
        }
    }

    private fun deleteOriginalMembers(bundle: JSONObject) {
        val seen = mutableSetOf<String>()
        val members = bundle.getJSONArray("members")
        for (i in 0 until members.length()) {
            val source = members.getJSONObject(i).getJSONObject("source")
            if (source.optString("kind") != "saf-document") continue
            val grantId = source.getString("grantId")
            val documentId = source.getString("documentId")
            val key = "$grantId:$documentId"
            if (!seen.add(key)) continue
            if (NativeDownloads.isGrant(grantId)) {
                runCatching { NativeDownloads.resolve(NativeDownloads.root(), documentId).delete() }
            } else {
                val tree = Uri.parse(grantId)
                runCatching { DocumentsContract.deleteDocument(resolver, documentUri(tree, documentId)) }
            }
        }
    }

    private fun ensureSafDirectory(tree: Uri, parentId: String, rawName: String): String {
        val name = safeDisplayName(rawName)
        findSafChild(tree, parentId, name, true)?.let { return it }
        val created = DocumentsContract.createDocument(resolver, documentUri(tree, parentId), DocumentsContract.Document.MIME_TYPE_DIR, name)
            ?: throw IllegalStateException("Unable to create directory $name")
        return DocumentsContract.getDocumentId(created)
    }

    private fun findSafChild(tree: Uri, parentId: String, name: String, directory: Boolean): String? {
        val uri = DocumentsContract.buildChildDocumentsUriUsingTree(tree, parentId)
        val projection = arrayOf(DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_MIME_TYPE)
        resolver.query(uri, projection, null, null, null)?.use { c ->
            while (c.moveToNext()) {
                val childName = c.getString(1)
                val isDir = c.getString(2) == DocumentsContract.Document.MIME_TYPE_DIR
                if (childName == name && isDir == directory) return c.getString(0)
            }
        }
        return null
    }

    private fun querySafSize(tree: Uri, documentId: String): Long {
        val uri = documentUri(tree, documentId)
        resolver.query(uri, arrayOf(DocumentsContract.Document.COLUMN_SIZE), null, null, null)?.use { c ->
            if (c.moveToFirst() && !c.isNull(0)) return c.getLong(0)
        }
        return -1L
    }

    private fun uniqueDirectory(parent: File, rawName: String): File {
        val base = safeDisplayName(rawName)
        var candidate = File(parent, base)
        var suffix = 2
        while (candidate.exists()) candidate = File(parent, "$base ($suffix)").also { suffix++ }
        require(candidate.mkdir()) { "Unable to create destination directory: ${candidate.name}" }
        return candidate
    }

    private fun uniqueFileName(parent: File, rawName: String): String {
        if (!File(parent, rawName).exists()) return rawName
        val dot = rawName.lastIndexOf('.')
        val stem = if (dot > 0) rawName.substring(0, dot) else rawName
        val ext = if (dot > 0) rawName.substring(dot) else ""
        var suffix = 2
        while (File(parent, "$stem ($suffix)$ext").exists()) suffix++
        return "$stem ($suffix)$ext"
    }

    private fun documentUri(tree: Uri, documentId: String): Uri = DocumentsContract.buildDocumentUriUsingTree(tree, documentId)
    private fun relativeToPrimary(primary: String, member: String): String {
        val base = primary.substringBeforeLast('/', "")
        return if (base.isNotEmpty() && member.startsWith("$base/")) member.removePrefix("$base/") else member.substringAfterLast('/')
    }
    private fun safeDisplayName(raw: String): String = raw.trim().replace(Regex("[\\/:*?\"<>|]"), "_").ifBlank { "Asset" }.take(96)
    private fun mimeFor(name: String): String = when (name.substringAfterLast('.', "").lowercase()) {
        "glb" -> "model/gltf-binary"; "gltf" -> "model/gltf+json"; "obj" -> "text/plain"; "mtl" -> "text/plain"; "png" -> "image/png"; "jpg", "jpeg" -> "image/jpeg"; "webp" -> "image/webp"; else -> "application/octet-stream"
    }
}
