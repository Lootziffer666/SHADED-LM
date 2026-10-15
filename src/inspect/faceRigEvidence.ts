import type{FaceRigInspection}from'../domain/library';

const facial=/(jaw|mouth|lip|eye|blink|brow|cheek|nose|viseme|phoneme|smile|frown|tongue)/i;
const jaw=/jaw/i;const eye=/(^|[_ .-])(eye|eyelid|lid)[_ .-]?/i;

export function evaluateFaceRig(morphNames:string[],boneNames:string[]):FaceRigInspection{
 const evidence:string[]=[];let score=0;
 if(morphNames.length){score+=0.25;evidence.push('morph-targets')}
 const namedMorphs=morphNames.filter(n=>facial.test(n));if(namedMorphs.length){score+=Math.min(0.35,0.12+namedMorphs.length*0.08);evidence.push('facial-morph-names')}
 const facialBones=boneNames.filter(n=>facial.test(n));if(facialBones.length){score+=Math.min(0.2,facialBones.length*0.05);evidence.push('facial-bones')}
 if(boneNames.some(n=>jaw.test(n))){score+=0.15;evidence.push('jaw-control')}
 if(boneNames.filter(n=>eye.test(n)).length>=2){score+=0.15;evidence.push('eye-controls')}
 score=Math.min(1,Number(score.toFixed(3)));
 return{state:score>=0.7?'face-rig':evidence.length?'face?':'none',confidence:score,evidence};
}
