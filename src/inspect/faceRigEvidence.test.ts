import {describe,expect,it} from 'vitest';
import {evaluateFaceRig} from './faceRigEvidence';

describe('evaluateFaceRig',()=>{
  it('keeps unnamed morph targets as tentative face evidence',()=>{
    const result=evaluateFaceRig(['morph_0','morph_1'],[]);
    expect(result.state).toBe('face?');
    expect(result.confidence).toBeLessThan(0.7);
  });
  it('recognizes named facial shapes with jaw and eye bones as a face rig',()=>{
    const result=evaluateFaceRig(['jawOpen','mouthSmileLeft','eyeBlinkRight'],['Jaw','Eye_L','Eye_R']);
    expect(result.state).toBe('face-rig');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.evidence).toContain('jaw-control');
  });
});
