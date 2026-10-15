import type { AssetBundle, SourceRef } from '../domain/library';
import type { ExportTarget } from '../export/exportTypes';

export interface TreeGrant {
  id: string;
  displayName: string;
  rootDocumentId: string;
}

export type GrantState = 'available' | 'revoked' | 'missing';

export interface SourceEntry {
  source: SourceRef;
  name: string;
  relativePath: string;
  mime?: string;
  size?: number;
  modifiedAt?: number;
  directory: boolean;
}

export interface SourcePage {
  entries: SourceEntry[];
  nextCursor?: string;
}

export interface ZipCatalogEntry {
  source: SourceRef;
  entryPath: string;
  name: string;
  size?: number;
  crc32?: number;
  directory: boolean;
  depth: number;
}

export interface ZipCatalogResult {
  entries: ZipCatalogEntry[];
  warnings: string[];
}

/**
 * A native bundle materialized into WebView-readable URLs.
 * New gateways retain bundle/primary identity explicitly; the fields remain
 * optional so older test doubles and native implementations stay compatible.
 */
export interface MaterializedBundle {
  id: string;
  bundleId?: string;
  primaryMember?: string;
  primaryUrl: string;
  memberUrls: Record<string, string>;
  relativePaths: string[];
}

export interface MoveBundleRequest {
  journalId: string;
  assetId?: string;
  bundle: AssetBundle;
  destinationGrantId: string;
  destinationPath: string[];
  displayName?: string;
}

export interface MoveBundleResult {
  journalId: string;
  assetId?: string;
  status: 'committed' | 'failed';
  destinationSources?: Record<string, SourceRef>;
  destinationPath?: string[];
  error?: string;
}

export interface MoveRecoverySummary {
  recovered: number;
  failed: number;
  results?: MoveBundleResult[];
}

export interface ExportWrite {
  base64?: string;
  source?: SourceRef;
}

export interface StorageGateway {
  chooseTree(): Promise<TreeGrant>;
  validateGrant(grantId: string): Promise<GrantState>;
  listTreePage(grantId: string, cursor?: string): Promise<SourcePage>;
  listZip(source: SourceRef, maxDepth: number): Promise<ZipCatalogResult>;
  materialize(bundle: AssetBundle): Promise<MaterializedBundle>;
  releaseMaterialization(id: string): Promise<void>;
  moveBundle(request: MoveBundleRequest): Promise<MoveBundleResult>;
  recoverMoves(): Promise<MoveRecoverySummary>;
  createExportTarget(suggestedName: string): Promise<ExportTarget>;
  writeExportFile(targetId: string, path: string, write: ExportWrite): Promise<void>;
  finalizeExport(targetId: string): Promise<{ bytes: number }>;
  abortExport(targetId: string): Promise<void>;
}
