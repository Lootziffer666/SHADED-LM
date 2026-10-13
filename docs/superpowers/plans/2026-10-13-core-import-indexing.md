# Core Import & Indexing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Android-local ingestion core that grants a SAF tree, recursively discovers GLB/GLTF/FBX/OBJ and ZIP content, resolves logical bundles, inspects technical metadata, generates persistent WebP thumbnails, and reopens without rereading unchanged models.

**Architecture:** A React/Vite/TypeScript web UI runs inside Capacitor. A narrow Kotlin Capacitor plugin owns Android SAF access, ZIP enumeration/materialization, verified file operations, and app-private journal files; TypeScript owns domain records, indexing, Three.js inspection, thumbnail rendering, and IndexedDB metadata. All 3D loaders consume a common materialized-bundle abstraction so loose files and ZIP entries follow the same path.

**Tech Stack:** TypeScript, React, Vite, Three.js (`GLTFLoader`, `FBXLoader`, `OBJLoader`, `MTLLoader`), Capacitor Android, Kotlin, Dexie/IndexedDB, Vitest, Testing Library, JUnit.

**Spec:** `docs/superpowers/specs/2026-10-13-mobile-3d-asset-library-design.md`

## Global Constraints

- Primary model formats: GLB, GLTF, FBX, OBJ.
- ZIP is the only V1 archive format; nested ZIP depth is capped at 3.
- New/changed assets are inspected and thumbnailed eagerly; unchanged assets reuse cached results.
- Thumbnail target is 256×256 WebP.
- Mobile processing concurrency defaults to exactly 1 asset.
- Source ZIPs and source model files are never silently modified or deleted.
- `Unsorted` is the initial destination for newly indexed assets.
- Technical properties are automatic metadata, never manual semantic tags.
- USDZ, conversion, decimation, baking, and destructive mesh editing are not V1.

## Review Focus

- A corrupt ZIP/model/texture must fail only that asset and let the queue continue.
- A revoked SAF grant must preserve cached records/thumbnails and mark sources unavailable.
- OBJ/MTL/external textures and FBX external textures must remain one logical bundle.
- A ZIP with duplicate basenames in different folders must preserve full internal paths and never cross-wire dependencies.
- Processing a large queue must dispose every Three.js object URL, geometry, material, texture, mixer, and temporary materialization before the next asset.

---

### Task 1: Application shell, domain model, and persistent metadata

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `capacitor.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/domain/library.ts`
- Create: `src/domain/categories.ts`
- Create: `src/db/libraryDb.ts`
- Create: `src/styles/tokens.css`
- Create: `src/domain/library.test.ts`
- Create: `src/db/libraryDb.test.ts`

**Interfaces:**
- Produces: `AssetRecord`, `AssetBundle`, `PackRecord`, `ThumbnailRecord`, `InspectionRecord`, `SourceRef`, `MoveJournalEntry`.
- Produces: `LibraryDb` with tables `assets`, `bundles`, `packs`, `thumbnails`, `jobs`, `settings`.
- Produces: `INITIAL_CATEGORY_TREE` where every root except `Unsorted` is non-terminal.

- [ ] **Step 1: Write failing domain tests** asserting the initial roots from the spec, `Unsorted.terminal === true`, every other root `terminal === false`, and an `AssetRecord` can serialize/deserialize `SourceRef` and inspection metadata without loss.
- [ ] **Step 2: Run `npm test -- src/domain/library.test.ts`** and verify FAIL because the domain files do not exist.
- [ ] **Step 3: Implement the domain types and category constants** in `src/domain/library.ts` and `src/domain/categories.ts`; use discriminated `SourceRef` variants for SAF document and ZIP-entry sources.
- [ ] **Step 4: Write failing DB tests** asserting schema creation and round-trip persistence of one asset, bundle, pack, thumbnail metadata record, and a resumable indexing job.
- [ ] **Step 5: Implement `LibraryDb`** in `src/db/libraryDb.ts` using Dexie and schema version `1`.
- [ ] **Step 6: Add React/Vite/Capacitor shell and Prism Spatial tokens** with bundled Manrope/Space Grotesk font packages rather than runtime Google-font dependence.
- [ ] **Step 7: Run `npm test` and `npm run build`**; expected: all tests PASS and Vite production build succeeds.
- [ ] **Step 8: Commit** `feat: scaffold local 3d asset library core`.

### Task 2: Android SAF and ZIP bridge

**Files:**
- Create: `src/native/storageGateway.ts`
- Create: `src/native/capacitorStorageGateway.ts`
- Create: `src/native/fakeStorageGateway.ts`
- Create: `src/native/storageGateway.test.ts`
- Create: `android/app/src/main/java/com/shadedlm/storage/AssetStoragePlugin.kt`
- Create: `android/app/src/main/java/com/shadedlm/storage/SafTreeWalker.kt`
- Create: `android/app/src/main/java/com/shadedlm/storage/ZipCatalog.kt`
- Create: `android/app/src/main/java/com/shadedlm/storage/MaterializationStore.kt`
- Create: `android/app/src/test/java/com/shadedlm/storage/ZipCatalogTest.kt`

**Interfaces:**
- Produces TypeScript interface `StorageGateway`:
  - `chooseTree(): Promise<TreeGrant>`
  - `validateGrant(grantId: string): Promise<GrantState>`
  - `listTreePage(grantId: string, cursor?: string): Promise<SourcePage>`
  - `listZip(source: SourceRef, maxDepth: number): Promise<ZipCatalogResult>`
  - `materialize(bundle: AssetBundle): Promise<MaterializedBundle>`
  - `releaseMaterialization(id: string): Promise<void>`
- `MaterializedBundle` exposes `id`, `primaryUrl`, `memberUrls: Record<string,string>`, and canonical relative paths.

- [ ] **Step 1: Write failing TypeScript contract tests** using `FakeStorageGateway` for persisted grant validation, paginated recursive tree listing, ZIP entry identity by full path, and explicit materialization release.
- [ ] **Step 2: Run the contract tests** and verify FAIL because the gateway does not exist.
- [ ] **Step 3: Implement TypeScript contracts and fake gateway** without Android dependencies.
- [ ] **Step 4: Write failing Kotlin ZIP tests** with fixtures containing nested folders, duplicate basenames, one nested ZIP, and malformed entries; assert full internal paths and depth cap `3`.
- [ ] **Step 5: Implement `ZipCatalog`** so archive enumeration never permanently extracts the whole ZIP; prefer seekable SAF file descriptors and fall back to streaming enumeration when random access is unavailable.
- [ ] **Step 6: Implement `SafTreeWalker` and persisted URI grants** using Android Storage Access Framework; return stable document identifiers, name, MIME, size, modified time, and directory ancestry.
- [ ] **Step 7: Implement `MaterializationStore`** in app cache/files space; materialize only requested bundle members, preserve relative paths, and delete the materialization on `releaseMaterialization`.
- [ ] **Step 8: Implement `AssetStoragePlugin`** mapping the Kotlin operations to the exact `StorageGateway` methods.
- [ ] **Step 9: Run `npm test` and `./gradlew test`**; expected: TypeScript and Kotlin tests PASS.
- [ ] **Step 10: Commit** `feat: add SAF and ZIP storage gateway`.

### Task 3: Recursive discovery, pack provenance, bundle resolution, and fingerprints

**Files:**
- Create: `src/import/discoverSources.ts`
- Create: `src/import/resolveBundle.ts`
- Create: `src/import/fingerprint.ts`
- Create: `src/import/indexSourceTree.ts`
- Create: `src/import/discoverSources.test.ts`
- Create: `src/import/resolveBundle.test.ts`
- Create: `src/import/fingerprint.test.ts`

**Interfaces:**
- Consumes: `StorageGateway`, `AssetRecord`, `AssetBundle`, `PackRecord`.
- Produces: `discoverSources(gateway, grantId): Promise<DiscoveredSource[]>`.
- Produces: `resolveBundle(source, catalog): AssetBundleCandidate`.
- Produces: `fingerprintBundle(candidate): string`.
- Produces: `indexSourceTree(gateway, db, grantId): Promise<IndexSummary>`.

- [ ] **Step 1: Write failing discovery tests** for loose GLB/GLTF/FBX/OBJ, irrelevant files, ZIP packs, nested ZIP depth 3, and depth-4 rejection as a recoverable warning.
- [ ] **Step 2: Implement `discoverSources`** preserving archive source, internal entry path, and default pack name from ZIP filename.
- [ ] **Step 3: Write failing bundle tests** for `knight.obj + knight.mtl + textures/*`, FBX with sidecar textures, standalone animation FBX, and duplicate texture names in different directories.
- [ ] **Step 4: Implement `resolveBundle`** using relative-path-first dependency resolution; never match sidecars by basename across sibling directories unless an explicit model reference resolves there.
- [ ] **Step 5: Write failing fingerprint tests** asserting unchanged metadata yields the same fingerprint, changed size/mtime/ZIP CRC changes it, and missing provider mtime triggers content-hash fallback only for the affected member.
- [ ] **Step 6: Implement bundle fingerprints** without hashing every unchanged source file on normal scans.
- [ ] **Step 7: Implement `indexSourceTree`** to upsert packs/bundles/assets into `Unsorted`, preserve existing category/tags for unchanged IDs, mark missing/revoked sources unavailable instead of deleting records, and enqueue only new/changed fingerprints.
- [ ] **Step 8: Run import tests and full `npm test`**; expected PASS.
- [ ] **Step 9: Commit** `feat: index model bundles and asset packs`.

### Task 4: Three.js loading and technical inspection

**Files:**
- Create: `src/three/loadMaterializedAsset.ts`
- Create: `src/three/disposeAsset.ts`
- Create: `src/inspect/inspectScene.ts`
- Create: `src/inspect/faceRigEvidence.ts`
- Create: `src/inspect/animationInspection.ts`
- Create: `src/inspect/inspectScene.test.ts`
- Create: `src/inspect/faceRigEvidence.test.ts`
- Create: `src/inspect/fixtures/*`

**Interfaces:**
- Consumes: `MaterializedBundle`.
- Produces: `loadMaterializedAsset(bundle): Promise<LoadedAssetSession>`.
- Produces: `inspectScene(session): InspectionRecord`.
- Produces: `disposeLoadedAsset(session): void`.

- [ ] **Step 1: Add minimal legal test fixtures** for one static GLB, one rigged/animated GLB, one morph-target face sample, one animation-only FBX, and one OBJ+MTL+texture bundle.
- [ ] **Step 2: Write failing loader tests** asserting all four primary formats load through one `LoadedAssetSession` shape and animation-only FBX remains a valid asset with zero renderable meshes.
- [ ] **Step 3: Implement loader adapters** with `GLTFLoader`, `FBXLoader`, `OBJLoader`/`MTLLoader` and a `LoadingManager` URL resolver bound to `memberUrls`.
- [ ] **Step 4: Write failing inspection tests** for mesh/skinned mesh counts, vertices, triangles, bounds, UV sets, normals/tangents, materials, texture roles/dimensions, skeletons/bones, morph targets, animation clips/durations/tracks/targets.
- [ ] **Step 5: Write face-rig evidence tests** asserting morph targets alone can yield `Face?` but not confident `Face Rig`, while facial morph naming plus jaw/eye evidence can cross the configured confidence threshold.
- [ ] **Step 6: Implement `inspectScene`, `faceRigEvidence`, and `animationInspection`**; record evidence and confidence, not unsupported quality judgments such as “ARKit compliant”.
- [ ] **Step 7: Implement explicit disposal** of mixers, actions, geometries, materials, textures, object URLs, and scene references.
- [ ] **Step 8: Run inspection tests** and verify PASS.
- [ ] **Step 9: Commit** `feat: inspect glb gltf fbx and obj assets`.

### Task 5: Eager thumbnail/index queue with resume and failure isolation

**Files:**
- Create: `src/jobs/indexQueue.ts`
- Create: `src/jobs/processAssetJob.ts`
- Create: `src/thumbnail/thumbnailRenderer.ts`
- Create: `src/thumbnail/thumbnailStore.ts`
- Create: `src/jobs/indexQueue.test.ts`
- Create: `src/thumbnail/thumbnailRenderer.test.ts`

**Interfaces:**
- Consumes: `LibraryDb`, `StorageGateway`, `loadMaterializedAsset`, `inspectScene`, `disposeLoadedAsset`.
- Produces: `IndexQueue.run(): Promise<QueueSummary>` and `IndexQueue.resume(): Promise<QueueSummary>`.
- Produces: `renderThumbnail(session, {width:256,height:256}): Promise<Blob>`.
- Produces: `ThumbnailStore.put(assetId, fingerprint, blob): Promise<ThumbnailRecord>`.

- [ ] **Step 1: Write failing queue tests** asserting strict concurrency `1`, ordered progress persistence, retryable failures, queue resume after interruption, and continuation after one corrupt model.
- [ ] **Step 2: Implement `IndexQueue`** with persisted job states `queued|materializing|inspecting|thumbnailing|done|failed` and resumable cursor semantics.
- [ ] **Step 3: Write failing thumbnail tests** asserting 256×256 WebP output, deterministic neutral studio framing for fixed bounds, and fallback card metadata when rendering fails.
- [ ] **Step 4: Implement `thumbnailRenderer`** with neutral studio camera/light, computed bounds, auto-center/fit, transparent-or-Prism-neutral background fixed by one configuration constant, and WebP encoding.
- [ ] **Step 5: Implement persistent thumbnail storage** in app-private storage with DB metadata keyed by `assetId + fingerprint`; expose a browser-loadable URL/reference.
- [ ] **Step 6: Add cleanup assertions**: after every job, `releaseMaterialization` is called exactly once and `disposeLoadedAsset` is called for every successfully created session, including error paths.
- [ ] **Step 7: Run `npm test`**; expected PASS.
- [ ] **Step 8: Commit** `feat: generate resumable persistent asset thumbnails`.

### Task 6: First-run import screen and end-to-end core smoke path

**Files:**
- Create: `src/ui/ImportScreen.tsx`
- Create: `src/ui/ImportProgress.tsx`
- Create: `src/ui/AssetGridPreview.tsx`
- Modify: `src/App.tsx`
- Create: `src/ui/ImportScreen.test.tsx`
- Create: `e2e/core-import.spec.ts`

**Interfaces:**
- Consumes: `StorageGateway`, `indexSourceTree`, `IndexQueue`, `LibraryDb`.
- Produces: a usable first-run flow: grant tree → discover → process queue → reopen cached thumbnail grid.

- [ ] **Step 1: Write failing UI tests** for grant-tree CTA, scan progress, per-asset failure that does not stop the run, completion summary, and cached-library reopen without loader calls.
- [ ] **Step 2: Implement the first-run flow** using Prism Spatial tokens; keep it intentionally minimal because full library workflows belong to Plan 2.
- [ ] **Step 3: Add an E2E fake-gateway scenario** with loose GLB, OBJ bundle, ZIP pack, corrupt file, and one unchanged second launch; assert only new/changed assets enter the second queue.
- [ ] **Step 4: Run `npm test`, `npm run build`, and the E2E smoke test**; expected PASS.
- [ ] **Step 5: Build Android debug APK** with `npx cap sync android && ./gradlew assembleDebug`; expected successful APK creation.
- [ ] **Step 6: Commit** `feat: complete local import and thumbnail indexing flow`.

## Core Plan Exit Criteria

- Android can persist a SAF tree grant and recursively inventory it.
- GLB/GLTF/FBX/OBJ and ZIP assets become stable records with pack provenance.
- OBJ/FBX dependencies move through the pipeline as bundles.
- Technical inspection and 256×256 WebP thumbnails are persisted once per fingerprint.
- Corrupt assets and lost permissions do not destroy the rest of the library.
- A second launch can display cached metadata/thumbnails without rereading unchanged models.
