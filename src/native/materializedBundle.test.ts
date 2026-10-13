import { describe, expect, it } from 'vitest';
import type { AssetBundle } from '../domain/library';
import { FakeStorageGateway } from './fakeStorageGateway';

describe('materialized bundle identity', () => {
  it('retains the primary member path alongside its resolved URL', async () => {
    const gateway = new FakeStorageGateway({
      grant: {
        grantId: 'grant-1',
        treeUri: 'content://tree/library',
        displayName: 'Library',
      },
    });
    const bundle: AssetBundle = {
      id: 'bundle-1',
      primaryMember: 'models/Hero.FBX',
      members: [
        {
          relativePath: 'models/Hero.FBX',
          source: {
            kind: 'saf-document',
            grantId: 'grant-1',
            documentId: 'hero-doc',
            displayPath: 'models/Hero.FBX',
          },
          size: 100,
        },
      ],
      totalBytes: 100,
      dependencyWarnings: [],
    };

    const materialized = await gateway.materialize(bundle);

    expect(materialized.primaryMember).toBe('models/Hero.FBX');
    expect(materialized.primaryUrl).toBe('fake://bundle-1/models/Hero.FBX');
  });
});
