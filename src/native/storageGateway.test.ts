import { describe, expect, it } from 'vitest';
import { FakeStorageGateway } from './fakeStorageGateway';
import type { AssetBundle } from '../domain/library';

describe('StorageGateway contract', () => {
  it('chooses a tree and keeps its grant addressable for later validation', async () => {
    const gateway = new FakeStorageGateway({
      grant: {
        grantId: 'grant-library',
        treeUri: 'content://tree/library',
        displayName: '3D Models',
      },
    });

    const grant = await gateway.chooseTree();

    expect(grant).toEqual({
      grantId: 'grant-library',
      treeUri: 'content://tree/library',
      displayName: '3D Models',
    });
    expect(await gateway.validateGrant(grant.grantId)).toEqual({
      valid: true,
      readable: true,
      writable: true,
    });
  });

  it('returns recursive source listings page by page without flattening identity', async () => {
    const gateway = new FakeStorageGateway({
      grant: {
        grantId: 'grant-library',
        treeUri: 'content://tree/library',
        displayName: '3D Models',
      },
      treePages: [
        {
          entries: [
            {
              documentId: 'dir-characters',
              parentDocumentId: null,
              kind: 'directory',
              name: 'Characters',
              relativePath: 'Characters',
              mimeType: 'vnd.android.document/directory',
              size: 0,
              modifiedAt: 100,
            },
            {
              documentId: 'model-1',
              parentDocumentId: 'dir-characters',
              kind: 'file',
              name: 'villager.glb',
              relativePath: 'Characters/villager.glb',
              mimeType: 'model/gltf-binary',
              size: 1024,
              modifiedAt: 200,
            },
          ],
          nextCursor: 'page-2',
        },
        {
          cursor: 'page-2',
          entries: [
            {
              documentId: 'zip-1',
              parentDocumentId: null,
              kind: 'file',
              name: 'village_pack.zip',
              relativePath: 'village_pack.zip',
              mimeType: 'application/zip',
              size: 2048,
              modifiedAt: 300,
            },
          ],
        },
      ],
    });

    const first = await gateway.listTreePage('grant-library');
    const second = await gateway.listTreePage('grant-library', first.nextCursor);

    expect(first.entries.map((entry) => entry.relativePath)).toEqual([
      'Characters',
      'Characters/villager.glb',
    ]);
    expect(first.nextCursor).toBe('page-2');
    expect(second.entries[0]?.documentId).toBe('zip-1');
    expect(second.nextCursor).toBeUndefined();
  });

  it('preserves full ZIP paths when duplicate basenames exist', async () => {
    const gateway = new FakeStorageGateway({
      grant: {
        grantId: 'grant-library',
        treeUri: 'content://tree/library',
        displayName: '3D Models',
      },
      zipCatalogs: {
        'pack.zip': {
          entries: [
            {
              path: 'A/textures/diffuse.png',
              kind: 'file',
              size: 10,
              crc32: 1,
              archiveDepth: 1,
            },
            {
              path: 'B/textures/diffuse.png',
              kind: 'file',
              size: 20,
              crc32: 2,
              archiveDepth: 1,
            },
          ],
          warnings: [],
        },
      },
    });

    const catalog = await gateway.listZip(
      {
        kind: 'saf-document',
        grantId: 'grant-library',
        documentId: 'zip-doc',
        displayPath: 'pack.zip',
      },
      3,
    );

    expect(catalog.entries.map((entry) => entry.path)).toEqual([
      'A/textures/diffuse.png',
      'B/textures/diffuse.png',
    ]);
    expect(catalog.entries.map((entry) => entry.crc32)).toEqual([1, 2]);
  });

  it('requires explicit release of every materialized bundle', async () => {
    const gateway = new FakeStorageGateway({
      grant: {
        grantId: 'grant-library',
        treeUri: 'content://tree/library',
        displayName: '3D Models',
      },
    });

    const bundle: AssetBundle = {
      id: 'bundle-1',
      primaryMember: 'model.obj',
      members: [
        {
          relativePath: 'model.obj',
          source: {
            kind: 'saf-document',
            grantId: 'grant-library',
            documentId: 'model-doc',
            displayPath: 'model.obj',
          },
          size: 10,
          modifiedAt: 100,
        },
        {
          relativePath: 'textures/diffuse.png',
          source: {
            kind: 'saf-document',
            grantId: 'grant-library',
            documentId: 'texture-doc',
            displayPath: 'textures/diffuse.png',
          },
          size: 20,
          modifiedAt: 100,
        },
      ],
      totalBytes: 30,
      dependencyWarnings: [],
    };

    const materialized = await gateway.materialize(bundle);

    expect(materialized.primaryUrl).toBe('fake://bundle-1/model.obj');
    expect(materialized.memberUrls['textures/diffuse.png']).toBe(
      'fake://bundle-1/textures/diffuse.png',
    );
    expect(gateway.releasedMaterializations).toEqual([]);

    await gateway.releaseMaterialization(materialized.id);
    expect(gateway.releasedMaterializations).toEqual([materialized.id]);
  });
});
