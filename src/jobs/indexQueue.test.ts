import 'fake-indexeddb/auto';
import {describe,expect,it} from 'vitest';
import {LibraryDb} from '../db/libraryDb';
import {IndexQueue} from './indexQueue';

const asset=(id:string)=>({id,displayName:id,primaryFormat:'glb' as const,primarySourceRef:{kind:'saf-document' as const,grantId:'g',documentId:id,name:`${id}.glb`},bundleId:`b:${id}`,categoryPath:['Unsorted'],tags:[],favorite:false,fingerprint:`fp:${id}`,createdAt:1,updatedAt:1});

describe('IndexQueue',()=>{
  it('processes strictly one asset at a time, persists progress, and isolates failures',async()=>{
    const db=new LibraryDb(`queue-${crypto.randomUUID()}`);
    await db.assets.bulkPut([asset('a'),asset('b'),asset('c')]);
    await db.jobs.bulkPut(['a','b','c'].map(id=>({id:`job:${id}`,assetId:id,fingerprint:`fp:${id}`,state:'queued' as const,updatedAt:1})));
    let active=0,maxActive=0;
    const queue=new IndexQueue(db,async(a)=>{active++;maxActive=Math.max(maxActive,active);await Promise.resolve();active--;if(a.id==='b')throw new Error('broken');});
    const summary=await queue.run();
    expect(maxActive).toBe(1);
    expect(summary.done).toBe(2); expect(summary.failed).toBe(1);
    expect((await db.jobs.get('job:b'))?.state).toBe('failed');
    await db.delete();
  });
});
