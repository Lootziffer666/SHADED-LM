import type { PrimaryFormat, SourceRef } from '../domain/library';
import type { SourceEntry, StorageGateway, ZipEntryDescriptor } from '../native/storageGateway';

const SUPPORTED_FORMATS = new Set<PrimaryFormat>(['glb', 'gltf', 'fbx', 'obj']);
const ZIP_EXTENSION = 'zip';
const MAX_ZIP_DEPTH = 3;

export interface DiscoveredSource {
  primaryFormat: PrimaryFormat;
  displayName: string;
  source: SourceRef;
  packName: string | null;
  size: number;
  modifiedAt: number | null;
}

export interface DiscoveryWarning {
  message: string;
  source: SourceRef;
}

export type DiscoveryWarningHandler = (warning: DiscoveryWarning) => void;

export async function discoverSources(
  gateway: StorageGateway,
  grantId: string,
  onWarning?: DiscoveryWarningHandler,
): Promise<DiscoveredSource[]> {
  const discovered: DiscoveredSource[] = [];
  let cursor: string | undefined;

  do {
    const page = await gateway.listTreePage(grantId, cursor);
    for (const entry of page.entries) {
      if (entry.kind !== 'file') continue;

      const extension = extensionOf(entry.relativePath);
      if (extension && SUPPORTED_FORMATS.has(extension as PrimaryFormat)) {
        discovered.push(discoverLooseModel(grantId, entry, extension as PrimaryFormat));
        continue;
      }

      if (extension === ZIP_EXTENSION) {
        const archiveSource: SourceRef = {
          kind: 'saf-document',
          grantId,
          documentId: entry.documentId,
          displayPath: entry.relativePath,
          mimeType: entry.mimeType,
          size: entry.size,
          modifiedAt: entry.modifiedAt,
        };
        const catalog = await gateway.listZip(archiveSource, MAX_ZIP_DEPTH);
        for (const warning of catalog.warnings) {
          onWarning?.({ message: warning, source: archiveSource });
        }
        for (const zipEntry of catalog.entries) {
          const model = discoverZipModel(grantId, entry, zipEntry);
          if (model) discovered.push(model);
        }
      }
    }
    cursor = page.nextCursor;
  } while (cursor);

  return discovered;
}

function discoverLooseModel(
  grantId: string,
  entry: SourceEntry,
  primaryFormat: PrimaryFormat,
): DiscoveredSource {
  return {
    primaryFormat,
    displayName: displayNameOf(entry.name),
    source: {
      kind: 'saf-document',
      grantId,
      documentId: entry.documentId,
      displayPath: entry.relativePath,
      mimeType: entry.mimeType,
      size: entry.size,
      modifiedAt: entry.modifiedAt,
    },
    packName: null,
    size: entry.size,
    modifiedAt: entry.modifiedAt,
  };
}

function discoverZipModel(
  grantId: string,
  archive: SourceEntry,
  entry: ZipEntryDescriptor,
): DiscoveredSource | null {
  if (entry.kind !== 'file') return null;
  const extension = extensionOf(entry.path);
  if (!extension || !SUPPORTED_FORMATS.has(extension as PrimaryFormat)) return null;

  return {
    primaryFormat: extension as PrimaryFormat,
    displayName: displayNameOf(lastPathSegment(entry.path)),
    source: {
      kind: 'zip-entry',
      grantId,
      archiveDocumentId: archive.documentId,
      archiveName: archive.name,
      entryPath: entry.path,
      archiveDepth: entry.archiveDepth,
      size: entry.size,
      modifiedAt: entry.modifiedAt ?? null,
      crc32: entry.crc32,
    },
    packName: packNameForEntry(archive.name, entry.path),
    size: entry.size,
    modifiedAt: entry.modifiedAt ?? null,
  };
}

function extensionOf(path: string): string | null {
  const name = lastPathSegment(path);
  const index = name.lastIndexOf('.');
  return index > -1 ? name.slice(index + 1).toLowerCase() : null;
}

function lastPathSegment(path: string): string {
  const archiveAware = path.split('!/').at(-1) ?? path;
  return archiveAware.split('/').filter(Boolean).at(-1) ?? archiveAware;
}

function displayNameOf(name: string): string {
  const segment = lastPathSegment(name);
  const index = segment.lastIndexOf('.');
  return index > 0 ? segment.slice(0, index) : segment;
}

function packNameForEntry(rootArchiveName: string, entryPath: string): string {
  const nestedArchives = entryPath.split('!/').slice(0, -1);
  const archiveName = nestedArchives.at(-1) ?? rootArchiveName;
  return displayNameOf(lastPathSegment(archiveName));
}
