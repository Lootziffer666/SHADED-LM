package com.shadedlm.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
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

    override fun load() {
        walker = SafTreeWalker(context.contentResolver)
        materializations = MaterializationStore(context)
        zipCatalog = ZipCatalog(materializations, context.cacheDir)
    }

    @PluginMethod
    fun chooseTree(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)
        }
        startActivityForResult(call, intent, "treePicked")
    }

    @ActivityCallback
    private fun treePicked(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (result.resultCode != Activity.RESULT_OK || result.data?.data == null) {
            call.reject("Folder selection cancelled")
            return
        }
        val data = result.data!!
        val uri = data.data!!
        val flags = data.flags and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        try { context.contentResolver.takePersistableUriPermission(uri, flags) } catch (e: Exception) {
            call.reject("Unable to persist folder permission", e); return
        }
        val rootId = DocumentsContract.getTreeDocumentId(uri)
        val displayName = queryDisplayName(uri, rootId) ?: uri.lastPathSegment ?: "Assets"
        call.resolve(JSObject().apply {
            put("id", uri.toString())
            put("uri", uri.toString())
            put("displayName", displayName)
            put("rootDocumentId", rootId)
        })
    }

    @PluginMethod
    fun validateGrant(call: PluginCall) {
        val grantId = call.getString("grantId") ?: return call.reject("grantId is required")
        call.resolve(JSObject().apply { put("state", walker.validate(grantId)) })
    }

    @PluginMethod
    fun listTreePage(call: PluginCall) {
        val grantId = call.getString("grantId") ?: return call.reject("grantId is required")
        val cursor = call.getString("cursor")
        execute(call) { walker.listPage(grantId, cursor) }
    }

    @PluginMethod
    fun listZip(call: PluginCall) {
        val source = call.getObject("source") ?: return call.reject("source is required")
        val maxDepth = call.getInt("maxDepth", 3) ?: 3
        execute(call) { zipCatalog.catalog(JSONObject(source.toString()), maxDepth) }
    }

    @PluginMethod
    fun materialize(call: PluginCall) {
        val bundle = call.getObject("bundle") ?: return call.reject("bundle is required")
        execute(call) { materializations.materialize(JSONObject(bundle.toString())) }
    }

    @PluginMethod
    fun releaseMaterialization(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("id is required")
        execute(call) {
            materializations.release(id)
            JSObject()
        }
    }

    private fun execute(call: PluginCall, work: () -> JSObject) {
        bridge.execute {
            try { call.resolve(work()) } catch (e: Exception) { call.reject(e.message ?: "Native storage operation failed", e) }
        }
    }

    private fun queryDisplayName(treeUri: Uri, documentId: String): String? = try {
        context.contentResolver.query(
            DocumentsContract.buildDocumentUriUsingTree(treeUri, documentId),
            arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME), null, null, null
        )?.use { c -> if (c.moveToFirst()) c.getString(0) else null }
    } catch (_: Exception) { null }
}
