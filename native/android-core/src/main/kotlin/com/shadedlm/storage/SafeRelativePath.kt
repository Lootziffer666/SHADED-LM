package com.shadedlm.storage

object SafeRelativePath {
    private val windowsDrive = Regex("^[A-Za-z]:[\\\\/].*")
    private val uriScheme = Regex("^[A-Za-z][A-Za-z0-9+.-]*://.*")

    fun normalize(input: String): String {
        require(input.isNotBlank()) { "Path must not be blank" }
        require(!windowsDrive.matches(input)) { "Absolute Windows paths are not allowed" }
        require(!uriScheme.matches(input)) { "URI paths are not allowed" }

        var normalized = input.replace('\\', '/')
        require(!normalized.startsWith('/')) { "Absolute paths are not allowed" }

        normalized = normalized.replace(Regex("/+"), "/")
        while (normalized.startsWith("./")) {
            normalized = normalized.removePrefix("./")
        }
        normalized = normalized.trimEnd('/')
        require(normalized.isNotEmpty()) { "Path must contain a file name" }

        val segments = normalized.split('/')
        require(segments.none { it.isEmpty() || it == "." || it == ".." }) {
            "Path traversal segments are not allowed"
        }

        return segments.joinToString("/")
    }
}
