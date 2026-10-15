package com.shadedlm.app

import org.junit.Assert.assertEquals
import org.junit.Test

class BundlePrimaryPathTest {
    @Test fun primaryMemberIsAStringPathNotAnObject() {
        assertEquals(
            "StylooChickenEscapeAssetPack/FBX/fence/fenceh.fbx",
            BundlePrimaryPath.clean("StylooChickenEscapeAssetPack/FBX/fence/fenceh.fbx")
        )
    }

    @Test fun matchesThePrimaryMemberByRelativePath() {
        val primary = "FBX/fence/fenceh.fbx"
        assertEquals(true, BundlePrimaryPath.matches(primary, "FBX/fence/fenceh.fbx"))
        assertEquals(false, BundlePrimaryPath.matches(primary, "FBX/fence/fenceh_D.png"))
    }
}
