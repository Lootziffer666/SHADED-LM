import { describe, expect, it, vi } from 'vitest';
import type { AssetBundle } from '../domain/library';
import { createCapacitorStorageGateway, type AssetStoragePlugin } from './capacitorStorageGateway';

describe('CapacitorStorageGateway', () => {
  it('maps the StorageGateway contract to serializable native plugin calls', async () => {
    const plugin: AssetStoragePlugin = {
      chooseTree: vi.fn(async () => ({
        grantId: 'grant-1',
        treeUri: 'content://tree/one',
        displayName: 'Models',
      })),
      validateGrant: vi.fn(async () => ({ valid: true, readable: true, writable: true })),
      listTreePage: vi.fn(async () => ({ entries: [], nextCursor: undefined })),
      listZip: vi.fn(async () => ({ entries: [], warnings: [] })),
      contentHash: vi.fn(async () => ({ hash: 'sha256:model' })),
      materialize: vi.fn(async ({ bundle }) => ({
        id: `mat-${bundle.id}`,
        bundleId: bundle.id,
        primaryMember: bundle.primaryMember,
        primaryUrl: 'file:///tmp/model.glb',
        memberUrls: { 'model.glb': 'file:///tmp/model.glb' },
      })),
      releaseMaterialization: vi.fn(async () => undefined),
      writeManagedBundle: vi.fn(async ({ destinationPath }) => ({
        destinationPath,
        writtenMembers: [],
      })),
      deleteMembers: vi.fn(async () => undefined),
    };

    const gateway = createCapacitorStorageGateway(plugin);
    const bundle: AssetBundle = {
      id: 'bundle-1',
      primaryMember: 'model.glb',
      members: [
        {
          relativePath: 'model.glb',
          source: {
            kind: 'saf-document',
            grantId: 'grant-1',
            documentId: 'doc-1',
            displayPath: 'model.glb',
          },
          size: 42,
        },
      ],
      totalBytes: 42,
      dependencyWarnings: [],
    };

    await gateway.chooseTree();
    await gateway.validateGrant('grant-1');
    await gateway.listTreePage('grant-1', 'cursor-2');
    await gateway.contentHash(bundle.members[0]!.source);
    const materialized = await gateway.materialize(bundle);
    await gateway.releaseMaterialization('mat-bundle-1');
    await gateway.writeManagedBundle(bundle, ['Characters', 'Humans', 'Men']);
    await gateway.deleteMembers(bundle.members.map((member) => member.source));

    expect(plugin.validateGrant).toHaveBeenCalledWith({ grantId: 'grant-1' });
    expect(plugin.listTreePage).toHaveBeenCalledWith({ grantId: 'grant-1', cursor: 'cursor-2' });
    expect(plugin.contentHash).toHaveBeenCalledWith({ source: bundle.members[0]!.source });
    expect(plugin.materialize).toHaveBeenCalledWith({ bundle });
    expect(materialized.primaryMember).toBe('model.glb');
    expect(plugin.releaseMaterialization).toHaveBeenCalledWith({ materializationId: 'mat-bundle-1' });
    expect(plugin.writeManagedBundle).toHaveBeenCalledWith({
      bundle,
      destinationPath: ['Characters', 'Humans', 'Men'],
    });
  });
});
