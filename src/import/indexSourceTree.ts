import type { LibraryDb } from '../db/libraryDb';
import type {
  AssetBundle,
  AssetRecord,
  IndexJobRecord,
  PackRecord,
  SourceRef,
} from '../domain/library';
import type { SourceEntry, StorageGateway, ZipCatalog } from '../native/storageGateway';
import { discoverSources, type DiscoveredSource } from './discoverSources';
import { fingerprintBundle } from './fingerprint';
import { resolveBundle, type BundleCatalogMember } from './resolveBundle';

const MAX_ZIP_DEPTH = 3;

export interface IndexSummary {
  discovered: number;
  queued: number;
  unchanged: number;
  unavailable: number;
  grantAvailable: boolean;
  warnings: string[];
}

interface TreeInventory {
  members: BundleCatalogMember[];
  archives: Map<string, SourceEntry>;
}

export async function indexSourceTree(
  gateway: StorageGateway,
  db: LibraryDb,
  grantId: string,
): Promise<IndexSummary> {
  const grant = await gateway.validateGrant(grantId);
  if (!grant.valid || !grant.readable) {
    const unavailable = await markGrantUnavailable(db, grantId);
    return {
      discovered: 0,
      queued: 0,
      unchanged: 0,
      unavailable,
      grantAvailable: false,
      warnings: [grant.reason ?? 'Source grant is unavailable'],
    };
  }

  const warnings: string[] = [];
  const inventory = await collectTreeInventory(gateway, grantId);
  const sources = await discoverSources(gateway, grantId, (warning) => warnings.push(warning.message));
  const zipCatalogCache = new Map<string, BundleCatalogMember[]>();
  const packUpdates = new Map<string, PackRecord>();
  const seenAssetIds = new Set<string>();
  const now = Date.now();
  let queued = 0;
  let unchanged = 0;

  for (const source of sources) {
    const catalog =
      source.source.kind === 'zip-entry'
        ? await zipBundleCatalog(gateway, grantId, source, inventory.archives, zipCatalogCache, warnings)
        : inventory.members;
    const candidate = resolveBundle(source, catalog);
    const fingerprint = await fingerprintBundle(candidate, (ref) => gateway.contentHash(ref));
    const assetId = stableAssetId(source.source);
    seenAssetIds.add(assetId);

    const existing = await db.assets.get(assetId);
    const changed = !existing || existing.fingerprint !== fingerprint;
    const pack = source.packName ? packForSource(source, grantId, inventory.archives, assetId) : null;
    const packId = pack?.id ?? null;

    if (pack) {
      const current = packUpdates.get(pack.id) ?? (await db.packs.get(pack.id)) ?? pack;
      packUpdates.set(pack.id, {
        ...current,
        name: pack.name,
        sourceArchiveRef: pack.sourceArchiveRef,
        assetIds: unique([...current.assetIds, assetId]),
      });
    }

    const asset: AssetRecord = {
      id: assetId,
      displayName: source.displayName,
      primaryFormat: source.primaryFormat,
      primarySourceRef: source.source,
      bundleId: candidate.id,
      categoryPath: existing?.categoryPath ?? ['Unsorted'],
      tags: existing?.tags ?? [],
      favorite: existing?.favorite ?? false,
      packId,
      thumbnailId: changed ? null : existing?.thumbnailId ?? null,
      fingerprint,
      inspection: changed ? null : existing?.inspection ?? null,
      sourceAvailable: true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: changed || existing?.sourceAvailable === false ? now : existing?.updatedAt ?? now,
    };

    const bundle: AssetBundle = {
      id: candidate.id,
      primaryMember: candidate.primaryMember,
      members: candidate.members,
      totalBytes: candidate.totalBytes,
      dependencyWarnings: candidate.dependencyWarnings,
    };

    await db.transaction('rw', db.assets, db.bundles, db.jobs, async () => {
      await db.bundles.put(bundle);
      await db.assets.put(asset);
      if (changed) {
        const job: IndexJobRecord = {
          id: `job:${assetId}:${fingerprint}`,
          assetId,
          fingerprint,
          state: 'queued',
          attempts: 0,
          updatedAt: now,
          error: null,
        };
        await db.jobs.put(job);
      }
    });

    if (changed) queued += 1;
    else unchanged += 1;
  }

  if (packUpdates.size > 0) {
    await db.packs.bulkPut([...packUpdates.values()]);
  }

  const unavailable = await markMissingAssetsUnavailable(db, grantId, seenAssetIds, now);

  return {
    discovered: sources.length,
    queued,
    unchanged,
    unavailable,
    grantAvailable: true,
    warnings,
  };
}

async function collectTreeInventory(
  gateway: StorageGateway,
  grantId: string,
): Promise<TreeInventory> {
  const members: BundleCatalogMember[] = [];
  const archives = new Map<string, SourceEntry>();
  let cursor: string | undefined;

  do {
    const page = await gateway.listTreePage(grantId, cursor);
    for (const entry of page.entries) {
      if (entry.kind !== 'file') continue;
      const source: SourceRef = {
        kind: 'saf-document',
        grantId,
        documentId: entry.documentId,
        displayPath: entry.relativePath,
        mimeType: entry.mimeType,
        size: entry.size,
        modifiedAt: entry.modifiedAt,
      };
      members.push({
        relativePath: entry.relativePath,
        source,
        size: entry.size,
        modifiedAt: entry.modifiedAt,
      });
      if (extensionOf(entry.relativePath) === 'zip') archives.set(entry.documentId, entry);
    }
    cursor = page.nextCursor;
  } while (cursor);

  return { members, archives };
}

async function zipBundleCatalog(
  gateway: StorageGateway,
  grantId: string,
  source: DiscoveredSource,
  archives: Map<string, SourceEntry>,
  cache: Map<string, BundleCatalogMember[]>,
  warnings: string[],
): Promise<BundleCatalogMember[]> {
  if (source.source.kind !== 'zip-entry') return [];
  const archiveId = source.source.archiveDocumentId;
  const cached = cache.get(archiveId);
  if (cached) return cached;

  const archive = archives.get(archiveId);
  if (!archive) {
    warnings.push(`Archive metadata missing for ${source.source.archiveName}`);
    return [memberFromDiscoveredSource(source)];
  }

  const archiveRef: SourceRef = {
    kind: 'saf-document',
    grantId,
    documentId: archive.documentId,
    displayPath: archive.relativePath,
    mimeType: archive.mimeType,
    size: archive.size,
    modifiedAt: archive.modifiedAt,
  };
  const catalog: ZipCatalog = await gateway.listZip(archiveRef, MAX_ZIP_DEPTH);
  warnings.push(...catalog.warnings);

  const members = catalog.entries
    .filter((entry) => entry.kind === 'file')
    .map<BundleCatalogMember>((entry) => ({
      relativePath: entry.path,
      source: {
        kind: 'zip-entry',
        grantId,
        archiveDocumentId: archive.documentId,
        archiveName: archive.name,
        entryPath: entry.path,
        archiveDepth: entry.archiveDepth,
        size: entry.size,
        modifiedAt: entry.modifiedAt ?? null,
        crc32: entry.crc32,
      },
      size: entry.size,
      modifiedAt: entry.modifiedAt ?? null,
      crc32: entry.crc32,
    }));

  cache.set(archiveId, members);
  return members;
}

function memberFromDiscoveredSource(source: DiscoveredSource): BundleCatalogMember {
  const relativePath = source.source.kind === 'zip-entry' ? source.source.entryPath : source.source.displayPath;
  return {
    relativePath,
    source: source.source,
    size: source.size,
    modifiedAt: source.modifiedAt,
    crc32: source.source.kind === 'zip-entry' ? source.source.crc32 ?? null : null,
  };
}

function packForSource(
  source: DiscoveredSource,
  grantId: string,
  archives: Map<string, SourceEntry>,
  assetId: string,
): PackRecord | null {
  if (source.source.kind !== 'zip-entry' || !source.packName) return null;
  const nestedArchivePath = source.source.entryPath.split('!/').slice(0, -1).join('!/');
  const identity = nestedArchivePath || source.source.archiveName;
  const archive = archives.get(source.source.archiveDocumentId);

  const sourceArchiveRef: SourceRef = archive
    ? {
        kind: 'saf-document',
        grantId,
        documentId: archive.documentId,
        displayPath: archive.relativePath,
        mimeType: archive.mimeType,
        size: archive.size,
        modifiedAt: archive.modifiedAt,
      }
    : {
        kind: 'saf-document',
        grantId,
        documentId: source.source.archiveDocumentId,
        displayPath: source.source.archiveName,
      };

  return {
    id: `pack:${grantId}:${source.source.archiveDocumentId}:${identity}`,
    name: source.packName,
    sourceArchiveRef,
    assetIds: [assetId],
  };
}

async function markGrantUnavailable(db: LibraryDb, grantId: string): Promise<number> {
  const assets = (await db.assets.toArray()).filter((asset) => asset.primarySourceRef.grantId === grantId);
  if (assets.length === 0) return 0;
  await db.assets.bulkPut(assets.map((asset) => ({ ...asset, sourceAvailable: false })));
  return assets.length;
}

async function markMissingAssetsUnavailable(
  db: LibraryDb,
  grantId: string,
  seenAssetIds: Set<string>,
  now: number,
): Promise<number> {
  const missing = (await db.assets.toArray()).filter(
    (asset) => asset.primarySourceRef.grantId === grantId && !seenAssetIds.has(asset.id),
  );
  if (missing.length === 0) return 0;
  await db.assets.bulkPut(
    missing.map((asset) => ({
      ...asset,
      sourceAvailable: false,
      updatedAt: asset.sourceAvailable ? now : asset.updatedAt,
    })),
  );
  return missing.length;
}

function stableAssetId(source: SourceRef): string {
  if (source.kind === 'zip-entry') {
    return `asset:${source.grantId}:${source.archiveDocumentId}:${source.entryPath}`;
  }
  return `asset:${source.grantId}:${source.documentId}`;
}

function extensionOf(path: string): string {
  const name = path.replace(/\\/g, '/').split('/').at(-1) ?? path;
  const dot = name.lastIndexOf('.');
  return dot > -1 ? name.slice(dot + 1).toLowerCase() : '';
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
