import 'fake-indexeddb/auto';
import {beforeEach,describe,expect,it} from 'vitest';
import {LibraryDb} from '../db/libraryDb';
import {FakeStorageGateway} from '../native/fakeStorageGateway';
import {indexSourceTree} from './indexSourceTree';

const doc=(id:string,name:string,size=10)=>({kind:'saf-document' as const,grantId:'g',documentId:id,name,size,modifiedAt:1});

describe('indexSourceTree',()=>{
  let db:LibraryDb;
  beforeEach(async()=>{db=new LibraryDb(`index-${crypto.randomUUID()}`);await db.delete();db=new LibraryDb(`index-${crypto.randomUUID()}`)});
  it('indexes supported models into Unsorted and queues only new fingerprints',async()=>{
    const gateway=new FakeStorageGateway([{entries:[
      {source:doc('a','hero.glb'),name:'hero.glb',relativePath:'hero.glb',size:10,directory:false},
      {source:doc('b','readme.txt'),name:'readme.txt',relativePath:'readme.txt',size:3,directory:false}
    ]}]);
    const first=await indexSourceTree(gateway,db,'g');
    expect(first.discovered).toBe(1); expect(first.queued).toBe(1);
    const asset=await db.assets.toCollection().first();
    expect(asset?.categoryPath).toEqual(['Unsorted']);
    const second=await indexSourceTree(gateway,db,'g');
    expect(second.queued).toBe(0);
    expect((await db.jobs.toArray()).length).toBe(1);
    await db.delete();
  });
});
