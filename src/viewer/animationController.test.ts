import{AnimationClip,Group,NumberKeyframeTrack}from'three';
import{describe,expect,it}from'vitest';
import{AnimationController}from'./animationController';

describe('AnimationController',()=>{
 it('selects clips, clamps seek, toggles loop/play and disposes',()=>{const root=new Group(),clips=[new AnimationClip('Idle',2,[new NumberKeyframeTrack('.rotation[y]',[0,2],[0,1])]),new AnimationClip('Walk',1,[])];const c=new AnimationController(root,clips);expect(c.selectClip('Idle')).toBe(true);c.play();expect(c.playing).toBe(true);c.seek(99);expect(c.time).toBe(2);c.setLoop(false);expect(c.looping).toBe(false);expect(c.selectClip('Walk')).toBe(true);expect(c.duration).toBe(1);c.pause();expect(c.playing).toBe(false);c.dispose();expect(c.disposed).toBe(true)})
});
