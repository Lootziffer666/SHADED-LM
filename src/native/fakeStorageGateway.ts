import type{AssetBundle,SourceRef}from'../domain/library';import type{GrantState,MaterializedBundle,SourcePage,StorageGateway,TreeGrant,ZipCatalogResult}from'./storageGateway';
export class FakeStorageGateway implements StorageGateway{
 constructor(public pages:SourcePage[]=[],public zips=new Map<string,ZipCatalogResult>()){}
 released:string[]=[];state:GrantState='available';
 async chooseTree():Promise<TreeGrant>{return{id:'fake',displayName:'Assets',rootDocumentId:'root'}}
 async validateGrant():Promise<GrantState>{return this.state}
 async listTreePage(_grantId:string,cursor?:string){return this.pages[Number(cursor??0)]??{entries:[]}}
 async listZip(source:SourceRef,_maxDepth:number){return this.zips.get(sourceKey(source))??{entries:[],warnings:[]}}
 async materialize(bundle:AssetBundle):Promise<MaterializedBundle>{const urls=Object.fromEntries(bundle.members.map(m=>[m.relativePath,`blob:fake/${m.relativePath}`]));return{id:`mat:${bundle.id}`,primaryUrl:urls[bundle.primaryMember]??'',memberUrls:urls,relativePaths:Object.keys(urls)}}
 async releaseMaterialization(id:string){this.released.push(id)}
}
export function sourceKey(source:SourceRef):string{return source.kind==='saf-document'?`${source.grantId}:${source.documentId}`:`${sourceKey(source.archive)}!${source.entryPath}`}
