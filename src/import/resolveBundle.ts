import type{AssetBundle,BundleMember,ModelFormat,SourceRef}from'../domain/library';
export interface CatalogMember{relativePath:string;source:SourceRef;size?:number}
const modelExt=/\.(glb|gltf|fbx|obj)$/i;const textureExt=/\.(png|jpe?g|webp|tga|bmp|ktx2?)$/i;
const dirname=(p:string)=>p.includes('/')?p.slice(0,p.lastIndexOf('/')):'';const base=(p:string)=>p.slice(p.lastIndexOf('/')+1).replace(/\.[^.]+$/,'');
export function resolveBundle(primary:CatalogMember,catalog:CatalogMember[]):AssetBundle{
 const dir=dirname(primary.relativePath),stem=base(primary.relativePath),ext=primary.relativePath.split('.').pop()!.toLowerCase() as ModelFormat;const members:BundleMember[]=[{...primary,role:'primary'}];
 const local=catalog.filter(x=>x.relativePath!==primary.relativePath&&dirname(x.relativePath)===dir);
 if(ext==='obj'){const mtl=local.find(x=>base(x.relativePath)===stem&&/\.mtl$/i.test(x.relativePath));if(mtl)members.push({...mtl,role:'material'})}
 for(const x of local){if(textureExt.test(x.relativePath))members.push({...x,role:'texture'});else if(ext==='fbx'&&modelExt.test(x.relativePath)&&base(x.relativePath).startsWith(stem+'_'))members.push({...x,role:'animation'})}
 const uniq=[...new Map(members.map(x=>[x.relativePath,x])).values()];return{id:`bundle:${primary.relativePath}`,primaryMember:primary.relativePath,members:uniq,totalBytes:uniq.reduce((n,x)=>n+(x.size??0),0),dependencyWarnings:[]};
}
