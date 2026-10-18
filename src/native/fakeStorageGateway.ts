import type { AssetBundle, SourceRef } from '../domain/library';
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

export class FakeStorageGateway implements StorageGateway {
  constructor(public pages: SourcePage[] = [], public zips = new Map<string, ZipCatalogResult>()) {}

  released: string[] = [];
  state: GrantState = 'available';
  moves: MoveBundleRequest[] = [];
  pickedFiles: SourceEntry[] = [];
  sharedBundles: string[] = [];
  openedBundles: string[] = [];
  exportWrites: Array<{ targetId: string; path: string; source?: SourceRef; base64?: string }> = [];
  finalizedExports: string[] = [];
  abortedExports: string[] = [];

  async chooseTree(): Promise<TreeGrant> {
    return { id: 'fake', displayName: 'Assets', rootDocumentId: 'root' };
  }

  async chooseFiles(): Promise<SourceEntry[]> {
    return this.pickedFiles;
  }

  async validateGrant(): Promise<GrantState> {
    return this.state;
  }

  async listTreePage(_grantId: string, cursor?: string) {
    return this.pages[Number(cursor ?? 0)] ?? { entries: [] };
  }

  async listZip(source: SourceRef, _maxDepth: number) {
    return this.zips.get(sourceKey(source)) ?? { entries: [], warnings: [] };
  }

  async materialize(bundle: AssetBundle): Promise<MaterializedBundle> {
    const urls = Object.fromEntries(bundle.members.map((member) => [member.relativePath, `blob:fake/${member.relativePath}`]));
    return {
      id: `mat:${bundle.id}`,
      bundleId: bundle.id,
      primaryMember: bundle.primaryMember,
      primaryUrl: urls[bundle.primaryMember] ?? '',
      memberUrls: urls,
      relativePaths: Object.keys(urls),
    };
  }

  async releaseMaterialization(id: string) {
    this.released.push(id);
  }

  async shareBundle(bundle: AssetBundle) {
    this.sharedBundles.push(bundle.id);
  }

  async openBundle(bundle: AssetBundle) {
    this.openedBundles.push(bundle.id);
  }

  async moveBundle(request: MoveBundleRequest): Promise<MoveBundleResult> {
    this.moves.push(request);
    return {
      journalId: request.journalId,
      assetId: request.assetId,
      status: 'committed',
      destinationSources: Object.fromEntries(request.bundle.members.map((member) => [member.relativePath, member.source])),
      destinationPath: request.destinationPath,
    };
  }

  async recoverMoves(): Promise<MoveRecoverySummary> {
    return { recovered: 0, failed: 0, results: [] };
  }

  async createExportTarget(suggestedName: string) {
    return { id: `export:${this.finalizedExports.length + this.abortedExports.length + 1}`, name: suggestedName };
  }

  async writeExportFile(targetId: string, path: string, write: ExportWrite) {
    this.exportWrites.push({ targetId, path, ...write });
  }

  async finalizeExport(targetId: string) {
    this.finalizedExports.push(targetId);
    return {
      bytes: this.exportWrites.filter((write) => write.targetId === targetId).reduce((sum, write) => sum + (write.base64?.length ?? 0), 0),
    };
  }

  async abortExport(targetId: string) {
    this.abortedExports.push(targetId);
  }
}

export function sourceKey(source: SourceRef): string {
  return source.kind === 'saf-document'
    ? `${source.grantId}:${source.documentId}`
    : `${sourceKey(source.archive)}!${source.entryPath}`;
}
