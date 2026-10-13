package com.shadedlm.storage

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class SafeRelativePathTest {
    @Test
    fun `normalizes separators but preserves nested asset layout`() {
        assertEquals("models/hero/textures/body.png", SafeRelativePath.normalize("models\\hero//textures/body.png"))
        assertEquals("A/model.obj", SafeRelativePath.normalize("./A/model.obj"))
    }

    @Test
    fun `rejects absolute and traversal paths`() {
        listOf(
            "/etc/passwd",
            "../outside.glb",
            "models/../../outside.glb",
            "C:\\temp\\model.fbx",
            "content://provider/document/1",
        ).forEach { unsafe ->
            assertFailsWith<IllegalArgumentException>(unsafe) {
                SafeRelativePath.normalize(unsafe)
            }
        }
    }

    @Test
    fun `rejects empty and dot-only paths`() {
        listOf("", ".", "./", "models/..", "models/.").forEach { unsafe ->
            assertFailsWith<IllegalArgumentException>(unsafe) {
                SafeRelativePath.normalize(unsafe)
            }
        }
    }
}
