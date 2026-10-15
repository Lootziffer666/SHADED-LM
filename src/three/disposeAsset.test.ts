import{BoxGeometry,Group,Mesh,MeshStandardMaterial,Texture}from'three';
import{describe,expect,it,vi}from'vitest';
import{disposeLoadedAsset}from'./disposeAsset';

describe('disposeLoadedAsset',()=>{
 it('disposes geometry materials and textures',()=>{
  const texture=new Texture(),material=new MeshStandardMaterial({map:texture}),geometry=new BoxGeometry();const root=new Group();root.add(new Mesh(geometry,material));
  const gd=vi.spyOn(geometry,'dispose'),md=vi.spyOn(material,'dispose'),td=vi.spyOn(texture,'dispose');
  disposeLoadedAsset({root,animations:[],objectUrls:[]});
  expect(gd).toHaveBeenCalledOnce();expect(md).toHaveBeenCalledOnce();expect(td).toHaveBeenCalledOnce();
 });
});
