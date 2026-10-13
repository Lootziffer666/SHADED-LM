import {
  Box3,
  type AnimationClip,
  type BufferGeometry,
  type Material,
  type Mesh,
  type Object3D,
  type Skeleton,
  Texture,
  Vector3,
} from 'three';
import type { InspectionRecord, TextureDimensionInspection } from '../domain/library';
import { inspectAnimations } from './animationInspection';
import { detectFaceRigEvidence } from './faceRigEvidence';

const TEXTURE_ROLES = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
  'bumpMap',
  'displacementMap',
  'lightMap',
  'envMap',
] as const;

export function inspectScene(root: Object3D, animations: AnimationClip[]): InspectionRecord {
  root.updateMatrixWorld(true);

  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Map<Texture, TextureDimensionInspection>();
  const skeletons = new Set<Skeleton>();
  const bones = new Set<Object3D>();
  const morphNames = new Set<string>();

  let meshCount = 0;
  let skinnedMeshCount = 0;
  let submeshCount = 0;
  let vertexCount = 0;
  let triangleCount = 0;
  let uvSetCount = 0;
  let hasNormals = false;
  let hasTangents = false;
  let unnamedMorphTargetCount = 0;
  let weightedGeometryEvidence = false;

  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;

    meshCount += 1;
    const geometry = mesh.geometry as BufferGeometry;
    submeshCount += geometry.groups.length > 0 ? geometry.groups.length : 1;

    if (!geometries.has(geometry)) {
      geometries.add(geometry);
      const position = geometry.getAttribute('position');
      vertexCount += position?.count ?? 0;
      triangleCount += Math.floor((geometry.index?.count ?? position?.count ?? 0) / 3);
      uvSetCount = Math.max(uvSetCount, countUvSets(geometry));
      hasNormals ||= Boolean(geometry.getAttribute('normal'));
      hasTangents ||= Boolean(geometry.getAttribute('tangent'));
      weightedGeometryEvidence ||= Boolean(
        geometry.getAttribute('skinIndex') && geometry.getAttribute('skinWeight'),
      );
      unnamedMorphTargetCount = Math.max(
        unnamedMorphTargetCount,
        ...Object.values(geometry.morphAttributes).map((attributes) => attributes?.length ?? 0),
        0,
      );
    }

    for (const material of asMaterialArray(mesh.material)) {
      if (!material || materials.has(material)) continue;
      materials.add(material);
      collectTextures(material, textures);
    }

    const dictionary = mesh.morphTargetDictionary;
    if (dictionary) {
      Object.keys(dictionary).forEach((name) => morphNames.add(name));
    }

    const skinned = mesh as Mesh & { isSkinnedMesh?: boolean; skeleton?: Skeleton };
    if (skinned.isSkinnedMesh) {
      skinnedMeshCount += 1;
      if (skinned.skeleton) {
        skeletons.add(skinned.skeleton);
        skinned.skeleton.bones.forEach((bone) => bones.add(bone));
      }
    }
  });

  const boneNames = [...bones]
    .map((bone) => bone.name)
    .filter(Boolean);
  const morphTargetNames = [...morphNames].sort((a, b) => a.localeCompare(b));
  const faceRig = detectFaceRigEvidence({ morphTargetNames, boneNames });
  const animation = inspectAnimations(animations);
  const textureDimensions = [...textures.values()].sort((a, b) => a.name.localeCompare(b.name));
  const largestTexture = largestDimensions(textureDimensions);
  const bounds = measureBounds(root);

  return {
    meshCount,
    skinnedMeshCount,
    submeshCount,
    vertexCount,
    triangleCount,
    bounds,
    uvSetCount,
    hasNormals,
    hasTangents,
    materialCount: materials.size,
    textureCount: textures.size,
    textureDimensions,
    largestTexture,
    textured: textures.size > 0,
    rigged: skeletons.size > 0 || skinnedMeshCount > 0 || weightedGeometryEvidence,
    skeletonCount: skeletons.size,
    boneCount: bones.size,
    boneNames,
    morphTargetCount: Math.max(morphTargetNames.length, unnamedMorphTargetCount),
    morphTargetNames,
    faceRig,
    animated: animation.animated,
    clipCount: animation.clipCount,
    clips: animation.clips,
    totalAnimationDuration: animation.totalAnimationDuration,
  };
}

function asMaterialArray(material: Material | Material[]): Material[] {
  return Array.isArray(material) ? material : [material];
}

function countUvSets(geometry: BufferGeometry): number {
  return Object.keys(geometry.attributes).filter((name) => /^uv(?:\d+)?$/i.test(name)).length;
}

function collectTextures(
  material: Material,
  textures: Map<Texture, TextureDimensionInspection>,
): void {
  const record = material as unknown as Record<string, unknown>;
  for (const role of TEXTURE_ROLES) {
    const value = record[role];
    if (!(value instanceof Texture) || textures.has(value)) continue;

    const dimensions = textureDimensionsOf(value);
    textures.set(value, {
      name: value.name || role,
      width: dimensions.width,
      height: dimensions.height,
      role,
    });
  }
}

function textureDimensionsOf(texture: Texture): { width: number; height: number } {
  const image = texture.image as { width?: unknown; height?: unknown } | null | undefined;
  return {
    width: typeof image?.width === 'number' && Number.isFinite(image.width) ? image.width : 0,
    height: typeof image?.height === 'number' && Number.isFinite(image.height) ? image.height : 0,
  };
}

function largestDimensions(
  textures: TextureDimensionInspection[],
): { width: number; height: number } | null {
  if (textures.length === 0) return null;
  const largest = textures.reduce((best, candidate) =>
    candidate.width * candidate.height > best.width * best.height ? candidate : best,
  );
  return { width: largest.width, height: largest.height };
}

function measureBounds(root: Object3D): { x: number; y: number; z: number } {
  const box = new Box3().setFromObject(root, true);
  if (box.isEmpty()) return { x: 0, y: 0, z: 0 };
  const size = box.getSize(new Vector3());
  return { x: size.x, y: size.y, z: size.z };
}
