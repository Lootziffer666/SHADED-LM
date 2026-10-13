import type {
  AssetBundle,
  AssetBundleMember,
  PrimaryFormat,
  SourceRef,
} from '../domain/library';
import type { DiscoveredSource } from './discoverSources';

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'tga',
  'bmp',
  'gif',
  'ktx',
  'ktx2',
  'dds',
]);

const LOCAL_TEXTURE_DIRECTORIES = new Set(['textures', 'texture', 'maps', 'materials']);

export interface BundleCatalogMember {
  relativePath: string;
  source: SourceRef;
  size: number;
  modifiedAt?: number | null;
  crc32?: number | null;
}

export interface AssetBundleCandidate extends AssetBundle {
  primaryFormat: PrimaryFormat;
  packName: string | null;
}

export function resolveBundle(
  source: DiscoveredSource,
  catalog: BundleCatalogMember[],
): AssetBundleCandidate {
  const primaryPath = normalizePath(sourcePath(source.source));
  const normalizedCatalog = catalog.map((member) => ({
    ...member,
    relativePath: normalizePath(member.relativePath),
  }));

  const primaryFromCatalog = normalizedCatalog.find(
    (member) => samePath(member.relativePath, primaryPath),
  );
  const primaryMember = primaryFromCatalog ?? sourceAsCatalogMember(source, primaryPath);
  const baseDir = dirname(primaryPath);
  const stem = filenameStem(primaryPath);

  const selected = normalizedCatalog.filter((member) => {
    if (samePath(member.relativePath, primaryPath)) return true;
    return isDependency(source.primaryFormat, member.relativePath, baseDir, stem);
  });

  if (!selected.some((member) => samePath(member.relativePath, primaryPath))) {
    selected.unshift(primaryMember);
  } else {
    const primaryIndex = selected.findIndex((member) => samePath(member.relativePath, primaryPath));
    if (primaryIndex > 0) {
      const [primary] = selected.splice(primaryIndex, 1);
      if (primary) selected.unshift(primary);
    }
  }

  const members: AssetBundleMember[] = selected.map((member) => ({
    relativePath: member.relativePath,
    source: member.source,
    size: member.size,
    modifiedAt: member.modifiedAt,
    crc32: member.crc32,
  }));

  return {
    id: `bundle:${sourceIdentity(source.source)}`,
    primaryMember: primaryPath,
    members,
    totalBytes: members.reduce((sum, member) => sum + member.size, 0),
    dependencyWarnings: [],
    primaryFormat: source.primaryFormat,
    packName: source.packName,
  };
}

function isDependency(
  format: PrimaryFormat,
  candidatePath: string,
  baseDir: string,
  stem: string,
): boolean {
  if (!isWithinBaseDir(candidatePath, baseDir)) return false;

  const extension = extensionOf(candidatePath);
  const candidateDir = dirname(candidatePath);
  const relativeDir = relativeDirectory(candidateDir, baseDir);
  const inLocalTextureArea = isTextureDirectory(relativeDir);
  const sameDirectory = samePath(candidateDir, baseDir);

  if (format === 'obj') {
    if (
      extension === 'mtl' &&
      sameDirectory &&
      filenameStem(candidatePath).toLowerCase() === stem.toLowerCase()
    ) {
      return true;
    }
    return IMAGE_EXTENSIONS.has(extension) && (sameDirectory || inLocalTextureArea);
  }

  if (format === 'fbx') {
    return IMAGE_EXTENSIONS.has(extension) && (sameDirectory || inLocalTextureArea);
  }

  if (format === 'gltf') {
    if (extension === 'bin' && sameDirectory) return true;
    return IMAGE_EXTENSIONS.has(extension) && (sameDirectory || inLocalTextureArea);
  }

  return false;
}

function sourceAsCatalogMember(
  source: DiscoveredSource,
  primaryPath: string,
): BundleCatalogMember {
  return {
    relativePath: primaryPath,
    source: source.source,
    size: source.size,
    modifiedAt: source.modifiedAt,
    crc32: source.source.kind === 'zip-entry' ? source.source.crc32 ?? undefined : undefined,
  };
}

function sourcePath(source: SourceRef): string {
  return source.kind === 'zip-entry' ? source.entryPath : source.displayPath;
}

function sourceIdentity(source: SourceRef): string {
  if (source.kind === 'zip-entry') {
    return `${source.grantId}:${source.archiveDocumentId}:${normalizePath(source.entryPath)}`;
  }
  return `${source.grantId}:${source.documentId}`;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
}

function samePath(a: string, b: string): boolean {
  return normalizePath(a).toLowerCase() === normalizePath(b).toLowerCase();
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf('/');
  return index === -1 ? '' : normalized.slice(0, index);
}

function filenameStem(path: string): string {
  const normalized = normalizePath(path);
  const name = normalized.split('/').at(-1) ?? normalized;
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(0, index) : name;
}

function extensionOf(path: string): string {
  const normalized = normalizePath(path);
  const name = normalized.split('/').at(-1) ?? normalized;
  const index = name.lastIndexOf('.');
  return index > -1 ? name.slice(index + 1).toLowerCase() : '';
}

function isWithinBaseDir(path: string, baseDir: string): boolean {
  const normalizedPath = normalizePath(path).toLowerCase();
  const normalizedBase = normalizePath(baseDir).toLowerCase();
  if (!normalizedBase) return !normalizedPath.includes('/');
  return normalizedPath.startsWith(`${normalizedBase}/`);
}

function relativeDirectory(candidateDir: string, baseDir: string): string {
  const normalizedCandidate = normalizePath(candidateDir);
  const normalizedBase = normalizePath(baseDir);
  if (!normalizedBase) return normalizedCandidate;
  return normalizedCandidate.slice(normalizedBase.length).replace(/^\//, '');
}

function isTextureDirectory(relativeDir: string): boolean {
  if (!relativeDir) return false;
  const firstSegment = normalizePath(relativeDir).split('/')[0]?.toLowerCase();
  return firstSegment ? LOCAL_TEXTURE_DIRECTORIES.has(firstSegment) : false;
}
