import type{LibraryDb}from'../db/libraryDb';
import type{StorageGateway}from'../native/storageGateway';
import type{AssetProcessor}from'./indexQueue';
import{loadMaterializedAsset,type LoadedAssetSession}from'../three/loadMaterializedAsset';
import{disposeLoadedAsset}from'../three/disposeAsset';
import{inspectScene}from'../inspect/inspectScene';
import{renderFallbackThumbnail,renderThumbnail}from'../thumbnail/thumbnailRenderer';
import{ThumbnailStore}from'../thumbnail/thumbnailStore';

export function makeAssetProcessor(db:LibraryDb,gateway:StorageGateway,thumbnailStore=new ThumbnailStore(db)):AssetProcessor{return async(asset,setPhase)=>{
 const bundle=await db.bundles.get(asset.bundleId);if(!bundle)throw new Error(`Bundle not found: ${asset.bundleId}`);const materialized=await gateway.materialize(bundle);let session:LoadedAssetSession|undefined;
 try{session=await loadMaterializedAsset(materialized);await setPhase('inspecting');const inspection=inspectScene(session);await setPhase('thumbnailing');let blob:Blob;try{blob=inspection.meshCount?await renderThumbnail(session,{width:256,height:256}):await renderFallbackThumbnail('ANIM')}catch{blob=await renderFallbackThumbnail(asset.primaryFormat.toUpperCase())}const thumbnail=await thumbnailStore.put(asset.id,asset.fingerprint,blob);await db.assets.update(asset.id,{inspection,thumbnailId:thumbnail.id,updatedAt:Date.now(),sourceAvailable:true})}
 finally{if(session)disposeLoadedAsset(session);await gateway.releaseMaterialization(materialized.id)}
}}
