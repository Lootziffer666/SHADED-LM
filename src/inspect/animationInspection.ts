import type { AnimationClip } from 'three';
import type { AnimationClipInspection } from '../domain/library';

export interface AnimationInspectionSummary {
  animated: boolean;
  clipCount: number;
  clips: AnimationClipInspection[];
  totalAnimationDuration: number;
}

export function inspectAnimations(clips: AnimationClip[]): AnimationInspectionSummary {
  const inspected = clips.map<AnimationClipInspection>((clip, index) => ({
    name: clip.name || `Clip ${index + 1}`,
    duration: finiteDuration(clip.duration),
    trackCount: clip.tracks.length,
    targets: uniqueSorted(
      clip.tracks
        .map((track) => targetFromTrackName(track.name))
        .filter((target): target is string => Boolean(target)),
    ),
  }));

  return {
    animated: inspected.length > 0,
    clipCount: inspected.length,
    clips: inspected,
    totalAnimationDuration: inspected.reduce((sum, clip) => sum + clip.duration, 0),
  };
}

export function targetFromTrackName(trackName: string): string | null {
  const boneBinding = trackName.match(/\.bones\[([^\]]+)]/);
  if (boneBinding?.[1]) return boneBinding[1];

  const trimmed = trackName.trim();
  if (!trimmed || trimmed.startsWith('.')) return null;

  const propertyBoundary = trimmed.indexOf('.');
  const target = propertyBoundary >= 0 ? trimmed.slice(0, propertyBoundary) : trimmed;
  return target || null;
}

function finiteDuration(duration: number): number {
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
