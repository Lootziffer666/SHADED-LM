import { describe, expect, it } from 'vitest';
import { INITIAL_CATEGORY_TREE } from './categories';
import type { AssetRecord } from './library';

describe('V1 library domain', () => {
  it('keeps every root non-terminal except Unsorted', () => {
    expect(INITIAL_CATEGORY_TREE.map(x => x.name)).toEqual(['Characters','Animals','Vegetation','Architecture','Props','Vehicles','Environment','Food','Structures','Effects','Animations','Collections','Unsorted']);
    expect(INITIAL_CATEGORY_TREE.find(x => x.name === 'Unsorted')?.terminal).toBe(true);
    expect(INITIAL_CATEGORY_TREE.filter(x => x.name !== 'Unsorted').every(x => !x.terminal)).toBe(true);
  });

  it('round-trips source and inspection metadata losslessly', () => {
    const asset: AssetRecord = {
      id:'a1', displayName:'Bard', primaryFormat:'glb', primarySourceRef:{kind:'zip-entry', archive:{kind:'saf-document', grantId:'g1', documentId:'zip1', name:'pack.zip'}, entryPath:'models/bard.glb', crc32:123},
      bundleId:'b1', categoryPath:['Unsorted'], tags:[], favorite:false, packId:'p1', thumbnailId:'t1', fingerprint:'abc',
      inspection:{meshCount:2,skinnedMeshCount:1,vertexCount:100,triangleCount:50,materialCount:2,textureCount:4,textured:true,skeletonCount:1,boneCount:67,boneNames:['Hips'],morphTargetCount:18,morphTargetNames:['jawOpen'],faceRig:{state:'face-rig',confidence:0.9,evidence:['jaw','eyes']},animated:true,clipCount:3,clips:[{name:'Walk',duration:1.2,trackCount:67,targets:['Hips']}],bounds:{x:1,y:2,z:1},uvSetCount:1,hasNormals:true,hasTangents:false},
      createdAt:1, updatedAt:2
    };
    expect(JSON.parse(JSON.stringify(asset))).toEqual(asset);
  });
});
