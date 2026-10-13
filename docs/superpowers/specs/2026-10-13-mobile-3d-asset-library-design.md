# Mobile 3D Asset Library — Design Specification

Date: 2026-10-13
Status: written specification pending user review

## Purpose

Build a local-first Android asset-library application for large 3D collections stored on a smartphone. It recursively scans user-selected folder trees, indexes supported model files and ZIP archives, generates and persists thumbnails in one batch, browses the resulting library without loading source models, and loads only the selected model in the interactive viewer.

The application is independent from SHADED. Its exported metadata should remain simple enough for SHADED or other tools to consume later.

## Core rules

- No asset is stored directly in the managed library root.
- `Unsorted` is the only root category that may directly contain unclassified assets.
- All other root categories require cascading selection into a child folder before confirmation.
- The user controls semantic tags and category placement. The app does not invent semantic tags or semantic categories.
- Asset-pack membership is provenance, not a category. One pack may span any number of categories.
- Technical properties such as rigging, animation, face rig, textures, geometry counts and size are detected automatically and remain separate from manual tags.
- Source files are never silently deleted or reorganized.

## Platform

Use a web-based UI and renderer wrapped in a small Android shell.

Recommended stack:

- TypeScript + Vite
- Three.js
- Capacitor Android shell
- small Kotlin bridge for Android Storage Access Framework (SAF)
- IndexedDB for metadata/indexes
- app-private persistent storage for thumbnail cache and journals
- streamed ZIP access (`zip.js` or equivalent)

Android SAF is authoritative for recursive folder-tree access, persistent URI permissions, reliable copy/move/delete operations, and managed-library writes.

## Managed library structure

Initial roots:

```text
Library/
├── Characters/
├── Animals/
├── Vegetation/
├── Architecture/
├── Props/
├── Vehicles/
├── Environment/
├── Food/
├── Structures/
├── Effects/
├── Animations/
├── Collections/
└── Unsorted/
```

All roots except `Unsorted` are non-terminal.

Initial useful hierarchy includes:

```text
Characters/
├── Humans/
│   ├── Men/
│   ├── Women/
│   ├── Boys/
│   ├── Girls/
│   ├── Babies/
│   ├── Elderly/
│   └── Groups/
└── <lore-defined non-human groups>/

Animals/
├── Mammals/
│   ├── Domestic/
│   ├── Wildlife/
│   └── Marine/
├── Birds/
├── Fish/
├── Reptiles/
├── Amphibians/
├── Insects/
└── Arachnids/

Vegetation/
├── Trees/
├── Bushes/
├── Shrubs/
├── Grass/
├── Flowers/
├── Crops/
├── Vines/
├── Aquatic/
└── Dead/

Architecture/
├── Houses/
├── Castles/
├── Fortifications/
├── Religious/
├── Industrial/
├── Agricultural/
├── Shops/
├── Public/
├── Interiors/
├── Ruins/
├── Bridges/
├── Walls/
├── Towers/
└── Modular/

Props/
├── Furniture/
├── Tools/
├── Weapons/
├── Armor/
├── Clothing/
├── Containers/
├── Household/
├── Workshop/
├── Farming/
├── Market/
├── Books/
├── Lighting/
├── Decoration/
├── Musical/
└── Misc/
```

The hierarchy remains editable below the root level. Non-human `Characters` are user/lore-defined rather than hard-coded fantasy stereotypes.

## Supported inputs

Primary model formats:

- GLB
- GLTF
- FBX
- OBJ

Archive format:

- ZIP

The scanner searches recursively through selected folders. Nested ZIP archives are supported up to three archive levels.

## Asset bundles

A logical asset may contain multiple physical files.

Examples:

- `tree.glb`
- `knight.obj + knight.mtl + textures/*`
- `character.fbx + external textures`
- standalone animation FBX

Move, copy, export and delete operations work on the complete bundle, never just the primary model file.

## ZIP and asset packs

ZIP is a first-class source container.

For every ZIP:

1. Read the archive directory without permanently extracting the whole archive.
2. Find supported model files and dependencies recursively.
3. Use the ZIP filename as the default asset-pack name.
4. Preserve archive path and internal entry path.
5. Materialize only the currently inspected/rendered asset bundle.
6. Discard temporary working data afterward.
7. Leave the original ZIP unchanged.

An asset pack may contain assets from any categories. Pack membership remains queryable after assets are physically moved into library folders.

## Tagging workflow

Semantic tags are user-controlled.

Required interaction:

```text
Tag toggle ON
→ select assets
→ open tag editor
→ add/remove tags
→ confirm
→ clear selection
→ Tag toggle OFF automatically
```

For multi-selection, tags show three states: all, mixed, none.

Automatic properties such as `rigged`, `animated`, `faceRig`, and `textured` are not user tags.

## Cascading move workflow

Classification always uses a cascading picker.

Example:

```text
Characters → Humans → Men → Confirm
```

Root categories cannot be confirmed as final destinations. `Unsorted` is the only direct root-level destination.

Physical moves occur only after explicit confirmation and are journaled. The destination is verified before deleting the source.

## Technical inspection

Each new or changed asset is inspected once and cached.

Persist at least:

### Identity and provenance
- filename and display name
- primary format
- source path/URI
- managed-library path
- ZIP source and ZIP-internal path
- pack ID/name
- primary file size and total bundle size
- source fingerprint

### Geometry
- mesh count
- skinned mesh count
- submesh/group count when available
- vertex count
- triangle count
- bounding-box dimensions
- UV presence / UV-set count where available
- normals/tangents presence

### Materials/textures
- material count
- texture count
- texture roles when resolvable
- texture dimensions when decodable
- largest texture dimensions
- textured yes/no

### Rigging
- rigged yes/no
- skeleton count
- bone count
- bone names
- skinned/weighted vertex evidence

### Face rig
Detect and retain evidence from:

- morph targets / blendshapes
- facially named bones
- jaw controls
- eye controls
- known facial/viseme naming patterns

Persist morph-target count/names, probable facial-bone count, jaw/eye evidence and confidence. Morph targets alone do not automatically imply a confident face rig.

### Animation
- animated yes/no
- clip count
- clip names
- duration per clip
- total duration
- track count
- targeted bones/nodes when available

Animation-only FBX files are valid standalone assets. Possible model/animation associations may be suggested from pack membership, skeleton compatibility, names and directory proximity, but are never silently merged.

## Automatic badges and filtering

Automatic card badges:

- Animated
- Rigged
- Face Rig / Face?
- Textured

Useful filters:

- format
- category
- asset pack
- manual tag
- animated
- rigged
- face rig
- textured
- bone count
- animation count
- triangle count
- bundle/file size

## Thumbnail pipeline

Thumbnail generation is eager for all new/changed assets during indexing.

Per asset:

1. Resolve/materialize only its bundle.
2. Load with the matching Three.js loader.
3. Resolve sidecar textures/materials where possible.
4. Compute bounds.
5. Normalize position and camera framing.
6. Render with a consistent neutral studio setup.
7. Save persistent WebP thumbnail (initial target: 256×256).
8. Persist inspection metadata.
9. Dispose geometries, materials, textures, animation mixers, URLs, buffers and temporary files.
10. Continue with the next asset.

Default mobile concurrency is one model at a time.

Later scans reuse metadata/thumbnails for unchanged assets and only process new or changed assets.

Library browsing loads thumbnails and metadata only.

## Viewer

The viewer loads only the selected asset bundle.

Required features:

- orbit / pan / zoom
- auto-center / fit camera
- camera reset
- neutral inspection lighting
- wireframe
- bounding box
- skeleton/bone visualization
- material overview
- texture overview
- technical stats
- animation clip selection
- play/pause
- scrub
- loop
- full-screen

On close/switch, all model-specific CPU/GPU resources are explicitly disposed.

## Browsing modes

- category tree
- asset packs
- search
- filtered results
- favorites
- recently added/changed
- unsorted

Pack browsing is virtual and never duplicates source files.

## Data model

Minimum logical records:

### AssetRecord
`id`, `displayName`, `primaryFormat`, `primarySourceRef`, `bundleId`, `categoryPath`, `tags[]`, `favorite`, `packId`, `thumbnailId`, `fingerprint`, `inspection`, timestamps.

### AssetBundle
`id`, `primaryMember`, `members[]`, `totalBytes`, `dependencyWarnings[]`.

### PackRecord
`id`, `name`, `sourceArchiveRef`, `assetIds[]`.

### ThumbnailRecord
`id`, `assetId`, `fingerprint`, `storageRef`, dimensions, `generatedAt`.

### MoveJournalEntry
`id`, `bundleId`, `sourceMembers[]`, `destinationPath`, `phase`, `verification`, timestamps.

## Export

Three scopes:

1. **Index export** — `library.json` + thumbnails.
2. **Portable library** — metadata + thumbnails + managed asset bundles.
3. **Full backup** — portable data plus organization state, categories, packs, favorites, tags and operational metadata needed to restore the library.

Pack relationships remain independent from physical category placement.

## Error handling

- Scanner and thumbnail queue are resumable.
- One corrupt model/texture/ZIP never aborts the whole pass.
- Failed assets retain a fallback card plus error stage/message and retry option.
- File operations are journaled.
- Source files are deleted only after verified destination writes.
- Lost Android SAF permission keeps cached metadata/thumbnails and marks source unavailable rather than deleting records.

## UI design references

The supplied mobile mockups `3d_asset_bibliothek_hell_9_21.html`, `3d_viewer_inspektion_hell_9_21.html` and `prism_spatial.md` are authoritative visual references for V1.

### Prism Spatial

Use the light `Prism Spatial` language:

- high-key daylight surfaces and white elevated cards
- cobalt primary actions
- teal technical/telemetry accents
- Space Grotesk for headings, labels and numeric metadata
- Manrope for body/descriptive text
- compact 12–16 px rhythm and rounded mobile surfaces
- progressive disclosure rather than permanent telemetry overload
- tall-phone / 9:21 / thumb-zone ergonomics

### Library screen

Use the supplied library mockup as the visual reference for:

- fixed mobile header and SAF/library path state
- scan/sync status
- two-column thumbnail grid
- optional one-column mode
- horizontally scrollable technical filters
- square persisted thumbnails
- compact format/file-size badge
- asset title + pack provenance
- explicit transient selection state
- bottom selection dock with Tags / cascading Move / Export

Tagging still follows the explicit toggle/select/confirm/auto-off workflow defined above.

### Viewer/inspector

Use the supplied viewer mockup as the reference for:

- breadcrumb/back + identity
- large 3D viewport
- wireframe and skeleton toggles
- animation bar with clip selection, scrub and loop
- collapsible sections for identity/provenance, geometry, rig/face rig and materials/textures
- actions near the lower thumb zone

Only real measured/extracted data may be shown. Mockup labels such as `optimal`, `valid`, `ARKit compliant`, or other quality judgments must not appear unless an implemented rule actually proves them.

### Explicitly not V1

Some illustrative mockup elements are outside the agreed scope and must not silently expand V1:

- USDZ
- GLTF/FBX conversion
- mesh decimation / LOD generation
- destructive mesh editing
- texture baking/material conversion

V1 remains an organizer, inspector, browser and viewer.

## V1 acceptance flow

V1 is successful when Android can:

1. Grant a source folder tree.
2. Recursively discover GLB/GLTF/FBX/OBJ and ZIP packs.
3. Inspect ZIP contents without permanently extracting whole archives.
4. Generate and persist thumbnails for the full new/changed queue.
5. Reopen and browse without rereading unchanged models.
6. Show automatic technical badges/counts.
7. Open exactly one asset and inspect/play animations.
8. Toggle Tag mode, multi-select, confirm edits and automatically exit Tag mode.
9. Move through a cascading picker with no root-category terminal destination except `Unsorted`.
10. Keep asset-pack relationships across multiple physical categories.
11. Move OBJ/FBX dependency bundles together.
12. Export an index and portable library.
13. Resume safely after interrupted scanning, thumbnailing or moves.
