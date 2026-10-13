import type{AssetBundle,AssetRecord,PackRecord,SourceRef}from'../domain/library';
import type{LibraryDb}from'../db/libraryDb';
import type{StorageGateway}from'../native/storageGateway';
import{discoverSourceCatalog}from'./discoverSources';
import{resolveBundle}from'./resolveBundle';
import{fingerprintBundle}from'./fingerprint';

export interface IndexSummary{discovered:number;queued:number;unchanged:number;warnings:string[];unavailable?:number}

function sourceIdentity(s:SourceRef):string{return s.kind==='saf-document'?`${s.grantId}:${s.documentId}`:`${sourceIdentity(s.archive)}!${s.entryPath}`}
function sourceGrantId(s:SourceRef):string{return s.kind==='saf-document'?s.grantId:sourceGrantId(s.archive)}
function nameWithoutExt(path:string){const n=path.slice(path.lastIndexOf('/')+1);return n.replace(/\.[^.]+$/,'')}
function archiveIdentity(s:SourceRef):string{return s.kind==='zip-entry'?sourceIdentity(s.archive):sourceIdentity(s)}
function sameBundleShape(a:AssetBundle|undefined,b:AssetBundle){if(!a||a.members.length!==b.members.length)return false;const sig=(x:AssetBundle)=>x.members.map(m=>`${m.role}:${m.size??'?'}:${m.relativePath.slice(m.relativePath.lastIndexOf('/')+1)}`).sort().join('|');return sig(a)===sig(b)}

export async function indexSourceTree(gateway:StorageGateway,db:LibraryDb,grantId:string):Promise<IndexSummary>{
 const grant=await gateway.validateGrant(grantId);
 if(grant!=='available'){
   const affected=(await db.assets.toArray()).filter(a=>sourceGrantId(a.primarySourceRef)===grantId);
   await db.assets.bulkPut(affected.map(a=>({...a,sourceAvailable:false,updatedAt:Date.now()})));
   return{discovered:0,queued:0,unchanged:0,warnings:[`SAF grant ${grantId} is ${grant}`],unavailable:affected.length};
 }
 const discovery=await discoverSourceCatalog(gateway,grantId);let queued=0,unchanged=0;const seen=new Set<string>();const now=Date.now();
 for(const item of discovery.models){
   const identity=sourceIdentity(item.source),alias=(await db.settings.get(`sourceAlias:${identity}`))?.value;
   const id=typeof alias==='string'?alias:`asset:${identity}`;const existing=await db.assets.get(id);seen.add(id);
   const primary={relativePath:item.relativePath,source:item.source,size:item.source.size};const bundle=resolveBundle(primary,item.catalog);bundle.id=existing?.bundleId??`bundle:${identity}`;
   const oldBundle=existing?await db.bundles.get(existing.bundleId):undefined;const candidateFingerprint=fingerprintBundle(bundle);const fingerprint=typeof alias==='string'&&existing&&sameBundleShape(oldBundle,bundle)?existing.fingerprint:candidateFingerprint;
   let packId:string|undefined=existing?.packId;
   if(item.packName){packId=`pack:${archiveIdentity(item.source)}`;const old=await db.packs.get(packId);const pack:PackRecord={id:packId,name:item.packName,sourceArchiveRef:item.source.kind==='zip-entry'?item.source.archive:undefined,assetIds:[...new Set([...(old?.assetIds??[]),id])]};await db.packs.put(pack)}
   const asset:AssetRecord={id,displayName:existing?.displayName??nameWithoutExt(item.relativePath),primaryFormat:item.format,primarySourceRef:item.source,bundleId:bundle.id,categoryPath:existing?.categoryPath??['Unsorted'],tags:existing?.tags??[],favorite:existing?.favorite??false,packId,thumbnailId:existing?.thumbnailId,fingerprint,inspection:existing?.fingerprint===fingerprint?existing.inspection:undefined,sourceAvailable:true,createdAt:existing?.createdAt??now,updatedAt:now};
   await db.bundles.put(bundle);await db.assets.put(asset);
   if(existing?.fingerprint===fingerprint){unchanged++;continue}
   const jobId=`job:${id}:${fingerprint}`;if(!(await db.jobs.get(jobId))){await db.jobs.put({id:jobId,assetId:id,fingerprint,state:'queued',updatedAt:now});queued++}
 }
 const missing=(await db.assets.toArray()).filter(a=>sourceGrantId(a.primarySourceRef)===grantId&&!seen.has(a.id)&&a.sourceAvailable!==false);
 if(missing.length)await db.assets.bulkPut(missing.map(a=>({...a,sourceAvailable:false,updatedAt:now})));
 return{discovered:discovery.models.length,queued,unchanged,warnings:discovery.warnings.map(w=>w.message),unavailable:missing.length};
}
