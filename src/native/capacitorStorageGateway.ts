import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AssetBundle, SourceRef } from '../domain/library';
import type { ExportTarget } from '../export/exportTypes';
import type {
  ExportWrite,
  GrantState,
  MaterializedBundle,
  MoveBundleRequest,
  MoveBundleResult,
  MoveRecoverySummary,
  SourceEntry,
  SourcePage,
  StorageGateway,
  TreeGrant,
  ZipCatalogResult,
} from './storageGateway';

type NativeMaterializedBundle = Pick<MaterializedBundle, 'id' | 'primaryUrl' | 'memberUrls'> &
  Partial<Pick<MaterializedBundle, 'bundleId' | 'primaryMember' | 'relativePaths'>>;

interface NativeAssetStoragePlugin {
  chooseTree(): Promise<TreeGrant>;
  chooseFiles(): Promise<{ entries: SourceEntry[] }>;
  validateGrant(options: { grantId: string }): Promise<{ state: GrantState }>;
  listTreePage(options: { grantId: string; cursor?: string }): Promise<SourcePage>;
  listZip(options: { source: SourceRef; maxDepth: number }): Promise<ZipCatalogResult>;
  materialize(options: { bundle: AssetBundle }): Promise<NativeMaterializedBundle>;
  releaseMaterialization(options: { id: string }): Promise<void>;
  shareBundle(options: { bundle: AssetBundle }): Promise<void>;
  openBundle(options: { bundle: AssetBundle }): Promise<void>;
  moveBundle(options: { request: MoveBundleRequest }): Promise<MoveBundleResult>;
  recoverMoves(): Promise<MoveRecoverySummary>;
  createExportTarget(options: { suggestedName: string }): Promise<ExportTarget>;
  writeExportFile(options: { targetId: string; path: string; write: ExportWrite }): Promise<void>;
  finalizeExport(options: { targetId: string }): Promise<{ bytes: number }>;
  abortExport(options: { targetId: string }): Promise<void>;
}

const NativeStorage = registerPlugin<NativeAssetStoragePlugin>('AssetStorage');
const webUrl = (url: string) => (url.startsWith('file:') ? Capacitor.convertFileSrc(url) : url);

export class CapacitorStorageGateway implements StorageGateway {
  chooseTree() {
    return NativeStorage.chooseTree();
  }

  async chooseFiles() {
    return (await NativeStorage.chooseFiles()).entries;
  }

  async validateGrant(grantId: string) {
    return (await NativeStorage.validateGrant({ grantId })).state;
  }

  listTreePage(grantId: string, cursor?: string) {
    return NativeStorage.listTreePage({ grantId, cursor });
  }

  listZip(source: SourceRef, maxDepth: number) {
    return NativeStorage.listZip({ source, maxDepth });
  }

  async materialize(bundle: AssetBundle): Promise<MaterializedBundle> {
    const m = await NativeStorage.materialize({ bundle });
    return {
      ...m,
      bundleId: m.bundleId ?? bundle.id,
      primaryMember: m.primaryMember ?? bundle.primaryMember,
      relativePaths: m.relativePaths ?? Object.keys(m.memberUrls),
      primaryUrl: webUrl(m.primaryUrl),
      memberUrls: Object.fromEntries(Object.entries(m.memberUrls).map(([key, value]) => [key, webUrl(value)])),
    };
  }

  releaseMaterialization(id: string) {
    return NativeStorage.releaseMaterialization({ id });
  }

  shareBundle(bundle: AssetBundle) {
    return NativeStorage.shareBundle({ bundle });
  }

  openBundle(bundle: AssetBundle) {
    return NativeStorage.openBundle({ bundle });
  }

  moveBundle(request: MoveBundleRequest) {
    return NativeStorage.moveBundle({ request });
  }

  recoverMoves() {
    return NativeStorage.recoverMoves();
  }

  createExportTarget(suggestedName: string) {
    return NativeStorage.createExportTarget({ suggestedName });
  }

  writeExportFile(targetId: string, path: string, write: ExportWrite) {
    return NativeStorage.writeExportFile({ targetId, path, write });
  }

  finalizeExport(targetId: string) {
    return NativeStorage.finalizeExport({ targetId });
  }

  abortExport(targetId: string) {
    return NativeStorage.abortExport({ targetId });
  }
}
