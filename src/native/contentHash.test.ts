import { describe, expect, it } from 'vitest';
import { FakeStorageGateway } from './fakeStorageGateway';

describe('StorageGateway content hashing', () => {
  it('hashes an explicitly requested source without materializing a model session', async () => {
    const gateway = new FakeStorageGateway({
      grant: {
        grantId: 'grant-1',
        treeUri: 'content://tree/library',
        displayName: 'Library',
      },
      contentHashes: {
        'textures/diffuse.png': 'sha256:texture',
      },
    });
    const source = {
      kind: 'saf-document' as const,
      grantId: 'grant-1',
      documentId: 'texture-doc',
      displayPath: 'textures/diffuse.png',
      size: 42,
      modifiedAt: null,
    };

    expect(await gateway.contentHash(source)).toBe('sha256:texture');
    expect(gateway.hashedSources).toEqual([source]);
    expect(gateway.releasedMaterializations).toEqual([]);
  });
});
