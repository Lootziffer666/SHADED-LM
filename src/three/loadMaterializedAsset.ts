import{Group,LoadingManager,type AnimationClip,type Object3D}from'three';
import{GLTFLoader}from'three/examples/jsm/loaders/GLTFLoader.js';
import{FBXLoader}from'three/examples/jsm/loaders/FBXLoader.js';
import{OBJLoader}from'three/examples/jsm/loaders/OBJLoader.js';
import{MTLLoader}from'three/examples/jsm/loaders/MTLLoader.js';
import type{MaterializedBundle}from'../native/storageGateway';
import type{ModelFormat}from'../domain/library';

export interface LoadedAssetSession{root:Object3D;animations:AnimationClip[];objectUrls:string[];format?:ModelFormat}
const modelExt=/\.(glb|gltf|fbx|obj)$/i;
const norm=(s:string)=>decodeURIComponent(s.split(/[?#]/)[0]).replace(/\\/g,'/');
export function detectMaterializedFormat(bundle:MaterializedBundle):ModelFormat{const primary=Object.entries(bundle.memberUrls).find(([,u])=>u===bundle.primaryUrl)?.[0]??bundle.relativePaths.find(p=>modelExt.test(p));if(!primary)throw new Error('Materialized bundle has no primary model path');const ext=primary.split('.').pop()!.toLowerCase();if(!['glb','gltf','fbx','obj'].includes(ext))throw new Error(`Unsupported model format: ${ext}`);return ext as ModelFormat}
function resolver(memberUrls:Record<string,string>){const entries=Object.entries(memberUrls);return(url:string)=>{const wanted=norm(url);const exact=memberUrls[wanted]??memberUrls[wanted.replace(/^\.\//,'')];if(exact)return exact;const suffix=entries.filter(([path])=>wanted.endsWith(norm(path)));if(suffix.length===1)return suffix[0][1];const base=wanted.slice(wanted.lastIndexOf('/')+1);const sameBase=entries.filter(([path])=>norm(path).slice(norm(path).lastIndexOf('/')+1)===base);return sameBase.length===1?sameBase[0][1]:url}}

export async function loadMaterializedAsset(bundle:MaterializedBundle):Promise<LoadedAssetSession>{
 const format=detectMaterializedFormat(bundle),manager=new LoadingManager();manager.setURLModifier(resolver(bundle.memberUrls));let root:Object3D=new Group(),animations:AnimationClip[]=[];
 if(format==='glb'||format==='gltf'){const gltf=await new GLTFLoader(manager).loadAsync(bundle.primaryUrl);root=gltf.scene;animations=gltf.animations}
 else if(format==='fbx'){const object=await new FBXLoader(manager).loadAsync(bundle.primaryUrl);root=object;animations=object.animations??[]}
 else{const obj=new OBJLoader(manager);const mtlPath=Object.keys(bundle.memberUrls).find(p=>/\.mtl$/i.test(p));if(mtlPath){const creator=await new MTLLoader(manager).loadAsync(bundle.memberUrls[mtlPath]);creator.preload();obj.setMaterials(creator)}root=await obj.loadAsync(bundle.primaryUrl);animations=[]}
 return{root,animations,objectUrls:[...new Set(Object.values(bundle.memberUrls).filter(u=>u.startsWith('blob:')))],format};
}
