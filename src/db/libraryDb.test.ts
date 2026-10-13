import { afterEach, describe, expect, it } from 'vitest';
import { LibraryDb } from './libraryDb';
import type { AssetBundle, AssetRecord, PackRecord, ThumbnailRecord } from '../domain/library';

const databases: LibraryDb[] = [];

function makeDb() {
  const db = new LibraryDb(`shaded-lm-test-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});

describe('LibraryDb', () => {
  it('round-trips asset, bundle, pack, thumbnail and resumable job records', async () => {
    const db = makeDb();
    const now = 1791921600000;

    const bundle: AssetBundle = {
      id: 'bundle-1',
      primaryMember: 'model.glb',
      members: [
        {
          relativePath: 'model.glb',
          source: { kind: 'saf-document', grantId: 'grant-1', documentId: 'doc-1', displayPath: 'model.glb' },
          size: 123,
          modifiedAt: now,
        },
      ],
      totalBytes: 123,
      dependencyWarnings: [],
    };

    const pack: PackRecord = {
      id: 'pack-1',
      name: 'Medieval Village Pack',
      sourceArchiveRef: {
        kind: 'saf-document',
        grantId: 'grant-1',
        documentId: 'zip-1',
        displayPath: 'Medieval Village Pack.zip',
      },
      assetIds: ['asset-1'],
    };

    const asset: AssetRecord = {
      id: 'asset-1',
      displayName: 'model',
      primaryFormat: 'glb',
      primarySourceRef: bundle.members[0].source,
      bundleId: bundle.id,
      categoryPath: ['Unsorted'],
      tags: [],
      favorite: false,
      packId: pack.id,
      thumbnailId: 'thumb-1',
      fingerprint: 'fp-1',
      inspection: null,
      sourceAvailable: true,
      createdAt: now,
      updatedAt: now,
    };

    const thumbnail: ThumbnailRecord = {
      id: 'thumb-1',
      assetId: asset.id,
      fingerprint: asset.fingerprint,
      storageRef: 'thumbs/asset-1.webp',
      width: 256,
      height: 256,
      generatedAt: now,
    };

    const job = {
      id: 'job-1',
      assetId: asset.id,
      fingerprint: asset.fingerprint,
      state: 'inspecting' as const,
      attempts: 1,
      updatedAt: now,
      error: null,
    };

    await db.transaction('rw', db.assets, db.bundles, db.packs, db.thumbnails, db.jobs, async () => {
      await db.bundles.put(bundle);
      await db.packs.put(pack);
      await db.assets.put(asset);
      await db.thumbnails.put(thumbnail);
      await db.jobs.put(job);
    });

    expect(await db.assets.get(asset.id)).toEqual(asset);
    expect(await db.bundles.get(bundle.id)).toEqual(bundle);
    expect(await db.packs.get(pack.id)).toEqual(pack);
    expect(await db.thumbnails.get(thumbnail.id)).toEqual(thumbnail);
    expect(await db.jobs.get(job.id)).toEqual(job);
  });

  it('uses schema version 1 and exposes all required tables', async () => {
    const db = makeDb();
    await db.open();

    expect(db.verno).toBe(1);
    expect(db.tables.map((table) => table.name).sort()).toEqual(
      ['assets', 'bundles', 'jobs', 'packs', 'settings', 'thumbnails'].sort(),
    );
  });
});
