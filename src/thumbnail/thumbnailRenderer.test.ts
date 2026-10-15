import{describe,expect,it}from'vitest';
import{fitDistanceForBounds}from'./thumbnailRenderer';

describe('fitDistanceForBounds',()=>{
 it('moves the camera farther away for larger assets',()=>{
  expect(fitDistanceForBounds({x:2,y:4,z:1},35,1)).toBeGreaterThan(fitDistanceForBounds({x:1,y:1,z:1},35,1));
 });
 it('never returns a zero or negative distance',()=>{expect(fitDistanceForBounds({x:0,y:0,z:0},35,1)).toBeGreaterThan(0)});
});
