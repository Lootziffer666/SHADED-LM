import { describe, expect, it } from 'vitest';
import { FakeStorageGateway } from '../native/fakeStorageGateway';
import { discoverSources } from './discoverSources';

function gatewayWithMixedSources() {
  return new FakeStorageGateway({
    grant: {
      grantId: 'grant-1',
      treeUri: 'content://tree/models',
      displayName: 'Models',
    },
    treePages: [
      {
        entries: [
          {
            documentId: 'glb-1',
            parentDocumentId: null,
            kind: 'file',
            name: 'hero.glb',
            relativePath: 'hero.glb',
            mimeType: 'model/gltf-binary',
            size: 100,
            modifiedAt: 1,
          },
          {
            documentId: 'gltf-1',
            parentDocumentId: null,
            kind: 'file',
            name: 'house.gltf',
            relativePath: 'Architecture/house.gltf',
            mimeType: 'model/gltf+json',
            size: 200,
            modifiedAt: 2,
          },
          {
            documentId: 'fbx-1',
            parentDocumentId: null,
            kind: 'file',
            name: 'run.fbx',
            relativePath: 'Animations/run.FBX',
            mimeType: 'application/octet-stream',
            size: 300,
            modifiedAt: 3,
          },
          {
            documentId: 'obj-1',
            parentDocumentId: null,
            kind: 'file',
            name: 'barrel.obj',
            relativePath: 'Props/barrel.obj',
            mimeType: 'text/plain',
            size: 400,
            modifiedAt: 4,
          },
          {
            documentId: 'txt-1',
            parentDocumentId: null,
            kind: 'file',
            name: 'readme.txt',
            relativePath: 'readme.txt',
            mimeType: 'text/plain',
            size: 5,
            modifiedAt: 5,
          },
          {
            documentId: 'zip-1',
            parentDocumentId: null,
            kind: 'file',
            name: 'Village Pack.zip',
            relativePath: 'Packs/Village Pack.zip',
            mimeType: 'application/zip',
            size: 5000,
            modifiedAt: 6,
          },
        ],
      },
    ],
    zipCatalogs: {
      'Packs/Village Pack.zip': {
        entries: [
          {
            path: 'models/villager.glb',
            kind: 'file',
            size: 111,
            crc32: 1111,
            archiveDepth: 1,
          },
          {
            path: 'bonus.zip!/creatures/fish.obj',
            kind: 'file',
            size: 222,
            crc32: 2222,
            archiveDepth: 2,
          },
          {
            path: 'bonus.zip!/deep.zip!/props/lantern.fbx',
            kind: 'file',
            size: 333,
            crc32: 3333,
            archiveDepth: 3,
          },
          {
            path: 'textures/diffuse.png',
            kind: 'file',
            size: 444,
            crc32: 4444,
            archiveDepth: 1,
          },
        ],
        warnings: ['ZIP depth limit 3 reached at bonus.zip!/deep.zip!/too-deep.zip'],
      },
    },
  });
}

describe('discoverSources', () => {
  it('discovers only supported model formats from loose files and ZIP entries', async () => {
    const sources = await discoverSources(gatewayWithMixedSources(), 'grant-1');

    expect(sources.map((source) => source.primaryFormat)).toEqual([
      'glb',
      'gltf',
      'fbx',
      'obj',
      'glb',
      'obj',
      'fbx',
    ]);
    expect(sources.map((source) => source.displayName)).toEqual([
      'hero',
      'house',
      'run',
      'barrel',
      'villager',
      'fish',
      'lantern',
    ]);
  });

  it('preserves ZIP provenance, internal path, depth and deepest pack name', async () => {
    const sources = await discoverSources(gatewayWithMixedSources(), 'grant-1');
    const zipped = sources.filter((source) => source.source.kind === 'zip-entry');

    expect(zipped[0]).toMatchObject({
      packName: 'Village Pack',
      source: {
        kind: 'zip-entry',
        archiveDocumentId: 'zip-1',
        archiveName: 'Village Pack.zip',
        entryPath: 'models/villager.glb',
        archiveDepth: 1,
      },
    });
    expect(zipped[1]).toMatchObject({
      packName: 'bonus',
      source: {
        entryPath: 'bonus.zip!/creatures/fish.obj',
        archiveDepth: 2,
      },
    });
    expect(zipped[2]).toMatchObject({
      packName: 'deep',
      source: {
        entryPath: 'bonus.zip!/deep.zip!/props/lantern.fbx',
        archiveDepth: 3,
      },
    });
  });

  it('reports a depth-four ZIP rejection as a recoverable warning', async () => {
    const warnings: string[] = [];

    const sources = await discoverSources(gatewayWithMixedSources(), 'grant-1', (warning) => {
      warnings.push(warning.message);
    });

    expect(sources).toHaveLength(7);
    expect(warnings).toEqual([
      'ZIP depth limit 3 reached at bonus.zip!/deep.zip!/too-deep.zip',
    ]);
  });
});
