package com.shadedlm.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.file.Files

class NativeDownloadsTest {
    @Test fun recognizesOnlyTheNativeDownloadsGrant() {
        assertTrue(NativeDownloads.isGrant("native-downloads://primary"))
        assertFalse(NativeDownloads.isGrant("content://com.android.providers.downloads.documents/tree/downloads"))
    }

    @Test fun resolvesOnlyPathsInsideDownloadsRoot() {
        val root = File("/storage/emulated/0/Download")
        assertEquals(File(root, "models/hero.glb").path, NativeDownloads.resolve(root, "models/hero.glb").path)
        assertThrows(IllegalArgumentException::class.java) { NativeDownloads.resolve(root, "../escape.glb") }
        assertThrows(IllegalArgumentException::class.java) { NativeDownloads.resolve(root, "/absolute.glb") }
    }

    @Test fun createsCategoryDestinationsInsideDownloadsRoot() {
        val root = Files.createTempDirectory("downloads-root").toFile()
        val destination = NativeDownloads.ensureDirectory(root, listOf("Characters", "Humans", "Women"))
        assertTrue(destination.isDirectory)
        assertEquals(File(root, "Characters/Humans/Women").canonicalPath, destination.canonicalPath)
        assertThrows(IllegalArgumentException::class.java) { NativeDownloads.ensureDirectory(root, listOf("Characters", "..", "escape")) }
        root.deleteRecursively()
    }
}
