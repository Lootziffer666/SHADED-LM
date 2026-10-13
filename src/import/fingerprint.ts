import type { AssetBundle, AssetBundleMember, SourceRef } from '../domain/library';

export type SourceContentHasher = (source: SourceRef) => Promise<string>;

export async function fingerprintBundle(
  bundle: AssetBundle,
  hashSource: SourceContentHasher,
): Promise<string> {
  const memberKeys = await Promise.all(
    [...bundle.members]
      .sort((a, b) => normalizePath(a.relativePath).localeCompare(normalizePath(b.relativePath)))
      .map((member) => fingerprintMember(member, hashSource)),
  );

  const canonical = [
    `primary=${normalizePath(bundle.primaryMember)}`,
    `members=${memberKeys.length}`,
    ...memberKeys,
  ].join('\n');

  return `sha256:${await sha256(canonical)}`;
}

async function fingerprintMember(
  member: AssetBundleMember,
  hashSource: SourceContentHasher,
): Promise<string> {
  const path = normalizePath(member.relativePath);
  const size = member.size;

  if (member.source.kind === 'zip-entry') {
    const crc32 = member.crc32 ?? member.source.crc32;
    if (crc32 !== undefined && crc32 !== null) {
      return [
        'zip',
        member.source.archiveDocumentId,
        path,
        `depth=${member.source.archiveDepth}`,
        `size=${size}`,
        `crc32=${crc32}`,
      ].join('|');
    }

    const contentHash = await hashSource(member.source);
    return [
      'zip',
      member.source.archiveDocumentId,
      path,
      `depth=${member.source.archiveDepth}`,
      `size=${size}`,
      `hash=${contentHash}`,
    ].join('|');
  }

  const modifiedAt = member.modifiedAt ?? member.source.modifiedAt;
  if (modifiedAt !== undefined && modifiedAt !== null) {
    return [
      'saf',
      member.source.documentId,
      path,
      `size=${size}`,
      `mtime=${modifiedAt}`,
    ].join('|');
  }

  const contentHash = await hashSource(member.source);
  return [
    'saf',
    member.source.documentId,
    path,
    `size=${size}`,
    `hash=${contentHash}`,
  ].join('|');
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
}
