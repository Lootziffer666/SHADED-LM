package com.shadedlm.storage

import java.io.ByteArrayInputStream
import kotlin.test.Test
import kotlin.test.assertEquals

class Sha256StreamTest {
    @Test
    fun `hashes streams without depending on a fixed read size`() {
        val bytes = "SHADED-LM streaming hash".encodeToByteArray()

        assertEquals(
            "60a62fd2aa5ab79ebba99c5c527741049949387a797593a1bc10e4e924ed55be",
            Sha256Stream.hash(ByteArrayInputStream(bytes), bufferSize = 3),
        )
        assertEquals(
            Sha256Stream.hash(ByteArrayInputStream(bytes), bufferSize = 3),
            Sha256Stream.hash(ByteArrayInputStream(bytes), bufferSize = 64 * 1024),
        )
    }
}
