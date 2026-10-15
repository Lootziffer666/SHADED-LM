import type{LibraryDb}from'../db/libraryDb';
import type{AssetBundle,AssetRecord,InspectionRecord}from'../domain/library';
import type{StorageGateway}from'../native/storageGateway';
import{disposeLoadedAsset}from'../three/disposeAsset';
import{loadMaterializedAsset,type LoadedAssetSession}from'../three/loadMaterializedAsset';
import{inspectScene}from'../inspect/inspectScene';

export interface AssetSessionDependencies{load:(bundle:Awaited<ReturnType<StorageGateway['materialize']>>)=>Promise<LoadedAssetSession>;dispose:(session:LoadedAssetSession)=>void}
const DEFAULT_DEPS:AssetSessionDependencies={load:loadMaterializedAsset,dispose:disposeLoadedAsset};

export class AssetSession{
 private disposedOnce=false;
 private constructor(public readonly asset:AssetRecord,public readonly bundle:AssetBundle,public readonly inspection:InspectionRecord,public readonly loaded:LoadedAssetSession,private gateway:StorageGateway,private materializationId:string,private deps:AssetSessionDependencies){}
 static async open(db:LibraryDb,gateway:StorageGateway,assetId:string,deps:AssetSessionDependencies=DEFAULT_DEPS):Promise<AssetSession>{const asset=await db.assets.get(assetId);if(!asset)throw new Error(`Asset not found: ${assetId}`);const bundle=await db.bundles.get(asset.bundleId);if(!bundle)throw new Error(`Bundle not found: ${asset.bundleId}`);const materialized=await gateway.materialize(bundle);let loaded:LoadedAssetSession|undefined;try{loaded=await deps.load(materialized);const inspection=asset.inspection??inspectScene(loaded);if(!asset.inspection)await db.assets.update(asset.id,{inspection,updatedAt:Date.now()});return new AssetSession(asset,bundle,inspection,loaded,gateway,materialized.id,deps)}catch(error){if(loaded)deps.dispose(loaded);await gateway.releaseMaterialization(materialized.id);throw error}}
 async dispose():Promise<void>{if(this.disposedOnce)return;this.disposedOnce=true;try{this.deps.dispose(this.loaded)}finally{await this.gateway.releaseMaterialization(this.materializationId)}}
 get disposed(){return this.disposedOnce}
}
