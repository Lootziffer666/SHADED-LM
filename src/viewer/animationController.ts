import{AnimationClip,AnimationMixer,LoopOnce,LoopRepeat,Object3D}from'three';
export class AnimationController{
 private mixer:AnimationMixer;private clips=new Map<string,AnimationClip>();private action?:ReturnType<AnimationMixer['clipAction']>;private current?:AnimationClip>;playing=false;looping=true;disposed=false;
 constructor(private root:Object3D,clips:AnimationClip[]){this.mixer=new AnimationMixer(root);for(const clip of clips)this.clips.set(clip.name||`Clip ${this.clips.size+1}`,clip);if(clips.length)this.selectClip(clips[0].name||[...this.clips.keys()][0])}
 selectClip(name:string){if(this.disposed)return false;const clip=this.clips.get(name);if(!clip)return false;const wasPlaying=this.playing;this.action?.stop();this.current=clip;this.action=this.mixer.clipAction(clip);this.action.setLoop(this.looping?LoopRepeat:LoopOnce,this.looping?Infinity:1);this.action.clampWhenFinished=!this.looping;this.action.reset();this.action.paused=!wasPlaying;this.action.play();this.playing=wasPlaying;return true}
 play(){if(this.disposed||!this.action)return;this.playing=true;this.action.paused=false;this.action.play()}
 pause(){if(!this.action)return;this.playing=false;this.action.paused=true}
 seek(seconds:number){if(!this.action||!this.current)return;this.action.time=Math.max(0,Math.min(seconds,this.current.duration||0))}
 setLoop(loop:boolean){this.looping=loop;if(this.action){this.action.setLoop(loop?LoopRepeat:LoopOnce,loop?Infinity:1);this.action.clampWhenFinished=!loop}}
 update(deltaSeconds:number){if(!this.disposed&&this.playing)this.mixer.update(Math.max(0,deltaSeconds))}
 get time(){return this.action?.time??0}get duration(){return this.current?.duration??0}get clipName(){return this.current?.name}get clipNames(){return[...this.clips.keys()]}
 dispose(){if(this.disposed)return;this.disposed=true;this.mixer.stopAllAction();for(const clip of this.clips.values())this.mixer.uncacheClip(clip);this.mixer.uncacheRoot(this.root);this.action=undefined;this.current=undefined;this.playing=false}
}
