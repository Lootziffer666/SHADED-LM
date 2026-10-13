import type { FaceRigInspection } from '../domain/library';

export interface FaceRigEvidenceInput {
  morphTargetNames: string[];
  boneNames: string[];
}

const FACIAL_MORPH_PATTERNS = [
  /eye(blink|look|squint|wide|close|open)/,
  /brow/,
  /jaw/,
  /mouth/,
  /lip/,
  /cheek/,
  /nose/,
  /tongue/,
  /viseme/,
  /phoneme/,
  /smile/,
  /frown/,
];

const FACIAL_BONE_PATTERNS = [
  /jaw/,
  /eye/,
  /eyelid/,
  /brow/,
  /lip/,
  /mouth/,
  /cheek/,
  /nose/,
  /tongue/,
  /face/,
];

export function detectFaceRigEvidence(input: FaceRigEvidenceInput): FaceRigInspection {
  const morphEvidence = input.morphTargetNames.filter((name) => isFacialMorph(name));
  const facialBones = input.boneNames.filter((name) => isFacialBone(name));
  const hasAnyMorphTargets = input.morphTargetNames.length > 0;
  const hasJawEvidence =
    input.morphTargetNames.some((name) => normalize(name).includes('jaw')) ||
    input.boneNames.some((name) => normalize(name).includes('jaw'));
  const hasEyeEvidence =
    input.morphTargetNames.some((name) => /eye/.test(normalize(name))) ||
    input.boneNames.some((name) => /(eye|eyelid)/.test(normalize(name)));

  if (!hasAnyMorphTargets && facialBones.length === 0) {
    return {
      state: 'none',
      confidence: 0,
      probableFacialBoneCount: 0,
      hasJawEvidence: false,
      hasEyeEvidence: false,
      evidence: [],
    };
  }

  let confidence = hasAnyMorphTargets ? 0.15 : 0;
  confidence += Math.min(0.25, morphEvidence.length * 0.05);
  confidence += Math.min(0.2, facialBones.length * 0.04);
  if (hasJawEvidence) confidence += 0.15;
  if (hasEyeEvidence) confidence += 0.15;
  if (morphEvidence.some((name) => /(mouth|lip|smile|frown)/.test(normalize(name)))) confidence += 0.05;
  if (morphEvidence.some((name) => /brow/.test(normalize(name)))) confidence += 0.05;

  confidence = Math.min(1, Number(confidence.toFixed(2)));

  const evidence = [
    ...morphEvidence.map((name) => `morph:${name}`),
    ...facialBones.map((name) => `bone:${name}`),
  ];

  return {
    state: confidence >= 0.65 ? 'probable' : 'possible',
    confidence,
    probableFacialBoneCount: facialBones.length,
    hasJawEvidence,
    hasEyeEvidence,
    evidence,
  };
}

function isFacialMorph(name: string): boolean {
  const value = normalize(name);
  return FACIAL_MORPH_PATTERNS.some((pattern) => pattern.test(value));
}

function isFacialBone(name: string): boolean {
  const value = normalize(name);
  return FACIAL_BONE_PATTERNS.some((pattern) => pattern.test(value));
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}
