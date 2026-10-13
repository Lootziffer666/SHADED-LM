import'fake-indexeddb/auto';
import{describe,expect,it}from'vitest';
import{LibraryDb}from'../db/libraryDb';
import{FakeStorageGateway}from'../native/fakeStorageGateway';
import type{AssetRecord,AssetBundle}from'../domain/library';
import{exportFullBackup}from'./fullBackupExport';

describe('exportFullBackup',()=>{it('includes restore metadata and every managed bundle',async()=>{const db=new LibraryDb(`backup-${crypto.randomUUID()}`),gateway=new FakeStorageGateway();const source={kind:'saf-document' as const,grantId:'g',documentId:'a',name:'a.glb',size:10};const asset:AssetRecord={id:'a',displayName:'A',primaryFormat:'glb',primarySourceRef:source,bundleId:'b',categoryPath:['Unsorted'],tags:['keep'],favorite:true,fingerprint:'fp',createdAt:1,updatedAt:1};const bundle:AssetBundle={id:'b',primaryMember:'a.glb',members:[{relativePath:'a.glb',source,role:'primary',size:10}],totalBytes:10,dependencyWarnings:[]};await db.assets.put(asset);await db.bundles.put(bundle);await db.settings.put({key:'categoryNodesV1',value:[{id:'u',name:'Unsorted',path:['Unsorted'],terminal:true,systemRoot:true,sortOrder:0}]});await exportFullBackup(db,gateway);expect(gateway.exportWrites.some(w=>w.path==='restore.json')).toBe(true);expect(gateway.exportWrites.some(w=>w.path==='assets/a/a.glb'&&!!w.source)).toBe(true);await db.delete()})});
