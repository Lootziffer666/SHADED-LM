import { describe, expect, it } from 'vitest';
import {
  AnimationClip,
  NumberKeyframeTrack,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
} from 'three';
import { inspectAnimations } from './animationInspection';

describe('inspectAnimations', () => {
  it('extracts clip names, durations, track counts and target nodes', () => {
    const walk = new AnimationClip('Walk_Cycle', 2.4, [
      new VectorKeyframeTrack('Hips.position', [0, 1], [0, 0, 0, 0, 0.1, 0]),
      new QuaternionKeyframeTrack(
        'Spine.quaternion',
        [0, 1],
        [0, 0, 0, 1, 0, 0, 0, 1],
      ),
      new QuaternionKeyframeTrack(
        'Spine.quaternion',
        [0, 1],
        [0, 0, 0, 1, 0, 0, 0, 1],
      ),
    ]);
    const blink = new AnimationClip('Blink', 0.25, [
      new NumberKeyframeTrack('Face.morphTargetInfluences[3]', [0, 0.125, 0.25], [0, 1, 0]),
    ]);

    const result = inspectAnimations([walk, blink]);

    expect(result.animated).toBe(true);
    expect(result.clipCount).toBe(2);
    expect(result.totalAnimationDuration).toBeCloseTo(2.65);
    expect(result.clips).toEqual([
      {
        name: 'Walk_Cycle',
        duration: 2.4,
        trackCount: 3,
        targets: ['Hips', 'Spine'],
      },
      {
        name: 'Blink',
        duration: 0.25,
        trackCount: 1,
        targets: ['Face'],
      },
    ]);
  });

  it('recognizes Three bone-binding track names', () => {
    const clip = new AnimationClip('Retargeted', 1, [
      new QuaternionKeyframeTrack(
        '.bones[UpperArm_L].quaternion',
        [0, 1],
        [0, 0, 0, 1, 0, 0, 0, 1],
      ),
      new QuaternionKeyframeTrack(
        '.bones[ForeArm_L].quaternion',
        [0, 1],
        [0, 0, 0, 1, 0, 0, 0, 1],
      ),
    ]);

    expect(inspectAnimations([clip]).clips[0]?.targets).toEqual(['ForeArm_L', 'UpperArm_L']);
  });

  it('returns a zeroed animation summary for static assets', () => {
    expect(inspectAnimations([])).toEqual({
      animated: false,
      clipCount: 0,
      clips: [],
      totalAnimationDuration: 0,
    });
  });
});
