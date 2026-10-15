import'fake-indexeddb/auto';
import{describe,expect,it}from'vitest';
import{LibraryDb}from'../db/libraryDb';
import{FakeStorageGateway}from'../native/fakeStorageGateway';
import type{AssetRecord,AssetBundle,ThumbnailRecord}from'../domain/library';
import{exportIndex}from'./indexExport';

describe('exportIndex',()=>{it('writes library.json and referenced thumbnails but no model source',async()=>{const db=new LibraryDb(`export-${crypto.randomUUID()}`),gateway=new FakeStorageGateway();const source={kind:'saf-document' as const,grantId:'g',documentId:'a',name:'a.glb',size:10};const asset:AssetRecord={id:'a',displayName:'A',primaryFormat:'glb',primarySourceRef:source,bundleId:'b',categoryPath:['Unsorted'],tags:[],favorite:false,thumbnailId:'t',fingerprint:'fp',createdAt:1,updatedAt:1};const bundle:AssetBundle={id:'b',primaryMember:'a.glb',members:[{relativePath:'a.glb',source,role:'primary',size:10}],totalBytes:10,dependencyWarnings:[]};const thumb:ThumbnailRecord={id:'t',assetId:'a',fingerprint:'fp',storageRef:'dexie:thumbnail-blob:t',width:256,height:256,generatedAt:1};await db.assets.put(asset);await db.bundles.put(bundle);await db.thumbnails.put(thumb);await db.settings.put({key:'thumbnail-blob:t',value:new Blob(['thumb'],{type:'image/webp'})});await exportIndex(db,gateway);expect(gateway.exportWrites.map(w=>w.path).sort()).toEqual(['library.json','thumbnails/a.webp']);expect(gateway.exportWrites.some(w=>w.source)).toBe(false);expect(gateway.finalizedExports).toHaveLength(1);await db.delete()})});
