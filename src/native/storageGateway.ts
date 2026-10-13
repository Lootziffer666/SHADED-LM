import type { AssetBundle, SourceRef } from '../domain/library';

export interface TreeGrant {
  grantId: string;
  treeUri: string;
  displayName: string;
}

export interface GrantValidation {
  valid: boolean;
  readable: boolean;
  writable: boolean;
  reason?: string;
}

export interface SourceEntry {
  documentId: string;
  parentDocumentId: string | null;
  kind: 'file' | 'directory';
  name: string;
  relativePath: string;
  mimeType: string;
  size: number;
  modifiedAt: number | null;
}

export interface SourcePage {
  entries: SourceEntry[];
  nextCursor?: string;
}

export interface ZipEntryDescriptor {
  path: string;
  kind: 'file' | 'directory';
  size: number;
  crc32: number | null;
  archiveDepth: number;
  modifiedAt?: number | null;
}

export interface ZipCatalog {
  entries: ZipEntryDescriptor[];
  warnings: string[];
}

export interface MaterializedBundle {
  id: string;
  bundleId: string;
  primaryUrl: string;
  memberUrls: Record<string, string>;
}

export interface WriteBundleResult {
  destinationPath: string[];
  writtenMembers: Array<{
    relativePath: string;
    documentId: string;
    size: number;
  }>;
}

export interface StorageGateway {
  chooseTree(): Promise<TreeGrant>;
  validateGrant(grantId: string): Promise<GrantValidation>;
  listTreePage(grantId: string, cursor?: string): Promise<SourcePage>;
  listZip(source: SourceRef, maxDepth: number): Promise<ZipCatalog>;
  contentHash(source: SourceRef): Promise<string>;
  materialize(bundle: AssetBundle): Promise<MaterializedBundle>;
  releaseMaterialization(materializationId: string): Promise<void>;
  writeManagedBundle(bundle: AssetBundle, destinationPath: string[]): Promise<WriteBundleResult>;
  deleteMembers(members: SourceRef[]): Promise<void>;
}

export function sourceDisplayPath(source: SourceRef): string {
  return source.kind === 'zip-entry' ? source.entryPath : source.displayPath;
}
