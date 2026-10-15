package com.shadedlm.app

object SourcePathPolicy {
    fun clean(raw: String): String {
        val replaced = raw.replace('\\', '/').trim()
        require(!replaced.startsWith('/')) { "Absolute paths are not allowed" }
        val parts = replaced.split('/').filter { it.isNotEmpty() && it != "." }
        require(parts.isNotEmpty()) { "Empty path" }
        require(parts.none { it == ".." }) { "Parent traversal is not allowed" }
        return parts.joinToString("/")
    }
}
