# Library Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the indexed asset database into the Prism Spatial mobile library: cached-thumbnail browsing, technical filters, user tagging, editable cascading categories, asset-pack browsing, favorites, search, and verified bundle moves.

**Architecture:** React screens read only metadata and persisted thumbnails during normal browsing. Manual semantics live in dedicated tag/category services while automatic technical facts remain immutable inspection fields. Physical moves are routed through the native storage gateway as journaled bundle operations; the UI updates the logical record only after native verification succeeds.

**Tech Stack:** React, TypeScript, Dexie/IndexedDB, Capacitor storage gateway from Core Plan, Testing Library, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-13-mobile-3d-asset-library-design.md`

**Depends on:** `docs/superpowers/plans/2026-10-13-core-import-indexing.md`

## Global Constraints

- Normal browsing loads metadata plus persisted thumbnails only; it never loads source 3D assets.
- No asset may be classified directly into a managed root except `Unsorted`.
- `Characters/Humans/{Men,Women,Boys,Girls,Babies,Elderly,Groups}` is provided initially; non-human character groups are user/lore-defined.
- Manual tags are user-owned; `rigged`, `animated`, `faceRig`, `textured`, counts, and sizes are automatic properties and cannot become manual tags by accident.
- Tag mode is explicitly: toggle ON → select → edit → confirm → selection cleared → toggle OFF automatically.
- Asset-pack membership is virtual provenance and survives moves across categories.
- Every physical move is bundle-aware, explicit, journaled, and source deletion follows verified destination write only.

## Review Focus

- Mixed-state multi-selection tags must not erase a tag that exists on only some selected assets unless the user explicitly removes it.
- Moving an asset with OBJ/MTL/textures or FBX sidecars must move/copy the whole bundle atomically from the user’s perspective.
- A move interrupted after copy but before source deletion must resume safely without duplicate logical records.
- A user-created non-human `Characters` branch must be selectable immediately and persist across restarts.
- Search/filtering across thousands of assets must not trigger model loads or lose pack/category/tag intersections.

---

### Task 1: Query model and thumbnail-only library data source

**Files:**
- Create: `src/library/libraryQuery.ts`
- Create: `src/library/libraryQuery.test.ts`
- Create: `src/library/useLibraryQuery.ts`
- Create: `src/ui/library/LibraryScreen.tsx`
- Create: `src/ui/library/AssetCard.tsx`
- Create: `src/ui/library/FilterStrip.tsx`
- Create: `src/ui/library/LibraryScreen.test.tsx`

**Interfaces:**
- Produces: `LibraryFilters` with `query`, `categoryPath`, `packId`, `tags`, `formats`, `animated`, `rigged`, `faceRig`, `textured`, `boneRange`, `animationRange`, `triangleRange`, `sizeRange`, `favoritesOnly`, `recentOnly`, `unsortedOnly`.
- Produces: `queryLibrary(db, filters, sort): Promise<LibraryCardRecord[]>`.
- `LibraryCardRecord` contains only cached metadata and thumbnail reference, never a model URL.

- [ ] **Step 1: Write failing query tests** for each automatic filter plus intersections of category + pack + manual tag + technical property.
- [ ] **Step 2: Add a guard test** that a library query result has no `primaryUrl`, materialization ID, or loaded Three.js session.
- [ ] **Step 3: Implement `queryLibrary`** with indexed DB fields where practical and in-memory refinement only after a bounded candidate query.
- [ ] **Step 4: Write failing LibraryScreen tests** for two-column default, one-column toggle, horizontal filter strip, persisted thumbnail rendering, format/size chip, title, pack provenance, and technical badges.
- [ ] **Step 5: Implement the Prism Spatial library screen** using the supplied mockup as the visual reference and CSS tokens rather than copying unsupported mock labels.
- [ ] **Step 6: Run query/UI tests**; expected PASS.
- [ ] **Step 7: Commit** `feat: add thumbnail-only searchable asset library`.

### Task 2: Editable category tree and cascading destination picker

**Files:**
- Create: `src/categories/categoryService.ts`
- Create: `src/categories/categoryService.test.ts`
- Create: `src/ui/categories/CascadePicker.tsx`
- Create: `src/ui/categories/EditCategorySheet.tsx`
- Create: `src/ui/categories/CascadePicker.test.tsx`

**Interfaces:**
- Produces: `CategoryNode { id, name, parentId, path, terminal, systemRoot, sortOrder }`.
- Produces: `createCategory(parentId, name): Promise<CategoryNode>`.
- Produces: `renameCategory(id, name): Promise<void>`.
- Produces: `canConfirmDestination(node): boolean`.

- [ ] **Step 1: Write failing service tests** asserting roots except `Unsorted` cannot be terminal destinations, children can be terminal, and user-created descendants under `Characters` persist without hard-coded species names.
- [ ] **Step 2: Implement persisted editable category nodes** while protecting root identities from accidental deletion/renaming in V1.
- [ ] **Step 3: Write failing picker tests** for `Characters → Humans → Men → Confirm`, rejection of `Characters → Confirm`, direct `Unsorted → Confirm`, and creation/select of a new lore branch.
- [ ] **Step 4: Implement `CascadePicker`** as sequential child selection with a clear breadcrumb/back path and disabled Confirm until `canConfirmDestination` is true.
- [ ] **Step 5: Run category tests**; expected PASS.
- [ ] **Step 6: Commit** `feat: add editable cascading category picker`.

### Task 3: Explicit tag mode and tri-state bulk editing

**Files:**
- Create: `src/tags/tagService.ts`
- Create: `src/tags/tagService.test.ts`
- Create: `src/ui/tags/TagModeToggle.tsx`
- Create: `src/ui/tags/TagEditorSheet.tsx`
- Create: `src/ui/tags/TagFlow.test.tsx`

**Interfaces:**
- Produces: `getTagState(assetIds, tag): 'all' | 'mixed' | 'none'`.
- Produces: `applyTagPatch(assetIds, patch: {add:string[]; remove:string[]}): Promise<void>`.
- Produces UI state machine `TagModeState = off | selecting | editing | saving`.

- [ ] **Step 1: Write failing tri-state tests** for all/mixed/none across multiple assets and explicit add/remove semantics.
- [ ] **Step 2: Implement `tagService`** so technical properties are excluded from the manual tag namespace.
- [ ] **Step 3: Write the complete failing interaction test**: toggle ON → select two assets → open editor → mixed tag remains unchanged unless touched → add a tag → confirm → DB updates → selection becomes empty → toggle becomes OFF.
- [ ] **Step 4: Implement TagModeToggle and TagEditorSheet** with the exact workflow; normal browsing cards do not show selection checkboxes while tag mode is off.
- [ ] **Step 5: Run tag tests**; expected PASS.
- [ ] **Step 6: Commit** `feat: add explicit bulk tagging workflow`.

### Task 4: Journaled bundle moves and auto-recovery

**Files:**
- Modify: `src/native/storageGateway.ts`
- Modify: `src/native/capacitorStorageGateway.ts`
- Modify: `android/app/src/main/java/com/shadedlm/storage/AssetStoragePlugin.kt`
- Create: `android/app/src/main/java/com/shadedlm/storage/MoveJournal.kt`
- Create: `src/move/moveService.ts`
- Create: `src/move/moveService.test.ts`
- Create: `android/app/src/test/java/com/shadedlm/storage/MoveJournalTest.kt`
- Create: `src/ui/move/MoveSheet.tsx`
- Create: `src/ui/move/MoveSheet.test.tsx`

**Interfaces:**
- Extends `StorageGateway` with `moveBundle(request: MoveBundleRequest): Promise<MoveBundleResult>` and `recoverMoves(): Promise<MoveRecoverySummary>`.
- Native phases: `planned → copying → verifying → deletingSource → committed | failed`.
- Produces: `moveAssets(assetIds, destinationCategoryId): Promise<MoveSummary>`.

- [ ] **Step 1: Write failing native journal tests** for interruption at each phase; assert copied destinations are verified before any source delete and recovery is idempotent.
- [ ] **Step 2: Implement atomic journal-file writes** in app-private storage and bundle-member copy/size verification; use stronger content verification only when provider metadata cannot establish equivalence.
- [ ] **Step 3: Write failing TypeScript move tests** asserting the whole bundle is sent, categoryPath changes only on committed result, packId is unchanged, and failures retain the original logical path.
- [ ] **Step 4: Implement `moveService`** coordinating native result and DB update in a single logical transaction boundary.
- [ ] **Step 5: Write failing MoveSheet tests** for cascading destination, confirmation summary, progress, failure message, and recovery prompt.
- [ ] **Step 6: Implement MoveSheet** and wire it to the category picker.
- [ ] **Step 7: Run `npm test` and `./gradlew test`**; expected PASS.
- [ ] **Step 8: Commit** `feat: add verified journaled bundle moves`.

### Task 5: Packs, favorites, recent/changed, search, and selection dock

**Files:**
- Create: `src/ui/library/PacksScreen.tsx`
- Create: `src/ui/library/UnsortedScreen.tsx`
- Create: `src/ui/library/SelectionDock.tsx`
- Create: `src/library/favorites.ts`
- Create: `src/library/recent.ts`
- Create: `src/ui/library/LibraryModes.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: query, tag, category, and move services.
- Produces browsing modes `library | unsorted | packs | search | favorites | recent`.

- [ ] **Step 1: Write failing tests** asserting one pack can show assets from multiple physical categories without duplicate asset records.
- [ ] **Step 2: Write failing favorite/recent tests** based on explicit favorite state and indexed/changed timestamps.
- [ ] **Step 3: Implement Packs, Unsorted, favorites, recent, and search views** all through `queryLibrary`.
- [ ] **Step 4: Write failing SelectionDock tests** for selected count, Tags, cascading Move, Export placeholder/event, and clear-selection action using the supplied library mockup behavior.
- [ ] **Step 5: Implement transient SelectionDock**; selection state is shared by tag/move/export modes but mode-specific rules determine what confirmation does.
- [ ] **Step 6: Run `npm test` and `npm run build`**; expected PASS.
- [ ] **Step 7: Commit** `feat: complete asset library organization workflows`.

### Task 6: Mobile workflow E2E acceptance

**Files:**
- Create: `e2e/library-workflows.spec.ts`
- Create: `e2e/fixtures/library-state.ts`

**Interfaces:**
- Exercises the public UI only with a fake native gateway.

- [ ] **Step 1: Add a 9:21-ish mobile viewport E2E scenario** with at least 40 assets across packs/categories so scrolling and persistent selection are exercised.
- [ ] **Step 2: Assert tag workflow** exactly follows toggle/select/confirm/auto-off and survives reload.
- [ ] **Step 3: Assert cascading move** rejects roots, moves a dependency bundle, retains pack provenance, and updates Unsorted count.
- [ ] **Step 4: Assert combined filtering/search** does not call materialization/model-loader spies.
- [ ] **Step 5: Run E2E plus `npm test` and Android unit tests**; expected PASS.
- [ ] **Step 6: Commit** `test: cover mobile library organization workflows`.

## Library Workflow Plan Exit Criteria

- The normal library is a fast persisted-thumbnail browser.
- Tags follow the exact explicit mode requested by the user.
- Categories are cascading, editable, and never permit root-level placement except `Unsorted`.
- Packs remain virtual provenance across physical moves.
- Bundle moves are explicit, verified, journaled, and resumable.
- Search/filter/favorite/recent/unsorted workflows operate entirely from cached library data.
