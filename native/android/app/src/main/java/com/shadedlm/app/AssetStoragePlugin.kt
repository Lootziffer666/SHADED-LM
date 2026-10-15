package com.shadedlm.app

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.DocumentsContract
import android.provider.Settings
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject

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

    @PluginMethod fun chooseDownloads(call: PluginCall) {
        if (NativeDownloads.hasAccess()) { resolveDownloads(call); return }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) { call.reject("Direct Downloads access requires Android 11 or newer in this build"); return }
        val appIntent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply { data = Uri.parse("package:${context.packageName}") }
        try {
            startActivityForResult(call, appIntent, "downloadsPermissionReturned")
        } catch (_: ActivityNotFoundException) {
            try { startActivityForResult(call, Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION), "downloadsPermissionReturned") }
            catch (e: Exception) { call.reject("Unable to open Downloads access settings", e) }
        }
    }
    @ActivityCallback private fun downloadsPermissionReturned(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (!NativeDownloads.hasAccess()) { call.reject("Downloads access was not granted"); return }
        resolveDownloads(call)
    }
    private fun resolveDownloads(call: PluginCall) {
        val root = NativeDownloads.root()
        if (!root.exists()) root.mkdirs()
        if (!root.isDirectory || !root.canRead()) { call.reject("Downloads directory is unavailable"); return }
        call.resolve(JSObject().apply { put("id", NativeDownloads.GRANT_ID); put("displayName", "Downloads"); put("rootDocumentId", "Downloads") })
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
    private fun queryDisplayName(treeUri: Uri, documentId: String): String? = try { context.contentResolver.query(DocumentsContract.buildDocumentUriUsingTree(treeUri, documentId), arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) c.getString(0) else null } } catch (_: Exception) { null }
}
