package com.shadedlm.app

import android.os.Build
import android.os.Environment
import java.io.File

object NativeDownloads {
    const val GRANT_ID = "native-downloads://primary"

    fun isGrant(grantId: String): Boolean = grantId == GRANT_ID

    fun root(): File = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)

    fun hasAccess(): Boolean = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        Environment.isExternalStorageManager()
    } else {
        root().canRead()
    }

    fun resolve(root: File, documentId: String): File {
        val relative = SourcePathPolicy.clean(documentId)
        val rootPath = root.canonicalFile.toPath()
        val target = File(root, relative).canonicalFile
        require(target.toPath().startsWith(rootPath)) { "Path escapes Downloads root" }
        return target
    }

    fun relative(root: File, file: File): String {
        val rootPath = root.canonicalFile.toPath()
        val filePath = file.canonicalFile.toPath()
        require(filePath.startsWith(rootPath)) { "Path escapes Downloads root" }
        return rootPath.relativize(filePath).toString().replace(File.separatorChar, '/')
    }
}
