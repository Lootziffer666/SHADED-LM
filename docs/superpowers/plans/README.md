# SHADED-LM V1 Implementation Sequence

Canonical spec: `../specs/2026-10-13-mobile-3d-asset-library-design.md`

Implement in this order:

1. `2026-10-13-core-import-indexing.md`
   - app shell and domain model
   - Android SAF + ZIP bridge
   - recursive discovery and logical bundles
   - GLB/GLTF/FBX/OBJ inspection
   - eager persistent thumbnails
   - first-run Android import/cache smoke flow

2. `2026-10-13-library-workflows.md`
   - thumbnail-only library browsing
   - technical filters/search
   - editable cascading categories
   - explicit toggle/select/confirm/auto-off tagging
   - virtual asset-pack browsing
   - verified journaled bundle moves

3. `2026-10-13-viewer-export-recovery.md`
   - single-owner 3D viewer sessions
   - wireframe/bounds/skeleton and animation playback
   - measured technical inspector
   - Index / Portable / Full Backup exports
   - recovery surface and full V1 acceptance tests

## Non-negotiable V1 boundaries

- Supported model inputs: GLB, GLTF, FBX, OBJ.
- Archive input: ZIP, nested to 3 archive levels.
- Normal library browsing must never load source models.
- New/changed assets are processed eagerly, one model at a time on mobile, and persisted as metadata + 256×256 WebP thumbnail.
- Manual tags never replace or duplicate automatic technical properties.
- No physical category root except `Unsorted` is a valid final destination.
- Asset-pack provenance survives physical categorization.
- OBJ/FBX sidecars move/export as logical bundles.
- Source mutation requires explicit user confirmation and verified destination writes.
- USDZ, conversion, decimation, baking, and destructive editing are explicitly not V1.

Each plan must reach its exit criteria before the next plan begins.