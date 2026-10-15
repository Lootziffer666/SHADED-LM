import{Box3,Mesh,SkinnedMesh,Texture,Vector3,type AnimationClip,type Material,type Object3D}from'three';
import type{InspectionRecord}from'../domain/library';
import{inspectAnimations}from'./animationInspection';
import{evaluateFaceRig}from'./faceRigEvidence';

export interface InspectableSession{root:Object3D;animations:AnimationClip[]}
const materialsOf=(m:Material|Material[])=>Array.isArray(m)?m:[m];

export function inspectScene(session:InspectableSession):InspectionRecord{
 let meshCount=0,skinnedMeshCount=0,vertexCount=0,triangleCount=0,uvSetCount=0,hasNormals=false,hasTangents=false;
 const materials=new Set<Material>(),textures=new Set<Texture>(),skeletons=new Set<unknown>(),bones=new Set<string>(),morphs=new Set<string>();
 session.root.updateMatrixWorld(true);
 session.root.traverse(object=>{
   if(!(object instanceof Mesh))return;meshCount++;if(object instanceof SkinnedMesh){skinnedMeshCount++;skeletons.add(object.skeleton);for(const bone of object.skeleton.bones)bones.add(bone.name||bone.uuid)}
   const geometry=object.geometry;const position=geometry.getAttribute('position');if(position)vertexCount+=position.count;triangleCount+=geometry.index?Math.floor(geometry.index.count/3):position?Math.floor(position.count/3):0;
   const uvKeys=Object.keys(geometry.attributes).filter(k=>/^uv\d*$/i.test(k));uvSetCount=Math.max(uvSetCount,uvKeys.length);hasNormals ||= !!geometry.getAttribute('normal');hasTangents ||= !!geometry.getAttribute('tangent');
   if(object.morphTargetDictionary)for(const name of Object.keys(object.morphTargetDictionary))morphs.add(name);
   for(const material of materialsOf(object.material)){materials.add(material);for(const value of Object.values(material as unknown as Record<string,unknown>))if(value instanceof Texture)textures.add(value)}
 });
 const box=new Box3().setFromObject(session.root),size=new Vector3();if(box.isEmpty())size.set(0,0,0);else box.getSize(size);
 const clips=inspectAnimations(session.animations);const boneNames=[...bones],morphTargetNames=[...morphs];
 return{meshCount,skinnedMeshCount,vertexCount,triangleCount,materialCount:materials.size,textureCount:textures.size,textured:textures.size>0,skeletonCount:skeletons.size,boneCount:boneNames.length,boneNames,morphTargetCount:morphTargetNames.length,morphTargetNames,faceRig:evaluateFaceRig(morphTargetNames,boneNames),animated:clips.length>0,clipCount:clips.length,clips,bounds:{x:size.x,y:size.y,z:size.z},uvSetCount,hasNormals,hasTangents};
}
