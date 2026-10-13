import 'fake-indexeddb/auto';
import{beforeEach,describe,expect,it}from'vitest';
import{LibraryDb}from'../db/libraryDb';
import{queryLibrary}from'./libraryQuery';
import type{AssetRecord,InspectionRecord}from'../domain/library';

const inspect=(animated=false,rigged=false,textured=false):InspectionRecord=>({meshCount:1,skinnedMeshCount:rigged?1:0,vertexCount:12,triangleCount:4,materialCount:1,textureCount:textured?2:0,textured,skeletonCount:rigged?1:0,boneCount:rigged?67:0,boneNames:rigged?['Root']:[],morphTargetCount:0,morphTargetNames:[],faceRig:{state:'none',confidence:0,evidence:[]},animated,clipCount:animated?3:0,clips:[],bounds:{x:1,y:2,z:1},uvSetCount:1,hasNormals:true,hasTangents:false});
const asset=(id:string,over:Partial<AssetRecord>={}):AssetRecord=>({id,displayName:id,primaryFormat:'glb',primarySourceRef:{kind:'saf-document',grantId:'g',documentId:id,name:`${id}.glb`,size:100},bundleId:`b:${id}`,categoryPath:['Unsorted'],tags:[],favorite:false,fingerprint:`fp:${id}`,inspection:inspect(),createdAt:1,updatedAt:1,...over});

describe('queryLibrary',()=>{let db:LibraryDb;beforeEach(async()=>{db=new LibraryDb(`query-${crypto.randomUUID()}`)});
 it('intersects category, pack, manual tag and technical filters',async()=>{
  await db.assets.bulkPut([
   asset('hero',{categoryPath:['Characters','Humans','Men'],packId:'pack:village',tags:['medieval'],inspection:inspect(true,true,true)}),
   asset('prop',{categoryPath:['Props','Tools'],packId:'pack:village',tags:['medieval'],inspection:inspect(false,false,true)}),
   asset('other',{categoryPath:['Characters','Humans','Men'],packId:'pack:other',tags:['medieval'],inspection:inspect(true,true,true)})]);
  const rows=await queryLibrary(db,{categoryPath:['Characters','Humans'],packId:'pack:village',tags:['medieval'],animated:true,rigged:true,textured:true});
  expect(rows.map(r=>r.id)).toEqual(['hero']);
  expect(rows[0]).not.toHaveProperty('primaryUrl');expect(rows[0]).not.toHaveProperty('materializationId');expect(rows[0]).not.toHaveProperty('session');
  await db.delete();
 });
 it('filters favorites and search from cached metadata',async()=>{await db.assets.bulkPut([asset('oak',{displayName:'Old Oak',favorite:true}),asset('pine',{displayName:'Pine'})]);expect((await queryLibrary(db,{query:'oak',favoritesOnly:true})).map(x=>x.id)).toEqual(['oak']);await db.delete()});
});
