import { describe, expect, it } from 'vitest';
import { INITIAL_CATEGORY_TREE } from './categories';
import {
  deserializeAssetRecord,
  serializeAssetRecord,
  type AssetRecord,
} from './library';

describe('initial category tree', () => {
  it('contains the specified roots and only Unsorted is terminal', () => {
    const expectedRoots = [
      'Characters',
      'Animals',
      'Vegetation',
      'Architecture',
      'Props',
      'Vehicles',
      'Environment',
      'Food',
      'Structures',
      'Effects',
      'Animations',
      'Collections',
      'Unsorted',
    ];

    expect(INITIAL_CATEGORY_TREE.map((node) => node.name)).toEqual(expectedRoots);
    expect(INITIAL_CATEGORY_TREE.find((node) => node.name === 'Unsorted')?.terminal).toBe(true);
    expect(
      INITIAL_CATEGORY_TREE.filter((node) => node.name !== 'Unsorted').every((node) => node.terminal === false),
    ).toBe(true);
  });

  it('keeps Characters root non-terminal and Humans cascaded below it', () => {
    const characters = INITIAL_CATEGORY_TREE.find((node) => node.name === 'Characters');
    const humans = characters?.children?.find((node) => node.name === 'Humans');

    expect(characters?.terminal).toBe(false);
    expect(humans?.terminal).toBe(false);
    expect(humans?.children?.map((node) => node.name)).toEqual([
      'Men',
      'Women',
      'Boys',
      'Girls',
      'Babies',
      'Elderly',
      'Groups',
    ]);
    expect(humans?.children?.every((node) => node.terminal)).toBe(true);
  });
});

describe('AssetRecord serialization', () => {
  it('round-trips SourceRef and inspection metadata without loss', () => {
    const record: AssetRecord = {
      id: 'asset-1',
      displayName: 'Village Woman 03',
      primaryFormat: 'glb',
      primarySourceRef: {
        kind: 'zip-entry',
        grantId: 'grant-1',
        archiveDocumentId: 'doc-zip',
        archiveName: 'medieval_pack.zip',
        entryPath: 'models/characters/woman03.glb',
        archiveDepth: 1,
      },
      bundleId: 'bundle-1',
      categoryPath: ['Unsorted'],
      tags: ['medieval', 'npc'],
      favorite: false,
      packId: 'pack-1',
      thumbnailId: 'thumb-1',
      fingerprint: 'fingerprint-1',
      inspection: {
        meshCount: 3,
        skinnedMeshCount: 2,
        submeshCount: 4,
        vertexCount: 24320,
        triangleCount: 42180,
        bounds: { x: 0.6, y: 1.75, z: 0.4 },
        uvSetCount: 2,
        hasNormals: true,
        hasTangents: true,
        materialCount: 4,
        textureCount: 9,
        textureDimensions: [{ name: 'BaseColor', width: 2048, height: 2048 }],
        largestTexture: { width: 2048, height: 2048 },
        textured: true,
        rigged: true,
        skeletonCount: 1,
        boneCount: 67,
        boneNames: ['Hips', 'Spine', 'Jaw'],
        morphTargetCount: 18,
        morphTargetNames: ['jawOpen', 'eyeBlinkLeft'],
        faceRig: {
          state: 'probable',
          confidence: 0.82,
          probableFacialBoneCount: 3,
          hasJawEvidence: true,
          hasEyeEvidence: true,
          evidence: ['jawOpen', 'eyeBlinkLeft', 'Jaw'],
        },
        animated: true,
        clipCount: 1,
        clips: [{ name: 'Walk', duration: 2.4, trackCount: 12, targets: ['Hips'] }],
        totalAnimationDuration: 2.4,
      },
      sourceAvailable: true,
      createdAt: 1791921600000,
      updatedAt: 1791921600000,
    };

    const restored = deserializeAssetRecord(serializeAssetRecord(record));
    expect(restored).toEqual(record);
  });
});
