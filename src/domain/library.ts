export type PrimaryFormat = 'glb' | 'gltf' | 'fbx' | 'obj';

export interface SafDocumentSourceRef {
  kind: 'saf-document';
  grantId: string;
  documentId: string;
  displayPath: string;
  mimeType?: string;
  size?: number;
  modifiedAt?: number | null;
}

export interface ZipEntrySourceRef {
  kind: 'zip-entry';
  grantId: string;
  archiveDocumentId: string;
  archiveName: string;
  entryPath: string;
  archiveDepth: number;
  size?: number;
  modifiedAt?: number | null;
  crc32?: number | null;
}

export type SourceRef = SafDocumentSourceRef | ZipEntrySourceRef;

export interface AssetBundleMember {
  relativePath: string;
  source: SourceRef;
  size: number;
  modifiedAt?: number | null;
  crc32?: number | null;
}

export interface AssetBundle {
  id: string;
  primaryMember: string;
  members: AssetBundleMember[];
  totalBytes: number;
  dependencyWarnings: string[];
}

export interface AnimationClipInspection {
  name: string;
  duration: number;
  trackCount: number;
  targets: string[];
}

export interface TextureDimensionInspection {
  name: string;
  width: number;
  height: number;
  role?: string;
}

export interface FaceRigInspection {
  state: 'none' | 'possible' | 'probable';
  confidence: number;
  probableFacialBoneCount: number;
  hasJawEvidence: boolean;
  hasEyeEvidence: boolean;
  evidence: string[];
}

export interface InspectionRecord {
  meshCount: number;
  skinnedMeshCount: number;
  submeshCount: number;
  vertexCount: number;
  triangleCount: number;
  bounds: { x: number; y: number; z: number };
  uvSetCount: number;
  hasNormals: boolean;
  hasTangents: boolean;
  materialCount: number;
  textureCount: number;
  textureDimensions: TextureDimensionInspection[];
  largestTexture: { width: number; height: number } | null;
  textured: boolean;
  rigged: boolean;
  skeletonCount: number;
  boneCount: number;
  boneNames: string[];
  morphTargetCount: number;
  morphTargetNames: string[];
  faceRig: FaceRigInspection;
  animated: boolean;
  clipCount: number;
  clips: AnimationClipInspection[];
  totalAnimationDuration: number;
}

export interface AssetRecord {
  id: string;
  displayName: string;
  primaryFormat: PrimaryFormat;
  primarySourceRef: SourceRef;
  bundleId: string;
  categoryPath: string[];
  tags: string[];
  favorite: boolean;
  packId: string | null;
  thumbnailId: string | null;
  fingerprint: string;
  inspection: InspectionRecord | null;
  sourceAvailable: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PackRecord {
  id: string;
  name: string;
  sourceArchiveRef: SourceRef | null;
  assetIds: string[];
}

export interface ThumbnailRecord {
  id: string;
  assetId: string;
  fingerprint: string;
  storageRef: string;
  width: number;
  height: number;
  generatedAt: number;
}

export type IndexJobState =
  | 'queued'
  | 'materializing'
  | 'inspecting'
  | 'thumbnailing'
  | 'done'
  | 'failed';

export interface IndexJobRecord {
  id: string;
  assetId: string;
  fingerprint: string;
  state: IndexJobState;
  attempts: number;
  updatedAt: number;
  error: string | null;
}

export interface MoveJournalEntry {
  id: string;
  bundleId: string;
  sourceMembers: SourceRef[];
  destinationPath: string[];
  phase: 'planned' | 'copying' | 'verifying' | 'deleting-source' | 'done' | 'failed';
  verification: { expectedMembers: number; verifiedMembers: number; error?: string };
  createdAt: number;
  updatedAt: number;
}

export interface LibrarySettingRecord {
  key: string;
  value: unknown;
}

export function serializeAssetRecord(record: AssetRecord): string {
  return JSON.stringify(record);
}

export function deserializeAssetRecord(serialized: string): AssetRecord {
  return JSON.parse(serialized) as AssetRecord;
}
