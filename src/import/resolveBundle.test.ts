import { describe, expect, it } from 'vitest';
import type { SourceRef } from '../domain/library';
import type { DiscoveredSource } from './discoverSources';
import { resolveBundle, type BundleCatalogMember } from './resolveBundle';

function saf(path: string, size = 10): SourceRef {
  return {
    kind: 'saf-document',
    grantId: 'grant-1',
    documentId: `doc:${path}`,
    displayPath: path,
    size,
    modifiedAt: 1,
  };
}

function member(path: string, size = 10): BundleCatalogMember {
  return { relativePath: path, source: saf(path, size), size, modifiedAt: 1 };
}

function discovered(path: string, format: DiscoveredSource['primaryFormat']): DiscoveredSource {
  const filename = path.split('/').at(-1)!;
  return {
    primaryFormat: format,
    displayName: filename.replace(/\.[^.]+$/, ''),
    source: saf(path),
    packName: null,
    size: 10,
    modifiedAt: 1,
  };
}

describe('resolveBundle', () => {
  it('keeps OBJ, same-directory MTL and local texture subtree together', () => {
    const source = discovered('Characters/Knight/knight.obj', 'obj');
    const catalog = [
      member('Characters/Knight/knight.obj', 100),
      member('Characters/Knight/knight.mtl', 20),
      member('Characters/Knight/textures/body.png', 30),
      member('Characters/Knight/textures/body_normal.jpg', 40),
      member('Characters/Other/textures/body.png', 999),
      member('README.txt', 5),
    ];

    const bundle = resolveBundle(source, catalog);

    expect(bundle.primaryMember).toBe('Characters/Knight/knight.obj');
    expect(bundle.members.map((item) => item.relativePath)).toEqual([
      'Characters/Knight/knight.obj',
      'Characters/Knight/knight.mtl',
      'Characters/Knight/textures/body.png',
      'Characters/Knight/textures/body_normal.jpg',
    ]);
    expect(bundle.totalBytes).toBe(190);
  });

  it('keeps FBX with external textures only inside its local asset subtree', () => {
    const source = discovered('Characters/Hero/hero.fbx', 'fbx');
    const catalog = [
      member('Characters/Hero/hero.fbx', 100),
      member('Characters/Hero/textures/hero_diffuse.png', 20),
      member('Characters/Hero/textures/hero_normal.png', 30),
      member('Characters/Other/textures/hero_diffuse.png', 999),
    ];

    const bundle = resolveBundle(source, catalog);

    expect(bundle.members.map((item) => item.relativePath)).toEqual([
      'Characters/Hero/hero.fbx',
      'Characters/Hero/textures/hero_diffuse.png',
      'Characters/Hero/textures/hero_normal.png',
    ]);
  });

  it('keeps a standalone animation FBX valid with one member', () => {
    const source = discovered('Animations/run.fbx', 'fbx');
    const catalog = [
      member('Animations/run.fbx', 50),
      member('Characters/Hero/hero.fbx', 100),
    ];

    const bundle = resolveBundle(source, catalog);

    expect(bundle.members).toHaveLength(1);
    expect(bundle.members[0]?.relativePath).toBe('Animations/run.fbx');
    expect(bundle.dependencyWarnings).toEqual([]);
  });

  it('never cross-wires duplicate texture basenames from sibling ZIP directories', () => {
    const primary: SourceRef = {
      kind: 'zip-entry',
      grantId: 'grant-1',
      archiveDocumentId: 'pack-doc',
      archiveName: 'pack.zip',
      entryPath: 'A/model.obj',
      archiveDepth: 1,
      size: 100,
      crc32: 1,
    };
    const source: DiscoveredSource = {
      primaryFormat: 'obj',
      displayName: 'model',
      source: primary,
      packName: 'pack',
      size: 100,
      modifiedAt: null,
    };
    const zip = (path: string, size: number, crc32: number): SourceRef => ({
      kind: 'zip-entry',
      grantId: 'grant-1',
      archiveDocumentId: 'pack-doc',
      archiveName: 'pack.zip',
      entryPath: path,
      archiveDepth: 1,
      size,
      crc32,
    });
    const catalog: BundleCatalogMember[] = [
      { relativePath: 'A/model.obj', source: primary, size: 100, crc32: 1 },
      { relativePath: 'A/model.mtl', source: zip('A/model.mtl', 10, 2), size: 10, crc32: 2 },
      { relativePath: 'A/textures/diffuse.png', source: zip('A/textures/diffuse.png', 20, 3), size: 20, crc32: 3 },
      { relativePath: 'B/textures/diffuse.png', source: zip('B/textures/diffuse.png', 999, 4), size: 999, crc32: 4 },
    ];

    const bundle = resolveBundle(source, catalog);

    expect(bundle.members.map((item) => item.relativePath)).toEqual([
      'A/model.obj',
      'A/model.mtl',
      'A/textures/diffuse.png',
    ]);
  });
});
