package com.shadedlm.storage

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.util.zip.CRC32
import java.util.zip.ZipInputStream

enum class ZipEntryKind {
    FILE,
    DIRECTORY,
}

data class ZipCatalogEntry(
    val path: String,
    val kind: ZipEntryKind,
    val size: Long,
    val crc32: Long?,
    val archiveDepth: Int,
)

data class ZipCatalogResult(
    val entries: List<ZipCatalogEntry>,
    val warnings: List<String>,
)

object ZipCatalogReader {
    private const val DEFAULT_MAX_NESTED_ARCHIVE_BYTES = 128L * 1024L * 1024L

    fun read(
        input: InputStream,
        maxDepth: Int,
        maxNestedArchiveBytes: Long = DEFAULT_MAX_NESTED_ARCHIVE_BYTES,
    ): ZipCatalogResult {
        require(maxDepth >= 1) { "maxDepth must be at least 1" }
        require(maxNestedArchiveBytes > 0) { "maxNestedArchiveBytes must be positive" }

        val entries = mutableListOf<ZipCatalogEntry>()
        val warnings = mutableListOf<String>()
        readLevel(
            input = input,
            archiveDepth = 1,
            prefix = "",
            maxDepth = maxDepth,
            maxNestedArchiveBytes = maxNestedArchiveBytes,
            entries = entries,
            warnings = warnings,
        )
        return ZipCatalogResult(entries = entries, warnings = warnings)
    }

    private fun readLevel(
        input: InputStream,
        archiveDepth: Int,
        prefix: String,
        maxDepth: Int,
        maxNestedArchiveBytes: Long,
        entries: MutableList<ZipCatalogEntry>,
        warnings: MutableList<String>,
    ) {
        ZipInputStream(input.buffered()).use { zip ->
            while (true) {
                val entry = zip.nextEntry ?: break
                val normalizedName = entry.name.replace('\\', '/').removePrefix("/")
                val fullPath = "$prefix$normalizedName"

                if (entry.isDirectory) {
                    entries += ZipCatalogEntry(
                        path = fullPath,
                        kind = ZipEntryKind.DIRECTORY,
                        size = 0,
                        crc32 = null,
                        archiveDepth = archiveDepth,
                    )
                    zip.closeEntry()
                    continue
                }

                if (normalizedName.endsWith(".zip", ignoreCase = true)) {
                    if (archiveDepth >= maxDepth) {
                        drainEntry(zip)
                        warnings += "ZIP depth limit $maxDepth reached at $fullPath"
                    } else {
                        val nestedBytes = readNestedArchiveEntry(
                            zip = zip,
                            maxBytes = maxNestedArchiveBytes,
                            path = fullPath,
                            warnings = warnings,
                        )
                        if (nestedBytes != null) {
                            readLevel(
                                input = ByteArrayInputStream(nestedBytes),
                                archiveDepth = archiveDepth + 1,
                                prefix = "$fullPath!/",
                                maxDepth = maxDepth,
                                maxNestedArchiveBytes = maxNestedArchiveBytes,
                                entries = entries,
                                warnings = warnings,
                            )
                        }
                    }
                    zip.closeEntry()
                    continue
                }

                val measured = measureEntry(zip)
                val declaredSize = entry.size.takeIf { it >= 0 }
                val declaredCrc = entry.crc.takeIf { it >= 0 }
                entries += ZipCatalogEntry(
                    path = fullPath,
                    kind = ZipEntryKind.FILE,
                    size = declaredSize ?: measured.size,
                    crc32 = declaredCrc ?: measured.crc32,
                    archiveDepth = archiveDepth,
                )
                zip.closeEntry()
            }
        }
    }

    private data class MeasuredEntry(val size: Long, val crc32: Long)

    private fun measureEntry(zip: ZipInputStream): MeasuredEntry {
        val crc = CRC32()
        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
        var size = 0L
        while (true) {
            val read = zip.read(buffer)
            if (read < 0) break
            if (read == 0) continue
            crc.update(buffer, 0, read)
            size += read
        }
        return MeasuredEntry(size = size, crc32 = crc.value)
    }

    private fun drainEntry(zip: ZipInputStream) {
        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
        while (zip.read(buffer) >= 0) {
            // Consume the current entry without retaining its contents.
        }
    }

    private fun readNestedArchiveEntry(
        zip: ZipInputStream,
        maxBytes: Long,
        path: String,
        warnings: MutableList<String>,
    ): ByteArray? {
        val out = ByteArrayOutputStream()
        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
        var size = 0L
        while (true) {
            val read = zip.read(buffer)
            if (read < 0) break
            if (read == 0) continue
            size += read
            if (size > maxBytes) {
                drainEntry(zip)
                warnings += "Nested ZIP exceeds ${maxBytes} bytes and was skipped at $path"
                return null
            }
            out.write(buffer, 0, read)
        }
        return out.toByteArray()
    }
}
