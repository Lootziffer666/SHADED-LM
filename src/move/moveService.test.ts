import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { LibraryDb } from '../db/libraryDb';
import type { AssetBundle, AssetRecord, SourceRef } from '../domain/library';
import type { MoveBundleRequest, MoveBundleResult, StorageGateway } from '../native/storageGateway';
import { moveAssets } from './moveService';

const source = (id: string): SourceRef => ({ kind: 'saf-document', grantId: 'g', documentId: id, name: id, size: 10 });
const bundle: AssetBundle = { id: 'bundle:a', primaryMember: 'models/a.obj', members: [{ relativePath: 'models/a.obj', source: source('a.obj'), size: 10, role: 'primary' }, { relativePath: 'models/a.mtl', source: source('a.mtl'), size: 4, role: 'material' }, { relativePath: 'models/a.png', source: source('a.png'), size: 8, role: 'texture' }], totalBytes: 22, dependencyWarnings: [] };
const asset: AssetRecord = { id: 'a', displayName: 'A', primaryFormat: 'obj', primarySourceRef: source('a.obj'), bundleId: bundle.id, categoryPath: ['Unsorted'], tags: [], favorite: false, packId: 'pack:p', fingerprint: 'fp', createdAt: 1, updatedAt: 1 };

function gateway(result: MoveBundleResult, capture: (r: MoveBundleRequest) => void): StorageGateway {
  return {
    chooseTree: async () => ({ id: 'g', displayName: 'Assets', rootDocumentId: 'root' }),
    validateGrant: async () => 'available',
    listTreePage: async () => ({ entries: [] }),
    listZip: async () => ({ entries: [], warnings: [] }),
    materialize: async () => ({ id: 'm', primaryUrl: '', memberUrls: {}, relativePaths: [] }),
    releaseMaterialization: async () => {},
    moveBundle: async (r) => (capture(r), result),
    recoverMoves: async () => ({ recovered: 0, failed: 0 }),
    createExportTarget: async (suggestedName) => ({ id: 'export', name: suggestedName }),
    writeExportFile: async () => {},
    finalizeExport: async () => ({ bytes: 0 }),
    abortExport: async () => {},
  };
}

describe('moveAssets', () => {
  it('sends the complete bundle and updates category only after native commit', async () => {
    const db = new LibraryDb(`move-${crypto.randomUUID()}`);
    await db.assets.put(asset);
    await db.bundles.put(bundle);
    let request!: MoveBundleRequest;
    const moved = source('moved/a.obj');
    const result: MoveBundleResult = { journalId: 'j', status: 'committed', destinationSources: { 'models/a.obj': moved, 'models/a.mtl': source('moved/a.mtl'), 'models/a.png': source('moved/a.png') } };
    await moveAssets(db, gateway(result, (r) => (request = r)), ['a'], ['Characters', 'Humans', 'Men'], 'g');
    expect(request.bundle.members).toHaveLength(3);
    expect(request.destinationPath).toEqual(['Characters', 'Humans', 'Men']);
    const after = await db.assets.get('a');
    expect(after?.categoryPath).toEqual(['Characters', 'Humans', 'Men']);
    expect(after?.packId).toBe('pack:p');
    expect(after?.primarySourceRef).toEqual(moved);
    await db.delete();
  });

  it('keeps the old logical category when native move fails', async () => {
    const db = new LibraryDb(`move-${crypto.randomUUID()}`);
    await db.assets.put(asset);
    await db.bundles.put(bundle);
    await expect(moveAssets(db, gateway({ journalId: 'j', status: 'failed', error: 'nope' }, () => {}), ['a'], ['Props', 'Tools'], 'g')).rejects.toThrow('nope');
    expect((await db.assets.get('a'))?.categoryPath).toEqual(['Unsorted']);
    await db.delete();
  });
});
