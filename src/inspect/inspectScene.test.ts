import {describe,expect,it} from 'vitest';
import {AnimationClip,BoxGeometry,Group,Mesh,MeshStandardMaterial} from 'three';
import {inspectScene} from './inspectScene';

describe('inspectScene',()=>{
  it('extracts geometry material and animation counts without rendering',()=>{
    const root=new Group();
    root.add(new Mesh(new BoxGeometry(2,4,6),new MeshStandardMaterial()));
    const result=inspectScene({root,animations:[new AnimationClip('Idle',2,[])]});
    expect(result.meshCount).toBe(1);
    expect(result.triangleCount).toBe(12);
    expect(result.materialCount).toBe(1);
    expect(result.animated).toBe(true);
    expect(result.clipCount).toBe(1);
    expect(result.bounds).toEqual({x:2,y:4,z:6});
  });
});
