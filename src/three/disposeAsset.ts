import{Mesh,Texture,type Material}from'three';
import type{LoadedAssetSession}from'./loadMaterializedAsset';
const materialsOf=(m:Material|Material[])=>Array.isArray(m)?m:[m];
export function disposeLoadedAsset(session:Pick<LoadedAssetSession,'root'|'animations'> & Partial<LoadedAssetSession>):void{
 const disposedTextures=new Set<Texture>(),disposedMaterials=new Set<Material>();
 session.root.traverse(object=>{if(!(object instanceof Mesh))return;object.geometry?.dispose();for(const material of materialsOf(object.material)){if(disposedMaterials.has(material))continue;disposedMaterials.add(material);for(const value of Object.values(material as unknown as Record<string,unknown>)){if(value instanceof Texture&&!disposedTextures.has(value)){disposedTextures.add(value);value.dispose()}}material.dispose()}});
 for(const url of session.objectUrls??[]){try{URL.revokeObjectURL(url)}catch{/* noop */}}
 session.root.clear();
}
