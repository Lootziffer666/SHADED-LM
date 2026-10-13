package com.shadedlm.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

class MoveJournal(context: Context) {
    private val dir = File(context.filesDir, "move-journal").apply { mkdirs() }

    fun write(id: String, phase: String, request: JSONObject, destinations: JSONArray = JSONArray(), error: String? = null) {
        val record = JSONObject().apply {
            put("id", id)
            put("phase", phase)
            put("request", JSONObject(request.toString()))
            put("destinations", JSONArray(destinations.toString()))
            put("updatedAt", System.currentTimeMillis())
            if (error != null) put("error", error)
        }
        val target = file(id)
        val tmp = File(dir, target.name + ".tmp")
        FileOutputStream(tmp).use { out ->
            out.write(record.toString().toByteArray(Charsets.UTF_8))
            out.fd.sync()
        }
        if (target.exists() && !target.delete()) throw IllegalStateException("Unable to replace move journal")
        if (!tmp.renameTo(target)) throw IllegalStateException("Unable to commit move journal")
    }

    fun read(id: String): JSONObject? = file(id).takeIf { it.isFile }?.let { JSONObject(it.readText()) }
    fun pending(): List<JSONObject> = dir.listFiles { file -> file.extension == "json" }?.mapNotNull { runCatching { JSONObject(it.readText()) }.getOrNull() }?.filter { it.optString("phase") != "committed" } ?: emptyList()
    fun complete(id: String) { file(id).delete() }
    private fun file(id: String): File = File(dir, SourcePathPolicy.clean(id.replace(':', '_')) + ".json")
}
