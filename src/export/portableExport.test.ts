import'fake-indexeddb/auto';
import{describe,expect,it}from'vitest';
import{LibraryDb}from'../db/libraryDb';
import{FakeStorageGateway}from'../native/fakeStorageGateway';
import type{AssetRecord,AssetBundle}from'../domain/library';
import{exportPortableLibrary}from'./portableExport';

describe('exportPortableLibrary',()=>{it('streams every bundle member preserving dependency-relative paths',async()=>{const db=new LibraryDb(`portable-${crypto.randomUUID()}`),gateway=new FakeStorageGateway();const s=(id:string)=>({kind:'saf-document' as const,grantId:'g',documentId:id,name:id,size:10});const asset:AssetRecord={id:'a',displayName:'Knight',primaryFormat:'obj',primarySourceRef:s('knight.obj'),bundleId:'b',categoryPath:['Characters','Humans','Men'],tags:[],favorite:false,fingerprint:'fp',createdAt:1,updatedAt:1};const bundle:AssetBundle={id:'b',primaryMember:'models/knight.obj',members:[{relativePath:'models/knight.obj',source:s('knight.obj'),role:'primary',size:10},{relativePath:'models/knight.mtl',source:s('knight.mtl'),role:'material',size:3},{relativePath:'models/knight_d.png',source:s('knight_d.png'),role:'texture',size:8}],totalBytes:21,dependencyWarnings:[]};await db.assets.put(asset);await db.bundles.put(bundle);await exportPortableLibrary(db,gateway,['a']);const sourceWrites=gateway.exportWrites.filter(w=>w.source);expect(sourceWrites.map(w=>w.path).sort()).toEqual(['assets/a/models/knight.mtl','assets/a/models/knight.obj','assets/a/models/knight_d.png']);await db.delete()})});
