import'fake-indexeddb/auto';
import{describe,expect,it}from'vitest';
import{LibraryDb}from'../db/libraryDb';
import type{AssetRecord}from'../domain/library';
import{checkRecoveryState}from'./recoveryService';

const asset=(id:string,sourceAvailable=true):AssetRecord=>({id,displayName:id,primaryFormat:'glb',primarySourceRef:{kind:'saf-document',grantId:'g',documentId:id,name:`${id}.glb`},bundleId:`b:${id}`,categoryPath:['Unsorted'],tags:[],favorite:false,fingerprint:id,sourceAvailable,createdAt:1,updatedAt:1});
describe('checkRecoveryState',()=>{it('aggregates retryable, interrupted and unavailable items without mutating records',async()=>{const db=new LibraryDb(`recovery-${crypto.randomUUID()}`);await db.assets.bulkPut([asset('a',false),asset('b',true)]);await db.jobs.bulkPut([{id:'j1',assetId:'a',fingerprint:'a',state:'failed',error:'bad',updatedAt:1},{id:'j2',assetId:'b',fingerprint:'b',state:'inspecting',updatedAt:2},{id:'j3',assetId:'b',fingerprint:'b2',state:'done',updatedAt:3}]);const before=JSON.stringify(await db.assets.toArray());const state=await checkRecoveryState(db);expect(state.failedJobs).toBe(1);expect(state.resumableJobs).toBe(1);expect(state.unavailableAssets).toBe(1);expect(state.needsAttention).toBe(true);expect(JSON.stringify(await db.assets.toArray())).toBe(before);await db.delete()});it('reports all clear when nothing needs attention',async()=>{const db=new LibraryDb(`recovery-${crypto.randomUUID()}`);expect((await checkRecoveryState(db)).needsAttention).toBe(false);await db.delete()})});
