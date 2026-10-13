import{Capacitor,registerPlugin}from'@capacitor/core';
import type{AssetBundle,SourceRef}from'../domain/library';
import type{GrantState,MaterializedBundle,SourcePage,StorageGateway,TreeGrant,ZipCatalogResult}from'./storageGateway';

interface NativeAssetStoragePlugin{
 chooseTree():Promise<TreeGrant>;
 validateGrant(options:{grantId:string}):Promise<{state:GrantState}>;
 listTreePage(options:{grantId:string;cursor?:string}):Promise<SourcePage>;
 listZip(options:{source:SourceRef;maxDepth:number}):Promise<ZipCatalogResult>;
 materialize(options:{bundle:AssetBundle}):Promise<MaterializedBundle>;
 releaseMaterialization(options:{id:string}):Promise<void>;
}
const NativeStorage=registerPlugin<NativeAssetStoragePlugin>('AssetStorage');
const webUrl=(url:string)=>url.startsWith('file:')?Capacitor.convertFileSrc(url):url;
export class CapacitorStorageGateway implements StorageGateway{
 chooseTree(){return NativeStorage.chooseTree()}
 async validateGrant(grantId:string){return(await NativeStorage.validateGrant({grantId})).state}
 listTreePage(grantId:string,cursor?:string){return NativeStorage.listTreePage({grantId,cursor})}
 listZip(source:SourceRef,maxDepth:number){return NativeStorage.listZip({source,maxDepth})}
 async materialize(bundle:AssetBundle){const m=await NativeStorage.materialize({bundle});return{...m,primaryUrl:webUrl(m.primaryUrl),memberUrls:Object.fromEntries(Object.entries(m.memberUrls).map(([k,v])=>[k,webUrl(v)]))}}
 releaseMaterialization(id:string){return NativeStorage.releaseMaterialization({id})}
}
