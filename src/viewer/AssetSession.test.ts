import'fake-indexeddb/auto';
import{Group}from'three';
import{describe,expect,it,vi}from'vitest';
import{LibraryDb}from'../db/libraryDb';
import{FakeStorageGateway}from'../native/fakeStorageGateway';
import type{AssetRecord,AssetBundle}from'../domain/library';
import{AssetSession}from'./AssetSession';

const asset:AssetRecord={id:'a',displayName:'Hero',primaryFormat:'glb',primarySourceRef:{kind:'saf-document',grantId:'g',documentId:'a',name:'a.glb'},bundleId:'b',categoryPath:['Unsorted'],tags:[],favorite:false,fingerprint:'fp',createdAt:1,updatedAt:1};
const bundle:AssetBundle={id:'b',primaryMember:'a.glb',members:[{relativePath:'a.glb',source:asset.primarySourceRef,role:'primary'}],totalBytes:0,dependencyWarnings:[]};

describe('AssetSession',()=>{
 it('owns one materialization and releases it exactly once on idempotent dispose',async()=>{const db=new LibraryDb(`viewer-${crypto.randomUUID()}`);await db.assets.put(asset);await db.bundles.put(bundle);const gateway=new FakeStorageGateway();const dispose=vi.fn();const session=await AssetSession.open(db,gateway,'a',{load:async()=>({root:new Group(),animations:[],objectUrls:[]}),dispose});expect(session.asset.id).toBe('a');expect(gateway.released).toEqual([]);await session.dispose();await session.dispose();expect(dispose).toHaveBeenCalledTimes(1);expect(gateway.released).toEqual(['mat:b']);await db.delete()});
 it('releases native materialization when model loading rejects',async()=>{const db=new LibraryDb(`viewer-${crypto.randomUUID()}`);await db.assets.put(asset);await db.bundles.put(bundle);const gateway=new FakeStorageGateway();await expect(AssetSession.open(db,gateway,'a',{load:async()=>{throw new Error('bad model')},dispose:()=>{}})).rejects.toThrow('bad model');expect(gateway.released).toEqual(['mat:b']);await db.delete()});
});
