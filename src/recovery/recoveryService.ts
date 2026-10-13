import type{LibraryDb}from'../db/libraryDb';
export interface RecoveryState{failedJobs:number;resumableJobs:number;unavailableAssets:number;needsAttention:boolean}
const resumable=new Set(['queued','materializing','inspecting','thumbnailing']);
export async function checkRecoveryState(db:LibraryDb):Promise<RecoveryState>{const jobs=await db.jobs.toArray(),assets=await db.assets.toArray();const failedJobs=jobs.filter(j=>j.state==='failed').length,resumableJobs=jobs.filter(j=>resumable.has(j.state)).length,unavailableAssets=assets.filter(a=>a.sourceAvailable===false).length;return{failedJobs,resumableJobs,unavailableAssets,needsAttention:failedJobs+resumableJobs+unavailableAssets>0}}
