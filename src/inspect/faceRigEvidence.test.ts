import { describe, expect, it } from 'vitest';
import { detectFaceRigEvidence } from './faceRigEvidence';

describe('detectFaceRigEvidence', () => {
  it('does not call generic morph targets a confident face rig', () => {
    const result = detectFaceRigEvidence({
      morphTargetNames: ['SmileShape', 'Corrective_01'],
      boneNames: ['Root', 'Hips', 'Spine'],
    });

    expect(result.state).toBe('possible');
    expect(result.confidence).toBeLessThan(0.65);
    expect(result.hasJawEvidence).toBe(false);
    expect(result.hasEyeEvidence).toBe(false);
  });

  it('recognizes named facial morphs plus jaw and eye controls as probable face rig', () => {
    const result = detectFaceRigEvidence({
      morphTargetNames: [
        'eyeBlinkLeft',
        'eyeBlinkRight',
        'jawOpen',
        'mouthSmileLeft',
        'browInnerUp',
      ],
      boneNames: ['Hips', 'Head', 'Jaw', 'Eye_L', 'Eye_R', 'Brow_L', 'Brow_R'],
    });

    expect(result.state).toBe('probable');
    expect(result.confidence).toBeGreaterThanOrEqual(0.65);
    expect(result.hasJawEvidence).toBe(true);
    expect(result.hasEyeEvidence).toBe(true);
    expect(result.probableFacialBoneCount).toBeGreaterThanOrEqual(5);
    expect(result.evidence).toEqual(expect.arrayContaining(['morph:jawOpen', 'bone:Jaw']));
  });

  it('returns none when no morph or facial bone evidence exists', () => {
    const result = detectFaceRigEvidence({
      morphTargetNames: [],
      boneNames: ['Root', 'Hips', 'Spine', 'Foot_L', 'Foot_R'],
    });

    expect(result).toMatchObject({
      state: 'none',
      confidence: 0,
      probableFacialBoneCount: 0,
      hasJawEvidence: false,
      hasEyeEvidence: false,
      evidence: [],
    });
  });
});
