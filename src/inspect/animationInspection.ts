import type{AnimationClip}from'three';
import type{AnimationClipInspection}from'../domain/library';

export function inspectAnimations(clips:AnimationClip[]):AnimationClipInspection[]{return clips.map((clip,index)=>({name:clip.name||`Clip ${index+1}`,duration:Number.isFinite(clip.duration)?clip.duration:0,trackCount:clip.tracks.length,targets:[...new Set(clip.tracks.map(track=>track.name.split('.')[0]).filter(Boolean))]}))}
