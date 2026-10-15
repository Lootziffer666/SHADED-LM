package com.shadedlm.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class SourcePathPolicyTest {
    @Test fun normalizesSafeRelativePaths() {
        assertEquals("models/hero.glb", SourcePathPolicy.clean("models\\hero.glb"))
        assertEquals("textures/hero.png", SourcePathPolicy.clean("./textures//hero.png"))
    }

    @Test fun rejectsEscapesAndAbsolutePaths() {
        assertThrows(IllegalArgumentException::class.java) { SourcePathPolicy.clean("../escape.glb") }
        assertThrows(IllegalArgumentException::class.java) { SourcePathPolicy.clean("/absolute.glb") }
        assertThrows(IllegalArgumentException::class.java) { SourcePathPolicy.clean("models/../../escape.glb") }
    }
}
