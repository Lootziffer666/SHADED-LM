# Viewer, Export & Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the V1 with one-asset-at-a-time 3D inspection, animation playback, technical audit panels, export scopes, robust cleanup, and end-to-end recovery verification.

**Architecture:** The viewer opens a single `AssetSession` that materializes exactly one bundle, loads it through the common Three.js adapter, and owns every CPU/GPU resource until explicit close/switch. Inspector panels read the already-cached `InspectionRecord`; only visual overlays and animation playback touch the live session. Export streams library state/bundles through the storage gateway and never mutates the source library.

**Tech Stack:** React, TypeScript, Three.js, Capacitor/Kotlin storage gateway, Dexie/IndexedDB, Vitest, Testing Library, Playwright, JUnit.

**Spec:** `docs/superpowers/specs/2026-10-13-mobile-3d-asset-library-design.md`

**Depends on:**
- `docs/superpowers/plans/2026-10-13-core-import-indexing.md`
- `docs/superpowers/plans/2026-10-13-library-workflows.md`

## Global Constraints

- The viewer loads exactly one selected asset bundle at a time.
- Switching/closing must explicitly dispose all session-specific CPU/GPU resources and release native materialization.
- Viewer features: orbit/pan/zoom, fit/reset, neutral light, wireframe, bounding box, skeleton, materials/textures, stats, clip select, play/pause, scrub, loop, full-screen.
- Inspector text must show measured/extracted facts only; unsupported quality labels from mockups are forbidden.
- Export scopes are Index, Portable Library, and Full Backup.
- Pack relationships remain independent from physical category placement in every export.
- USDZ, model conversion, decimation, texture baking, and destructive editing remain outside V1.

## Review Focus

- Rapidly switching assets while a prior load is in flight must cancel/ignore the stale session and release its materialization.
- Animation-only FBX must open a valid inspection/playback screen even when there is no renderable mesh.
- Export of an asset with sidecars must preserve relative bundle paths and never omit referenced dependencies.
- A failed export must leave the managed library and source files unchanged and expose a retryable error.
- Repeated viewer open/close cycles must not accumulate object URLs, WebGL textures, geometries, mixers, or native temp files.

---

### Task 1: Single-owner viewer session lifecycle

**Files:**
- Create: `src/viewer/AssetSession.ts`
- Create: `src/viewer/AssetSession.test.ts`
- Create: `src/viewer/ViewerScreen.tsx`
- Create: `src/viewer/ViewerCanvas.tsx`
- Create: `src/viewer/useAssetSession.ts`
- Create: `src/viewer/ViewerScreen.test.tsx`

**Interfaces:**
- Produces: `AssetSession.open(assetId): Promise<AssetSession>`.
- Produces: `session.loaded`, `session.asset`, `session.inspection`, `session.mixer`, `session.dispose(): Promise<void>`.
- Produces hook `useAssetSession(assetId)` that enforces one live session and ignores stale async completion.

- [ ] **Step 1: Write failing lifecycle tests** for open, close, switch A→B, rejected load, and stale completion after B is already active.
- [ ] **Step 2: Implement `AssetSession`** using existing materialize/load/dispose/release interfaces; make `dispose()` idempotent.
- [ ] **Step 3: Write failing ViewerScreen tests** asserting only selected asset ID is materialized, loading/error/fallback states render correctly, and back navigation disposes before leaving.
- [ ] **Step 4: Implement ViewerScreen/Canvas** with Prism Spatial identity header and large viewport from the supplied viewer reference.
- [ ] **Step 5: Run viewer lifecycle tests**; expected PASS.
- [ ] **Step 6: Commit** `feat: add single-owner 3d viewer sessions`.

### Task 2: Camera, overlays, and neutral inspection presentation

**Files:**
- Create: `src/viewer/cameraController.ts`
- Create: `src/viewer/sceneOverlays.ts`
- Create: `src/viewer/inspectionLighting.ts`
- Create: `src/viewer/cameraController.test.ts`
- Create: `src/viewer/ViewerToolbar.tsx`
- Create: `src/viewer/ViewerToolbar.test.tsx`

**Interfaces:**
- Produces: `fitCameraToBox(camera, controls, box): CameraFit`.
- Produces overlay toggles `wireframe`, `bounds`, `skeleton`.
- Produces `applyNeutralInspectionLighting(scene): DisposableLighting`.

- [ ] **Step 1: Write failing camera tests** for tiny, human-scale, and very large bounds; assert finite camera distances and visible full bounds without format-specific constants.
- [ ] **Step 2: Implement fit/reset controller** and OrbitControls pan/zoom/orbit integration.
- [ ] **Step 3: Write failing overlay tests** asserting wireframe restores original material flags, bounds helpers are disposable, and skeleton helper only appears when a skeleton exists.
- [ ] **Step 4: Implement toolbar toggles** for wireframe, rig bones, bounding box, reset, and full-screen; hide/disable unavailable actions rather than faking state.
- [ ] **Step 5: Run tests**; expected PASS.
- [ ] **Step 6: Commit** `feat: add viewer camera and inspection overlays`.

### Task 3: Animation playback and animation-only assets

**Files:**
- Create: `src/viewer/animationController.ts`
- Create: `src/viewer/animationController.test.ts`
- Create: `src/viewer/AnimationBar.tsx`
- Create: `src/viewer/AnimationBar.test.tsx`

**Interfaces:**
- Produces: `AnimationController(session)` with `selectClip(name)`, `play()`, `pause()`, `seek(seconds)`, `setLoop(boolean)`, `update(deltaSeconds)`, `dispose()`.

- [ ] **Step 1: Write failing controller tests** for clip selection, play/pause, seek clamp, loop toggle, clip switch, and disposal.
- [ ] **Step 2: Add explicit test** that an animation-only FBX with clips and no meshes still exposes clip controls and inspection metadata; viewport may show a neutral “animation-only asset” state rather than invent geometry.
- [ ] **Step 3: Implement `AnimationController`** using Three.js `AnimationMixer` and cached clip metadata.
- [ ] **Step 4: Write failing AnimationBar tests** for dropdown, timer, scrubber, play/pause, and loop state matching the supplied mobile reference.
- [ ] **Step 5: Implement AnimationBar** and animation-frame update ownership in ViewerCanvas.
- [ ] **Step 6: Run animation tests**; expected PASS.
- [ ] **Step 7: Commit** `feat: add asset animation inspection playback`.

### Task 4: Technical inspector panels

**Files:**
- Create: `src/viewer/InspectorPanel.tsx`
- Create: `src/viewer/sections/IdentitySection.tsx`
- Create: `src/viewer/sections/GeometrySection.tsx`
- Create: `src/viewer/sections/RigSection.tsx`
- Create: `src/viewer/sections/MaterialsSection.tsx`
- Create: `src/viewer/sections/AnimationSection.tsx`
- Create: `src/viewer/InspectorPanel.test.tsx`

**Interfaces:**
- Consumes: `InspectionRecord`, `AssetRecord`, `AssetBundle`, `PackRecord` only; no new model load.

- [ ] **Step 1: Write failing inspector tests** for provenance/ZIP path, primary+bundle sizes, mesh/vertex/triangle/bounds/UV counts, material/texture dimensions, skeleton/bone evidence, face-rig evidence/confidence, and animation clip metadata.
- [ ] **Step 2: Add negative assertions** that strings `Optimal`, `ARKit Compliant`, `Valid`, and other unsupported quality judgments never render from inferred mockup copy.
- [ ] **Step 3: Implement collapsible Prism Spatial inspector sections** using progressive disclosure from the reference HTML.
- [ ] **Step 4: Add compact empty-state rows** for unavailable properties instead of misleading zeroes where “unknown” differs from `0`.
- [ ] **Step 5: Run inspector tests**; expected PASS.
- [ ] **Step 6: Commit** `feat: add measured technical asset inspector`.

### Task 5: Export model and Index export

**Files:**
- Create: `src/export/exportTypes.ts`
- Create: `src/export/buildLibraryManifest.ts`
- Create: `src/export/indexExport.ts`
- Create: `src/export/buildLibraryManifest.test.ts`
- Create: `src/export/indexExport.test.ts`
- Modify: `src/native/storageGateway.ts`

**Interfaces:**
- Produces: versioned JSON manifest `ShadedLmLibraryManifestV1`.
- Extends gateway with `createExportTarget(suggestedName)`, `writeExportFile(target, relativePath, bytesOrSource)`, `finalizeExport(target)`, `abortExport(target)`.
- Produces: `exportIndex(scope): Promise<ExportResult>`.

- [ ] **Step 1: Write failing manifest tests** asserting categories, manual tags, automatic inspection, favorites, pack provenance, bundle membership, source availability, and thumbnail mapping serialize with `schemaVersion: 1`.
- [ ] **Step 2: Implement deterministic manifest generation** ordered by stable IDs/paths for reproducible exports.
- [ ] **Step 3: Write failing Index-export tests** asserting `library.json` plus every referenced thumbnail is written and no model/source bundle is copied.
- [ ] **Step 4: Implement native export target methods** through SAF document/tree creation without mutating source trees.
- [ ] **Step 5: Implement `exportIndex`** with progress and abort cleanup.
- [ ] **Step 6: Run TS/Kotlin tests**; expected PASS.
- [ ] **Step 7: Commit** `feat: add versioned index export`.

### Task 6: Portable library and Full Backup export

**Files:**
- Create: `src/export/portableExport.ts`
- Create: `src/export/fullBackupExport.ts`
- Create: `src/export/portableExport.test.ts`
- Create: `src/ui/export/ExportSheet.tsx`
- Create: `src/ui/export/ExportSheet.test.tsx`

**Interfaces:**
- Produces: `exportPortableLibrary(assetIds?, target): Promise<ExportResult>`.
- Produces: `exportFullBackup(target): Promise<ExportResult>`.

- [ ] **Step 1: Write failing portable-export tests** for loose GLB, OBJ+MTL+textures, FBX+sidecars, and an asset originally from ZIP; assert each exported bundle preserves dependency-relative paths and pack provenance in manifest.
- [ ] **Step 2: Implement portable export** from current managed/source bundle references without silently extracting unrelated ZIP contents.
- [ ] **Step 3: Write failing full-backup tests** asserting categories, tags, favorites, packs, operational restore metadata, thumbnails, and all selected asset bundles are included.
- [ ] **Step 4: Implement Full Backup export** with a top-level versioned manifest and explicit incomplete-export marker removed only by `finalizeExport`.
- [ ] **Step 5: Write failing ExportSheet tests** for Index / Portable / Full choices, selected-assets scope where applicable, progress, cancel, success, and retryable failure.
- [ ] **Step 6: Implement ExportSheet** and connect the SelectionDock Export action plus global export entry.
- [ ] **Step 7: Run export tests**; expected PASS.
- [ ] **Step 8: Commit** `feat: add portable library and full backup exports`.

### Task 7: Recovery dashboard and failure visibility

**Files:**
- Create: `src/recovery/recoveryService.ts`
- Create: `src/recovery/recoveryService.test.ts`
- Create: `src/ui/recovery/RecoverySheet.tsx`
- Create: `src/ui/recovery/RecoverySheet.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `checkRecoveryState(): Promise<RecoveryState>` aggregating failed/resumable index jobs, failed thumbnails, move journals, unavailable SAF grants, and incomplete exports.

- [ ] **Step 1: Write failing recovery tests** for each resumable/failure type and an all-clear state.
- [ ] **Step 2: Implement recovery aggregation** without deleting any cached asset record as a side effect.
- [ ] **Step 3: Write failing RecoverySheet tests** for retry scan/thumbnail, resume move, re-grant source tree, abandon incomplete export, and dismiss non-blocking asset error.
- [ ] **Step 4: Implement the recovery UI** as one concise operational surface rather than modal spam during library browsing.
- [ ] **Step 5: Run tests**; expected PASS.
- [ ] **Step 6: Commit** `feat: add resumable recovery surface`.

### Task 8: Full V1 mobile acceptance and leak regression

**Files:**
- Create: `e2e/v1-acceptance.spec.ts`
- Create: `e2e/viewer-lifecycle.spec.ts`
- Create: `android/app/src/androidTest/java/com/shadedlm/storage/SafAcceptanceTest.kt`
- Modify: `README.md`

**Interfaces:**
- Exercises only public UI/native interfaces and the V1 acceptance flow from the spec.

- [ ] **Step 1: Implement E2E acceptance scenario** covering grant → recursive discover → ZIP inspect → eager thumbnails → reopen cache → badges → viewer/animation → tag flow → cascading move → pack preservation → bundle move → Index export → Portable export.
- [ ] **Step 2: Add interruption scenario** at indexing and move phases; relaunch and assert safe resume.
- [ ] **Step 3: Add viewer lifecycle regression** opening/switching/closing at least 50 fixture sessions; assert active session/materialization/object-URL counters return to baseline after every close.
- [ ] **Step 4: Add Android SAF instrumentation smoke test** using test documents/provider where available for persisted grant, recursive listing, verified move, and export file creation.
- [ ] **Step 5: Document local build/run/import/export workflow** in `README.md`, including Android restrictions around SAF roots and the fact that V1 is local-only.
- [ ] **Step 6: Run `npm test`, `npm run build`, Playwright E2E, `./gradlew test`, instrumentation tests where emulator/device is available, and `assembleDebug`**; record any environment-skipped instrumentation separately from product test failures.
- [ ] **Step 7: Commit** `test: verify complete mobile asset library v1`.

## Viewer / Export Plan Exit Criteria

- Exactly one asset bundle is loaded at a time and is fully disposed on close/switch.
- Static, rigged, animated, face-rigged, textured, and animation-only assets are inspectable without fake quality claims.
- Animation playback and required viewer controls work on mobile.
- Index, Portable Library, and Full Backup exports preserve the required relationships and bundle dependencies.
- Interrupted indexing/moves and revoked source access are visible and recoverable.
- The complete V1 acceptance flow is automated and a debug Android build succeeds.
