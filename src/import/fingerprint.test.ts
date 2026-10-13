import { describe, expect, it, vi } from 'vitest';
import type { AssetBundle, SourceRef } from '../domain/library';
import { fingerprintBundle } from './fingerprint';

function saf(path: string, size: number, modifiedAt: number | null): SourceRef {
  return {
    kind: 'saf-document',
    grantId: 'grant-1',
    documentId: `doc:${path}`,
    displayPath: path,
    size,
    modifiedAt,
  };
}

function zip(path: string, size: number, crc32: number): SourceRef {
  return {
    kind: 'zip-entry',
    grantId: 'grant-1',
    archiveDocumentId: 'archive-1',
    archiveName: 'pack.zip',
    entryPath: path,
    archiveDepth: 1,
    size,
    modifiedAt: null,
    crc32,
  };
}

function bundle(members: Array<{ path: string; source: SourceRef; size: number; modifiedAt?: number | null; crc32?: number | null }>): AssetBundle {
  return {
    id: 'bundle-1',
    primaryMember: members[0]!.path,
    members: members.map((member) => ({
      relativePath: member.path,
      source: member.source,
      size: member.size,
      modifiedAt: member.modifiedAt,
      crc32: member.crc32,
    })),
    totalBytes: members.reduce((sum, member) => sum + member.size, 0),
    dependencyWarnings: [],
  };
}

describe('fingerprintBundle', () => {
  it('is stable for the same loose-file metadata and changes with size or mtime', async () => {
    const hash = vi.fn(async () => 'unused');
    const a = bundle([{ path: 'hero.glb', source: saf('hero.glb', 100, 1234), size: 100, modifiedAt: 1234 }]);
    const b = bundle([{ path: 'hero.glb', source: saf('hero.glb', 100, 1234), size: 100, modifiedAt: 1234 }]);
    const changedSize = bundle([{ path: 'hero.glb', source: saf('hero.glb', 101, 1234), size: 101, modifiedAt: 1234 }]);
    const changedTime = bundle([{ path: 'hero.glb', source: saf('hero.glb', 100, 1235), size: 100, modifiedAt: 1235 }]);

    const fp = await fingerprintBundle(a, hash);
    expect(await fingerprintBundle(b, hash)).toBe(fp);
    expect(await fingerprintBundle(changedSize, hash)).not.toBe(fp);
    expect(await fingerprintBundle(changedTime, hash)).not.toBe(fp);
    expect(hash).not.toHaveBeenCalled();
  });

  it('uses ZIP CRC so changed archive content changes the fingerprint without hashing', async () => {
    const hash = vi.fn(async () => 'unused');
    const original = bundle([{ path: 'model.glb', source: zip('model.glb', 100, 111), size: 100, crc32: 111 }]);
    const changed = bundle([{ path: 'model.glb', source: zip('model.glb', 100, 222), size: 100, crc32: 222 }]);

    expect(await fingerprintBundle(changed, hash)).not.toBe(await fingerprintBundle(original, hash));
    expect(hash).not.toHaveBeenCalled();
  });

  it('hashes only loose members whose modification time is unavailable', async () => {
    const known = saf('model.obj', 100, 2000);
    const unknown = saf('textures/diffuse.png', 50, null);
    const asset = bundle([
      { path: 'model.obj', source: known, size: 100, modifiedAt: 2000 },
      { path: 'textures/diffuse.png', source: unknown, size: 50, modifiedAt: null },
    ]);
    const hash = vi.fn(async (source: SourceRef) =>
      source.kind === 'saf-document' ? `sha:${source.documentId}` : 'zip',
    );

    const fp = await fingerprintBundle(asset, hash);

    expect(fp).toMatch(/^sha256:/);
    expect(hash).toHaveBeenCalledTimes(1);
    expect(hash).toHaveBeenCalledWith(unknown);
  });
});
