package com.shadedlm.app

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import androidx.activity.result.ActivityResult
import androidx.core.content.FileProvider
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject
import java.io.File
import java.util.ArrayList

@CapacitorPlugin(name = "AssetStorage")
class AssetStoragePlugin : Plugin() {
    private lateinit var walker: SafTreeWalker
    private lateinit var materializations: MaterializationStore
    private lateinit var zipCatalog: ZipCatalog
    private lateinit var moveJournal: MoveJournal
    private lateinit var bundleMover: BundleMover
    private lateinit var exportStore: ExportStore

    override fun load() {
        walker = SafTreeWalker(context.contentResolver)
        materializations = MaterializationStore(context)
        zipCatalog = ZipCatalog(materializations, context.cacheDir)
        moveJournal = MoveJournal(context)
        bundleMover = BundleMover(context, materializations, moveJournal)
        exportStore = ExportStore(context, materializations)
    }

    @PluginMethod fun chooseTree(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply { addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or Intent.FLAG_GRANT_PREFIX_URI_PERMISSION) }
        startActivityForResult(call, intent, "treePicked")
    }

    @ActivityCallback private fun treePicked(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (result.resultCode != Activity.RESULT_OK || result.data?.data == null) { call.reject("Folder selection cancelled"); return }
        val data = result.data!!; val uri = data.data!!; val flags = data.flags and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        try { context.contentResolver.takePersistableUriPermission(uri, flags) } catch (e: Exception) { call.reject("Unable to persist folder permission", e); return }
        val rootId = DocumentsContract.getTreeDocumentId(uri); val displayName = queryDisplayName(uri, rootId) ?: uri.lastPathSegment ?: "Assets"
        call.resolve(JSObject().apply { put("id", uri.toString()); put("uri", uri.toString()); put("displayName", displayName); put("rootDocumentId", rootId) })
    }

    @PluginMethod fun chooseFiles(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            type = "*/*"
            addCategory(Intent.CATEGORY_OPENABLE)
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
        }
        startActivityForResult(call, intent, "filesPicked")
    }

    @ActivityCallback private fun filesPicked(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (result.resultCode != Activity.RESULT_OK || result.data == null) { call.resolve(JSObject().apply { put("entries", JSArray()) }); return }
        val data = result.data!!
        val uris = LinkedHashSet<Uri>()
        data.data?.let(uris::add)
        data.clipData?.let { clip -> for (i in 0 until clip.itemCount) clip.getItemAt(i).uri?.let(uris::add) }
        val entries = JSArray()
        for (uri in uris) {
            try { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) } catch (_: Exception) {}
            entries.put(sourceEntry(uri))
        }
        call.resolve(JSObject().apply { put("entries", entries) })
    }

    @PluginMethod fun shareBundle(call: PluginCall) {
        val bundle = call.getObject("bundle") ?: return call.reject("bundle is required")
        bridge.execute {
            try {
                val materialized = JSONObject(materializations.materialize(JSONObject(bundle.toString())).toString())
                val urls = materialized.getJSONObject("memberUrls")
                val uris = ArrayList<Uri>()
                val names = mutableListOf<String>()
                val keys = urls.keys()
                while (keys.hasNext()) {
                    val name = keys.next()
                    names.add(name)
                    uris.add(contentUri(urls.getString(name)))
                }
                require(uris.isNotEmpty()) { "Bundle has no shareable files" }
                activity.runOnUiThread {
                    try {
                        val intent = if (uris.size == 1) {
                            Intent(Intent.ACTION_SEND).apply {
                                type = mimeType(names.first())
                                putExtra(Intent.EXTRA_STREAM, uris.first())
                            }
                        } else {
                            Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                                type = "*/*"
                                putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                            }
                        }
                        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        intent.clipData = ClipData.newUri(context.contentResolver, "SHADED LM", uris.first()).also { clip -> uris.drop(1).forEach { clip.addItem(ClipData.Item(it)) } }
                        activity.startActivity(Intent.createChooser(intent, "Teilen mit"))
                        call.resolve(JSObject())
                    } catch (e: Exception) { call.reject(e.message ?: "Unable to share asset", e) }
                }
            } catch (e: Exception) { call.reject(e.message ?: "Unable to share asset", e) }
        }
    }

    @PluginMethod fun openBundle(call: PluginCall) {
        val bundle = call.getObject("bundle") ?: return call.reject("bundle is required")
        bridge.execute {
            try {
                val materialized = JSONObject(materializations.materialize(JSONObject(bundle.toString())).toString())
                val primaryUrl = materialized.getString("primaryUrl")
                val primaryName = JSONObject(bundle.toString()).getString("primaryMember")
                val uri = contentUri(primaryUrl)
                activity.runOnUiThread {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(uri, mimeType(primaryName))
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            clipData = ClipData.newUri(context.contentResolver, "SHADED LM", uri)
                        }
                        activity.startActivity(Intent.createChooser(intent, "Öffnen mit"))
                        call.resolve(JSObject())
                    } catch (e: Exception) { call.reject(e.message ?: "Unable to open asset", e) }
                }
            } catch (e: Exception) { call.reject(e.message ?: "Unable to open asset", e) }
        }
    }

    @PluginMethod fun createExportTarget(call: PluginCall) {
        val name = call.getString("suggestedName") ?: "SHADED-LM-export.zip"
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply { type = "application/zip"; putExtra(Intent.EXTRA_TITLE, name); addCategory(Intent.CATEGORY_OPENABLE) }
        startActivityForResult(call, intent, "exportPicked")
    }

    @ActivityCallback private fun exportPicked(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val uri = result.data?.data
        if (result.resultCode != Activity.RESULT_OK || uri == null) { call.reject("Export destination cancelled"); return }
        try { call.resolve(exportStore.start(uri, call.getString("suggestedName") ?: "SHADED-LM-export.zip")) } catch (e: Exception) { call.reject(e.message ?: "Unable to create export", e) }
    }

    @PluginMethod fun validateGrant(call: PluginCall) { val grantId = call.getString("grantId") ?: return call.reject("grantId is required"); call.resolve(JSObject().apply { put("state", walker.validate(grantId)) }) }
    @PluginMethod fun listTreePage(call: PluginCall) { val grantId = call.getString("grantId") ?: return call.reject("grantId is required"); execute(call) { walker.listPage(grantId, call.getString("cursor")) } }
    @PluginMethod fun listZip(call: PluginCall) { val source = call.getObject("source") ?: return call.reject("source is required"); val maxDepth = call.getInt("maxDepth", 3) ?: 3; execute(call) { zipCatalog.catalog(JSONObject(source.toString()), maxDepth) } }
    @PluginMethod fun materialize(call: PluginCall) { val bundle = call.getObject("bundle") ?: return call.reject("bundle is required"); execute(call) { materializations.materialize(JSONObject(bundle.toString())) } }
    @PluginMethod fun releaseMaterialization(call: PluginCall) { val id = call.getString("id") ?: return call.reject("id is required"); execute(call) { materializations.release(id); JSObject() } }
    @PluginMethod fun moveBundle(call: PluginCall) { val request = call.getObject("request") ?: return call.reject("request is required"); execute(call) { bundleMover.move(JSONObject(request.toString())) } }
    @PluginMethod fun recoverMoves(call: PluginCall) { execute(call) { bundleMover.recoverAll() } }
    @PluginMethod fun writeExportFile(call: PluginCall) { val targetId=call.getString("targetId")?:return call.reject("targetId is required");val path=call.getString("path")?:return call.reject("path is required");val write=call.getObject("write")?:return call.reject("write is required");execute(call){exportStore.write(targetId,path,JSONObject(write.toString()));JSObject()} }
    @PluginMethod fun finalizeExport(call: PluginCall) { val targetId=call.getString("targetId")?:return call.reject("targetId is required");execute(call){exportStore.finish(targetId)} }
    @PluginMethod fun abortExport(call: PluginCall) { val targetId=call.getString("targetId")?:return call.reject("targetId is required");execute(call){exportStore.abort(targetId);JSObject()} }

    private fun execute(call: PluginCall, work: () -> JSObject) { bridge.execute { try { call.resolve(work()) } catch (e: Exception) { call.reject(e.message ?: "Native storage operation failed", e) } } }

    private fun sourceEntry(uri: Uri): JSObject {
        var name = uri.lastPathSegment ?: "asset"
        var size = 0L
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { c ->
            if (c.moveToFirst()) {
                val nameIx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                val sizeIx = c.getColumnIndex(OpenableColumns.SIZE)
                if (nameIx >= 0 && !c.isNull(nameIx)) name = c.getString(nameIx)
                if (sizeIx >= 0 && !c.isNull(sizeIx)) size = c.getLong(sizeIx)
            }
        }
        val documentId = try { DocumentsContract.getDocumentId(uri) } catch (_: Exception) { uri.lastPathSegment ?: name }
        val source = JSObject().apply {
            put("kind", "saf-document")
            put("grantId", uri.toString())
            put("documentId", documentId)
            put("name", name)
            put("size", size)
        }
        return JSObject().apply {
            put("source", source)
            put("name", name)
            put("relativePath", name)
            put("mime", context.contentResolver.getType(uri) ?: mimeType(name))
            put("size", size)
            put("directory", false)
        }
    }

    private fun contentUri(fileUrl: String): Uri {
        val fileUri = Uri.parse(fileUrl)
        val path = requireNotNull(fileUri.path) { "Materialized file path missing" }
        return FileProvider.getUriForFile(context, "${context.packageName}.files", File(path))
    }

    private fun mimeType(name: String): String {
        val ext = name.substringAfterLast('.', "").lowercase()
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: "application/octet-stream"
    }

    private fun queryDisplayName(treeUri: Uri, documentId: String): String? = try { context.contentResolver.query(DocumentsContract.buildDocumentUriUsingTree(treeUri, documentId), arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) c.getString(0) else null } } catch (_: Exception) { null }
}
