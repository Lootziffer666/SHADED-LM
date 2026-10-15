import type{LibraryDb}from'../db/libraryDb';
import type{AssetRecord,IndexJobRecord}from'../domain/library';

export interface QueueSummary{done:number;failed:number;skipped:number}
export type AssetProcessor=(asset:AssetRecord,setPhase:(state:IndexJobRecord['state'])=>Promise<void>)=>Promise<void>;

export class IndexQueue{
 constructor(private db:LibraryDb,private processor:AssetProcessor){}
 async run():Promise<QueueSummary>{
   const jobs=(await this.db.jobs.where('state').equals('queued').toArray()).sort((a,b)=>a.updatedAt-b.updatedAt||a.id.localeCompare(b.id));let done=0,failed=0,skipped=0;
   for(const job of jobs){const asset=await this.db.assets.get(job.assetId);if(!asset){await this.fail(job,'Asset record missing');failed++;continue}
     const setPhase=async(state:IndexJobRecord['state'])=>{await this.db.jobs.update(job.id,{state,updatedAt:Date.now()})};
     try{await setPhase('materializing');await this.processor(asset,setPhase);await setPhase('done');done++}catch(error){await this.fail(job,error instanceof Error?error.message:String(error));failed++}
   }
   return{done,failed,skipped};
 }
 async resume():Promise<QueueSummary>{const transient=await this.db.jobs.filter(j=>j.state==='materializing'||j.state==='inspecting'||j.state==='thumbnailing').toArray();if(transient.length)await this.db.jobs.bulkPut(transient.map(j=>({...j,state:'queued' as const,updatedAt:Date.now()})));return this.run()}
 async retryFailed():Promise<QueueSummary>{const failed=await this.db.jobs.where('state').equals('failed').toArray();if(failed.length)await this.db.jobs.bulkPut(failed.map(j=>({...j,state:'queued' as const,error:undefined,updatedAt:Date.now()})));return this.run()}
 private async fail(job:IndexJobRecord,error:string){await this.db.jobs.update(job.id,{state:'failed',error,updatedAt:Date.now()})}
}
