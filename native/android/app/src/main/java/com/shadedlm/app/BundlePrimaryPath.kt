package com.shadedlm.app

object BundlePrimaryPath {
    fun clean(primaryMember: String): String = SourcePathPolicy.clean(primaryMember)

    fun matches(primaryMember: String, memberRelativePath: String): Boolean =
        clean(primaryMember) == SourcePathPolicy.clean(memberRelativePath)
}
