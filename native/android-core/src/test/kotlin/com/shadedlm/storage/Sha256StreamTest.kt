package com.shadedlm.storage

import java.io.ByteArrayInputStream
import kotlin.test.Test
import kotlin.test.assertEquals

class Sha256StreamTest {
    @Test
    fun `hashes streams without depending on a fixed read size`() {
        val bytes = "SHADED-LM streaming hash".encodeToByteArray()

        assertEquals(
            "0972a7baff7885b877b320b7f2a676c28f45ee203f3791e468cc84afd6ffb1d1",
            Sha256Stream.hash(ByteArrayInputStream(bytes), bufferSize = 3),
        )
        assertEquals(
            Sha256Stream.hash(ByteArrayInputStream(bytes), bufferSize = 3),
            Sha256Stream.hash(ByteArrayInputStream(bytes), bufferSize = 64 * 1024),
        )
    }
}
