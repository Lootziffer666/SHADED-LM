import { Group, LoadingManager, type AnimationClip, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import type { MaterializedBundle } from '../native/storageGateway';
import type { ModelFormat } from '../domain/library';

export interface LoadedAssetSession {
  root: Object3D;
  animations: AnimationClip[];
  objectUrls: string[];
  format: ModelFormat;
  materialized: MaterializedBundle;
}

export interface AdapterResult {
  root: Object3D;
  animations: AnimationClip[];
}

export interface AssetLoaderAdapters {
  loadGltf(bundle: MaterializedBundle, manager: LoadingManager): Promise<AdapterResult>;
  loadFbx(bundle: MaterializedBundle, manager: LoadingManager): Promise<AdapterResult>;
  loadObj(bundle: MaterializedBundle, manager: LoadingManager): Promise<AdapterResult>;
}

const supported = new Set<ModelFormat>(['glb', 'gltf', 'fbx', 'obj']);

function normalizeResourcePath(value: string): string {
  const withoutQuery = value.split(/[?#]/, 1)[0] ?? value;
  let decoded = withoutQuery;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    // Keep malformed-but-loadable URLs unchanged; loaders will report the real failure.
  }
  return decoded.replace(/\\/g, '/').replace(/^\.\//, '');
}

export function detectMaterializedFormat(bundle: MaterializedBundle): ModelFormat {
  const primary = bundle.primaryMember || bundle.relativePaths.find((path) => /\.(glb|gltf|fbx|obj)$/i.test(path));
  if (!primary) throw new Error('Materialized bundle has no primary model path');
  const ext = primary.split('.').pop()?.toLowerCase() as ModelFormat | undefined;
  if (!ext || !supported.has(ext)) throw new Error(`Unsupported primary format: ${ext ?? 'unknown'}`);
  return ext;
}

/** Resolve loader requests against the exact materialized bundle without cross-wiring duplicate basenames. */
export function resolveBundleResourceUrl(requestedUrl: string, bundle: MaterializedBundle): string {
  const wanted = normalizeResourcePath(requestedUrl);
  const entries = Object.entries(bundle.memberUrls);

  const exact = entries.find(([path, url]) => normalizeResourcePath(path) === wanted || normalizeResourcePath(url) === wanted);
  if (exact) return exact[1];

  const suffixMatches = entries.filter(([path]) => {
    const normalizedPath = normalizeResourcePath(path);
    return wanted.endsWith(`/${normalizedPath}`) || wanted === normalizedPath;
  });
  if (suffixMatches.length === 1) return suffixMatches[0]![1];

  const basename = wanted.slice(wanted.lastIndexOf('/') + 1);
  const basenameMatches = entries.filter(([path]) => {
    const normalizedPath = normalizeResourcePath(path);
    return normalizedPath.slice(normalizedPath.lastIndexOf('/') + 1) === basename;
  });
  return basenameMatches.length === 1 ? basenameMatches[0]![1] : requestedUrl;
}

const DEFAULT_ADAPTERS: AssetLoaderAdapters = {
  async loadGltf(bundle, manager) {
    const gltf = await new GLTFLoader(manager).loadAsync(bundle.primaryUrl);
    return { root: gltf.scene, animations: gltf.animations };
  },
  async loadFbx(bundle, manager) {
    const object = await new FBXLoader(manager).loadAsync(bundle.primaryUrl);
    return { root: object, animations: object.animations ?? [] };
  },
  async loadObj(bundle, manager) {
    const loader = new OBJLoader(manager);
    const mtlPath = Object.keys(bundle.memberUrls).find((path) => /\.mtl$/i.test(path));
    if (mtlPath) {
      const creator = await new MTLLoader(manager).loadAsync(bundle.memberUrls[mtlPath]!);
      creator.preload();
      loader.setMaterials(creator);
    }
    const root = await loader.loadAsync(bundle.primaryUrl);
    return { root, animations: [] };
  },
};

export async function loadMaterializedAsset(
  bundle: MaterializedBundle,
  adapters: AssetLoaderAdapters = DEFAULT_ADAPTERS,
): Promise<LoadedAssetSession> {
  const format = detectMaterializedFormat(bundle);
  const manager = new LoadingManager();
  manager.setURLModifier((url) => resolveBundleResourceUrl(url, bundle));

  let loaded: AdapterResult = { root: new Group(), animations: [] };
  if (format === 'glb' || format === 'gltf') loaded = await adapters.loadGltf(bundle, manager);
  else if (format === 'fbx') loaded = await adapters.loadFbx(bundle, manager);
  else if (format === 'obj') loaded = await adapters.loadObj(bundle, manager);

  return {
    ...loaded,
    format,
    materialized: bundle,
    objectUrls: [...new Set(Object.values(bundle.memberUrls).filter((url) => url.startsWith('blob:')))],
  };
}
