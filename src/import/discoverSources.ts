import type{ModelFormat,SourceRef}from'../domain/library';
import type{CatalogMember}from'./resolveBundle';
import type{SourceEntry,StorageGateway,ZipCatalogEntry}from'../native/storageGateway';

export interface DiscoveredSource{source:SourceRef;relativePath:string;format:ModelFormat;packName?:string;catalog:CatalogMember[]}
export interface DiscoveryWarning{source?:SourceRef;message:string}
export interface DiscoveryResult{models:DiscoveredSource[];warnings:DiscoveryWarning[]}

const model=/\.(glb|gltf|fbx|obj)$/i;
const zip=/\.zip$/i;
const format=(p:string)=>p.split('.').pop()!.toLowerCase() as ModelFormat;
const toCatalog=(entries:Array<SourceEntry|ZipCatalogEntry>):CatalogMember[]=>entries.filter(e=>!e.directory).map(e=>({relativePath:'relativePath'in e?e.relativePath:e.entryPath,source:e.source,size:e.size}));

export async function discoverSourceCatalog(gateway:StorageGateway,grantId:string):Promise<DiscoveryResult>{
 const loose:SourceEntry[]=[]; const archives:SourceEntry[]=[]; const warnings:DiscoveryWarning[]=[]; let cursor:string|undefined;
 do{const page=await gateway.listTreePage(grantId,cursor);for(const e of page.entries){if(e.directory)continue;(zip.test(e.name)?archives:loose).push(e)}cursor=page.nextCursor}while(cursor);
 const models:DiscoveredSource[]=[]; const looseCatalog=toCatalog(loose);
 for(const e of loose){if(model.test(e.name))models.push({source:e.source,relativePath:e.relativePath,format:format(e.name),catalog:looseCatalog})}
 for(const archive of archives){
   try{const cat=await gateway.listZip(archive.source,3);const packName=archive.name.replace(/\.zip$/i,'');const catalog=toCatalog(cat.entries);for(const z of cat.entries){if(!z.directory&&model.test(z.entryPath))models.push({source:z.source,relativePath:z.entryPath,format:format(z.entryPath),packName,catalog})}for(const message of cat.warnings)warnings.push({source:archive.source,message})}
   catch(error){warnings.push({source:archive.source,message:error instanceof Error?error.message:String(error)})}
 }
 return{models,warnings};
}

export async function discoverSources(gateway:StorageGateway,grantId:string):Promise<DiscoveredSource[]>{return(await discoverSourceCatalog(gateway,grantId)).models}
