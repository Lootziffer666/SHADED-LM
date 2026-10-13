import { describe, expect, it } from 'vitest';
import {
  AnimationClip,
  Bone,
  BufferGeometry,
  DataTexture,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  QuaternionKeyframeTrack,
  RGBAFormat,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  VectorKeyframeTrack,
} from 'three';
import { inspectScene } from './sceneInspection';

describe('inspectScene', () => {
  it('extracts geometry, materials, textures, rig, face rig and animation metadata in one pass', () => {
    const root = new Group();

    const staticGeometry = new BufferGeometry();
    staticGeometry.setAttribute(
      'position',
      new Float32BufferAttribute([
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
        0, 1, 0,
      ], 3),
    );
    staticGeometry.setAttribute(
      'normal',
      new Float32BufferAttribute([
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
      ], 3),
    );
    staticGeometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    staticGeometry.setAttribute('uv1', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    staticGeometry.setAttribute(
      'tangent',
      new Float32BufferAttribute([
        1, 0, 0, 1,
        1, 0, 0, 1,
        1, 0, 0, 1,
        1, 0, 0, 1,
      ], 4),
    );
    staticGeometry.setIndex([0, 1, 2, 0, 2, 3]);
    staticGeometry.addGroup(0, 3, 0);
    staticGeometry.addGroup(3, 3, 1);

    const baseColor = new DataTexture(new Uint8Array(2 * 2 * 4), 2, 2, RGBAFormat);
    baseColor.name = 'Body_BaseColor';
    const normal = new DataTexture(new Uint8Array(4 * 4 * 4), 4, 4, RGBAFormat);
    normal.name = 'Body_Normal';

    const bodyMaterial = new MeshStandardMaterial({ map: baseColor });
    const detailMaterial = new MeshStandardMaterial({ normalMap: normal });
    root.add(new Mesh(staticGeometry, [bodyMaterial, detailMaterial]));

    const skinnedGeometry = new BufferGeometry();
    skinnedGeometry.setAttribute(
      'position',
      new Float32BufferAttribute([
        0, 0, 0,
        0.5, 2, 0,
        1, 0, 0,
      ], 3),
    );
    skinnedGeometry.setAttribute(
      'normal',
      new Float32BufferAttribute([
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
      ], 3),
    );
    skinnedGeometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 0.5, 1, 1, 0], 2));
    skinnedGeometry.setAttribute('skinIndex', new Uint16BufferAttribute([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], 4));
    skinnedGeometry.setAttribute('skinWeight', new Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
    skinnedGeometry.setIndex([0, 1, 2]);
    skinnedGeometry.morphAttributes.position = [
      new Float32BufferAttribute([0, 0, 0, 0, 0.05, 0, 0, 0, 0], 3),
      new Float32BufferAttribute([0, 0, 0, 0.02, 0, 0, 0, 0, 0], 3),
    ];

    const skinnedMaterial = new MeshStandardMaterial({ map: baseColor });
    const skinned = new SkinnedMesh(skinnedGeometry, skinnedMaterial);
    skinned.name = 'CharacterBody';
    skinned.morphTargetDictionary = { jawOpen: 0, eyeBlinkLeft: 1 };
    skinned.morphTargetInfluences = [0, 0];

    const hips = namedBone('Hips');
    const spine = namedBone('Spine');
    const head = namedBone('Head');
    const jaw = namedBone('Jaw');
    const eyeL = namedBone('Eye_L');
    const eyeR = namedBone('Eye_R');
    const browL = namedBone('Brow_L');
    hips.add(spine);
    spine.add(head);
    head.add(jaw, eyeL, eyeR, browL);
    skinned.add(hips);
    skinned.bind(new Skeleton([hips, spine, head, jaw, eyeL, eyeR, browL]));
    root.add(skinned);

    const animations = [
      new AnimationClip('Walk', 2.4, [
        new VectorKeyframeTrack('Hips.position', [0, 1], [0, 0, 0, 0, 0.1, 0]),
        new QuaternionKeyframeTrack(
          'Jaw.quaternion',
          [0, 1],
          [0, 0, 0, 1, 0, 0, 0, 1],
        ),
      ]),
    ];

    const result = inspectScene(root, animations);

    expect(result).toMatchObject({
      meshCount: 2,
      skinnedMeshCount: 1,
      submeshCount: 3,
      vertexCount: 7,
      triangleCount: 3,
      uvSetCount: 2,
      hasNormals: true,
      hasTangents: true,
      materialCount: 3,
      textureCount: 2,
      largestTexture: { width: 4, height: 4 },
      textured: true,
      rigged: true,
      skeletonCount: 1,
      boneCount: 7,
      morphTargetCount: 2,
      morphTargetNames: ['eyeBlinkLeft', 'jawOpen'],
      animated: true,
      clipCount: 1,
      totalAnimationDuration: 2.4,
    });
    expect(result.bounds.x).toBeCloseTo(1);
    expect(result.bounds.y).toBeCloseTo(2);
    expect(result.bounds.z).toBeCloseTo(0);
    expect(result.boneNames).toEqual(expect.arrayContaining(['Hips', 'Spine', 'Head', 'Jaw', 'Eye_L', 'Eye_R', 'Brow_L']));
    expect(result.faceRig.state).toBe('probable');
    expect(result.faceRig.hasJawEvidence).toBe(true);
    expect(result.faceRig.hasEyeEvidence).toBe(true);
    expect(result.clips[0]).toEqual({
      name: 'Walk',
      duration: 2.4,
      trackCount: 2,
      targets: ['Hips', 'Jaw'],
    });
    expect(result.textureDimensions).toEqual(
      expect.arrayContaining([
        { name: 'Body_BaseColor', width: 2, height: 2, role: 'map' },
        { name: 'Body_Normal', width: 4, height: 4, role: 'normalMap' },
      ]),
    );
  });

  it('reports an empty static scene without inventing technical capabilities', () => {
    const result = inspectScene(new Group(), []);

    expect(result).toMatchObject({
      meshCount: 0,
      skinnedMeshCount: 0,
      submeshCount: 0,
      vertexCount: 0,
      triangleCount: 0,
      bounds: { x: 0, y: 0, z: 0 },
      uvSetCount: 0,
      hasNormals: false,
      hasTangents: false,
      materialCount: 0,
      textureCount: 0,
      largestTexture: null,
      textured: false,
      rigged: false,
      skeletonCount: 0,
      boneCount: 0,
      boneNames: [],
      morphTargetCount: 0,
      morphTargetNames: [],
      faceRig: { state: 'none', confidence: 0 },
      animated: false,
      clipCount: 0,
      clips: [],
      totalAnimationDuration: 0,
    });
  });
});

function namedBone(name: string): Bone {
  const bone = new Bone();
  bone.name = name;
  return bone;
}
