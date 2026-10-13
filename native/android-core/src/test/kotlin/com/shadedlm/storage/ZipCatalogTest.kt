package com.shadedlm.storage

import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ZipCatalogTest {
    @Test
    fun `preserves full entry paths for duplicate basenames`() {
        val bytes = zipOf(
            "A/textures/diffuse.png" to byteArrayOf(1, 2, 3),
            "B/textures/diffuse.png" to byteArrayOf(4, 5),
            "models/hero.glb" to byteArrayOf(6),
        )

        val result = ZipCatalogReader.read(bytes.inputStream(), maxDepth = 3)

        assertEquals(
            listOf("A/textures/diffuse.png", "B/textures/diffuse.png", "models/hero.glb"),
            result.entries.map { it.path },
        )
        assertEquals(listOf(1, 1, 1), result.entries.map { it.archiveDepth })
        assertTrue(result.warnings.isEmpty())
    }

    @Test
    fun `recurses nested zip entries but never expands beyond depth three`() {
        val level4 = zipOf("too-deep.glb" to byteArrayOf(9))
        val level3 = zipOf(
            "depth3.glb" to byteArrayOf(8),
            "level4.zip" to level4,
        )
        val level2 = zipOf(
            "depth2.fbx" to byteArrayOf(7),
            "level3.zip" to level3,
        )
        val root = zipOf(
            "root.obj" to byteArrayOf(6),
            "level2.zip" to level2,
        )

        val result = ZipCatalogReader.read(root.inputStream(), maxDepth = 3)
        val paths = result.entries.map { it.path }

        assertTrue(paths.contains("root.obj"))
        assertTrue(paths.contains("level2.zip!/depth2.fbx"))
        assertTrue(paths.contains("level2.zip!/level3.zip!/depth3.glb"))
        assertFalse(paths.any { it.endsWith("too-deep.glb") })
        assertTrue(result.entries.all { it.archiveDepth <= 3 })
        assertTrue(result.warnings.any { it.contains("depth limit", ignoreCase = true) })
    }

    private fun zipOf(vararg entries: Pair<String, ByteArray>): ByteArray {
        val out = ByteArrayOutputStream()
        ZipOutputStream(out).use { zip ->
            for ((name, data) in entries) {
                zip.putNextEntry(ZipEntry(name))
                zip.write(data)
                zip.closeEntry()
            }
        }
        return out.toByteArray()
    }
}
