import 'fake-indexeddb/auto';
import {afterEach,describe,expect,it} from 'vitest';
import {LibraryDb} from './libraryDb';

describe('LibraryDb',()=>{
  let db:LibraryDb|undefined;
  afterEach(async()=>{if(db){db.close();await db.delete();}});
  it('persists asset bundle pack thumbnail and resumable job',async()=>{
    db=new LibraryDb('test-'+crypto.randomUUID());
    await db.bundles.put({id:'b',primaryMember:'m.glb',members:[],totalBytes:1,dependencyWarnings:[]});
    await db.packs.put({id:'p',name:'Pack',assetIds:['a']});
    await db.assets.put({id:'a',displayName:'A',primaryFormat:'glb',primarySourceRef:{kind:'saf-document',grantId:'g',documentId:'d',name:'m.glb'},bundleId:'b',categoryPath:['Unsorted'],tags:[],favorite:false,packId:'p',thumbnailId:'t',fingerprint:'f',createdAt:1,updatedAt:1});
    await db.thumbnails.put({id:'t',assetId:'a',fingerprint:'f',storageRef:'thumb.webp',width:256,height:256,generatedAt:1});
    await db.jobs.put({id:'j',assetId:'a',fingerprint:'f',state:'thumbnailing',updatedAt:1});
    expect(await db.assets.get('a')).toMatchObject({bundleId:'b',categoryPath:['Unsorted']});
    expect(await db.bundles.get('b')).toBeTruthy();expect(await db.packs.get('p')).toBeTruthy();expect(await db.thumbnails.get('t')).toMatchObject({width:256,height:256});expect(await db.jobs.get('j')).toMatchObject({state:'thumbnailing'});
  });
});
