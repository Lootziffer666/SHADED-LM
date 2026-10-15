import{Box3,PerspectiveCamera,Vector3}from'three';
import{describe,expect,it}from'vitest';
import{fitCameraToBox}from'./cameraController';

describe('fitCameraToBox',()=>{
 for(const size of [.001,1.8,10000])it(`fits finite camera distance for size ${size}`,()=>{const camera=new PerspectiveCamera(45,9/16,.01,1000),box=new Box3(new Vector3(-size/2,0,-size/2),new Vector3(size/2,size,size/2));const fit=fitCameraToBox(camera,box);expect(Number.isFinite(fit.distance)).toBe(true);expect(fit.distance).toBeGreaterThan(0);expect(camera.near).toBeGreaterThan(0);expect(camera.far).toBeGreaterThan(camera.near)})
});
