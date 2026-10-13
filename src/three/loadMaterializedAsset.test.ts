import { AnimationClip, Group } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { MaterializedBundle } from '../native/storageGateway';
import {
  loadMaterializedAsset,
  resolveBundleResourceUrl,
  type AssetLoaderAdapters,
} from './loadMaterializedAsset';

function materialized(primaryMember: string, memberUrls?: Record<string, string>): MaterializedBundle {
  const urls = memberUrls ?? { [primaryMember]: `file:///tmp/${primaryMember}` };
  return {
    id: 'mat-1',
    bundleId: 'bundle-1',
    primaryMember,
    primaryUrl: urls[primaryMember]!,
    memberUrls: urls,
  };
}

function adapters() {
  const gltfRoot = new Group();
  gltfRoot.name = 'gltf-root';
  const fbxRoot = new Group();
  fbxRoot.name = 'fbx-root';
  const objRoot = new Group();
  objRoot.name = 'obj-root';
  const animation = new AnimationClip('Run', 1, []);

  const value: AssetLoaderAdapters = {
    loadGltf: vi.fn(async () => ({ root: gltfRoot, animations: [animation] })),
    loadFbx: vi.fn(async () => ({ root: fbxRoot, animations: [animation] })),
    loadObj: vi.fn(async () => ({ root: objRoot, animations: [] })),
  };

  return { value, gltfRoot, fbxRoot, objRoot, animation };
}

describe('loadMaterializedAsset', () => {
  it.each([
    ['model.glb', 'gltf', 'loadGltf'],
    ['scene.GLTF', 'gltf', 'loadGltf'],
    ['Hero.FBX', 'fbx', 'loadFbx'],
    ['prop.obj', 'obj', 'loadObj'],
  ] as const)('routes %s through one session shape', async (primaryMember, format, method) => {
    const fake = adapters();
    const bundle = materialized(primaryMember);

    const session = await loadMaterializedAsset(bundle, fake.value);

    expect(session.format).toBe(format);
    expect(session.materialized).toBe(bundle);
    expect(fake.value[method]).toHaveBeenCalledTimes(1);
    expect(session.root).toBe(
      format === 'gltf' ? fake.gltfRoot : format === 'fbx' ? fake.fbxRoot : fake.objRoot,
    );
  });

  it('keeps an animation-only FBX valid even when it has zero renderable meshes', async () => {
    const fake = adapters();
    const session = await loadMaterializedAsset(materialized('Animations/run.fbx'), fake.value);

    let meshes = 0;
    session.root.traverse((node) => {
      if ('isMesh' in node && node.isMesh) meshes += 1;
    });

    expect(meshes).toBe(0);
    expect(session.animations.map((clip) => clip.name)).toEqual(['Run']);
  });

  it('rejects formats outside the V1 contract', async () => {
    const fake = adapters();
    await expect(loadMaterializedAsset(materialized('knight.usdz'), fake.value)).rejects.toThrow(
      'Unsupported primary format: usdz',
    );
  });
});

describe('resolveBundleResourceUrl', () => {
  it('maps exact and full-suffix resource paths to materialized member URLs', () => {
    const bundle = materialized('models/hero.gltf', {
      'models/hero.gltf': 'file:///cache/models/hero.gltf',
      'models/hero.bin': 'file:///cache/models/hero.bin',
      'models/textures/body.png': 'file:///cache/models/textures/body.png',
    });

    expect(resolveBundleResourceUrl('models/textures/body.png', bundle)).toBe(
      'file:///cache/models/textures/body.png',
    );
    expect(resolveBundleResourceUrl('file:///cache/models/hero.bin', bundle)).toBe(
      'file:///cache/models/hero.bin',
    );
  });

  it('does not cross-wire duplicate basenames when the request is ambiguous', () => {
    const bundle = materialized('A/model.obj', {
      'A/model.obj': 'file:///cache/A/model.obj',
      'A/textures/diffuse.png': 'file:///cache/A/textures/diffuse.png',
      'B/textures/diffuse.png': 'file:///cache/B/textures/diffuse.png',
    });

    expect(resolveBundleResourceUrl('diffuse.png', bundle)).toBe('diffuse.png');
    expect(resolveBundleResourceUrl('/cache/A/textures/diffuse.png', bundle)).toBe(
      'file:///cache/A/textures/diffuse.png',
    );
  });
});
