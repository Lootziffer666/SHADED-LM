import { registerPlugin } from '@capacitor/core';
import type { AssetBundle, SourceRef } from '../domain/library';
import type {
  GrantValidation,
  MaterializedBundle,
  SourcePage,
  StorageGateway,
  TreeGrant,
  WriteBundleResult,
  ZipCatalog,
} from './storageGateway';

export interface AssetStoragePlugin {
  chooseTree(): Promise<TreeGrant>;
  validateGrant(options: { grantId: string }): Promise<GrantValidation>;
  listTreePage(options: { grantId: string; cursor?: string }): Promise<SourcePage>;
  listZip(options: { source: SourceRef; maxDepth: number }): Promise<ZipCatalog>;
  contentHash(options: { source: SourceRef }): Promise<{ hash: string }>;
  materialize(options: { bundle: AssetBundle }): Promise<MaterializedBundle>;
  releaseMaterialization(options: { materializationId: string }): Promise<void>;
  writeManagedBundle(options: {
    bundle: AssetBundle;
    destinationPath: string[];
  }): Promise<WriteBundleResult>;
  deleteMembers(options: { members: SourceRef[] }): Promise<void>;
}

export function createCapacitorStorageGateway(plugin: AssetStoragePlugin): StorageGateway {
  return {
    chooseTree: () => plugin.chooseTree(),
    validateGrant: (grantId) => plugin.validateGrant({ grantId }),
    listTreePage: (grantId, cursor) =>
      plugin.listTreePage({ grantId, ...(cursor ? { cursor } : {}) }),
    listZip: (source, maxDepth) => plugin.listZip({ source, maxDepth }),
    contentHash: async (source) => (await plugin.contentHash({ source })).hash,
    materialize: (bundle) => plugin.materialize({ bundle }),
    releaseMaterialization: (materializationId) =>
      plugin.releaseMaterialization({ materializationId }),
    writeManagedBundle: (bundle, destinationPath) =>
      plugin.writeManagedBundle({ bundle, destinationPath }),
    deleteMembers: (members) => plugin.deleteMembers({ members }),
  };
}

export const assetStoragePlugin = registerPlugin<AssetStoragePlugin>('AssetStorage');
export const capacitorStorageGateway = createCapacitorStorageGateway(assetStoragePlugin);
