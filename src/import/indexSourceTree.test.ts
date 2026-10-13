import { afterEach, describe, expect, it } from 'vitest';
import { LibraryDb } from '../db/libraryDb';
import type { AssetRecord } from '../domain/library';
import { FakeStorageGateway } from '../native/fakeStorageGateway';
import { indexSourceTree } from './indexSourceTree';

const databases: LibraryDb[] = [];

function makeDb() {
  const db = new LibraryDb(`index-test-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});

function looseGateway(size = 100, modifiedAt: number | null = 10) {
  return new FakeStorageGateway({
    grant: { grantId: 'grant-1', treeUri: 'content://tree/models', displayName: 'Models' },
    treePages: [
      {
        entries: [
          {
            documentId: 'hero-doc',
            parentDocumentId: null,
            kind: 'file',
            name: 'hero.glb',
            relativePath: 'hero.glb',
            mimeType: 'model/gltf-binary',
            size,
            modifiedAt,
          },
        ],
      },
    ],
    contentHashes: { 'hero.glb': 'sha256:hero' },
  });
}

describe('indexSourceTree', () => {
  it('creates new assets in Unsorted and queues only new fingerprints', async () => {
    const db = makeDb();
    const summary = await indexSourceTree(looseGateway(), db, 'grant-1');

    expect(summary).toMatchObject({ discovered: 1, queued: 1, unchanged: 0, unavailable: 0 });
    const assets = await db.assets.toArray();
    const jobs = await db.jobs.toArray();

    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({
      displayName: 'hero',
      primaryFormat: 'glb',
      categoryPath: ['Unsorted'],
      tags: [],
      favorite: false,
      packId: null,
      sourceAvailable: true,
      inspection: null,
      thumbnailId: null,
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ assetId: assets[0]!.id, state: 'queued', attempts: 0 });
  });

  it('preserves user organization and cached inspection when the fingerprint is unchanged', async () => {
    const db = makeDb();
    const gateway = looseGateway();
    await indexSourceTree(gateway, db, 'grant-1');
    const first = (await db.assets.toArray())[0]!;

    const organized: AssetRecord = {
      ...first,
      categoryPath: ['Characters', 'Humans', 'Men'],
      tags: ['hero', 'medieval'],
      favorite: true,
      thumbnailId: 'thumb-cached',
      inspection: {
        meshCount: 1,
        skinnedMeshCount: 1,
        submeshCount: 1,
        vertexCount: 10,
        triangleCount: 5,
        bounds: { x: 1, y: 2, z: 1 },
        uvSetCount: 1,
        hasNormals: true,
        hasTangents: false,
        materialCount: 1,
        textureCount: 1,
        textureDimensions: [],
        largestTexture: null,
        textured: true,
        rigged: true,
        skeletonCount: 1,
        boneCount: 67,
        boneNames: [],
        morphTargetCount: 0,
        morphTargetNames: [],
        faceRig: {
          state: 'none',
          confidence: 0,
          probableFacialBoneCount: 0,
          hasJawEvidence: false,
          hasEyeEvidence: false,
          evidence: [],
        },
        animated: false,
        clipCount: 0,
        clips: [],
        totalAnimationDuration: 0,
      },
    };
    await db.assets.put(organized);
    await db.jobs.clear();

    const secondSummary = await indexSourceTree(gateway, db, 'grant-1');
    const second = await db.assets.get(first.id);

    expect(secondSummary).toMatchObject({ discovered: 1, queued: 0, unchanged: 1 });
    expect(await db.jobs.count()).toBe(0);
    expect(second).toMatchObject({
      categoryPath: ['Characters', 'Humans', 'Men'],
      tags: ['hero', 'medieval'],
      favorite: true,
      thumbnailId: 'thumb-cached',
      inspection: organized.inspection,
      sourceAvailable: true,
    });
  });

  it('requeues a changed source but preserves manual organization', async () => {
    const db = makeDb();
    await indexSourceTree(looseGateway(100, 10), db, 'grant-1');
    const first = (await db.assets.toArray())[0]!;
    await db.assets.put({
      ...first,
      categoryPath: ['Characters', 'Humans', 'Men'],
      tags: ['hero'],
      thumbnailId: 'old-thumb',
    });
    await db.jobs.clear();

    const summary = await indexSourceTree(looseGateway(101, 10), db, 'grant-1');
    const changed = await db.assets.get(first.id);

    expect(summary.queued).toBe(1);
    expect(changed?.fingerprint).not.toBe(first.fingerprint);
    expect(changed).toMatchObject({
      categoryPath: ['Characters', 'Humans', 'Men'],
      tags: ['hero'],
      thumbnailId: null,
      inspection: null,
      sourceAvailable: true,
    });
  });

  it('creates virtual pack provenance for ZIP assets without changing physical category rules', async () => {
    const db = makeDb();
    const gateway = new FakeStorageGateway({
      grant: { grantId: 'grant-1', treeUri: 'content://tree/models', displayName: 'Models' },
      treePages: [
        {
          entries: [
            {
              documentId: 'pack-doc',
              parentDocumentId: null,
              kind: 'file',
              name: 'Village Pack.zip',
              relativePath: 'Packs/Village Pack.zip',
              mimeType: 'application/zip',
              size: 500,
              modifiedAt: 10,
            },
          ],
        },
      ],
      zipCatalogs: {
        'Packs/Village Pack.zip': {
          entries: [
            { path: 'models/villager.glb', kind: 'file', size: 100, crc32: 123, archiveDepth: 1 },
          ],
          warnings: [],
        },
      },
    });

    await indexSourceTree(gateway, db, 'grant-1');
    const asset = (await db.assets.toArray())[0]!;
    const pack = (await db.packs.toArray())[0]!;

    expect(asset.categoryPath).toEqual(['Unsorted']);
    expect(asset.packId).toBe(pack.id);
    expect(pack.name).toBe('Village Pack');
    expect(pack.assetIds).toEqual([asset.id]);
  });

  it('marks missing or revoked sources unavailable while preserving cached records', async () => {
    const db = makeDb();
    const initialGateway = looseGateway();
    await indexSourceTree(initialGateway, db, 'grant-1');
    const first = (await db.assets.toArray())[0]!;
    await db.assets.put({
      ...first,
      categoryPath: ['Characters', 'Humans', 'Men'],
      tags: ['keep-me'],
      thumbnailId: 'cached-thumb',
    });

    const emptyGateway = new FakeStorageGateway({
      grant: { grantId: 'grant-1', treeUri: 'content://tree/models', displayName: 'Models' },
      treePages: [{ entries: [] }],
    });
    const missingSummary = await indexSourceTree(emptyGateway, db, 'grant-1');
    const missing = await db.assets.get(first.id);

    expect(missingSummary.unavailable).toBe(1);
    expect(missing).toMatchObject({
      sourceAvailable: false,
      categoryPath: ['Characters', 'Humans', 'Men'],
      tags: ['keep-me'],
      thumbnailId: 'cached-thumb',
    });

    const revokedGateway = new FakeStorageGateway({
      grant: { grantId: 'grant-1', treeUri: 'content://tree/models', displayName: 'Models' },
      grantValidation: { valid: false, readable: false, writable: false, reason: 'revoked' },
    });
    const revokedSummary = await indexSourceTree(revokedGateway, db, 'grant-1');

    expect(revokedSummary).toMatchObject({ discovered: 0, queued: 0, unavailable: 1, grantAvailable: false });
    expect((await db.assets.get(first.id))?.sourceAvailable).toBe(false);
  });
});
