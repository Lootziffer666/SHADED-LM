import type{InspectionRecord,ModelFormat}from'../domain/library';
export interface ManifestAssetV1{id:string;displayName:string;format:ModelFormat;bundleId:string;categoryPath:string[];tags:string[];favorite:boolean;packId?:string;thumbnailPath?:string;fingerprint:string;inspection?:InspectionRecord;sourceAvailable:boolean;provenance:{kind:'file'|'zip';name:string;archiveName?:string;entryPath?:string;size?:number}}
export interface ManifestBundleV1{id:string;primaryMember:string;totalBytes:number;members:Array<{relativePath:string;role?:string;size?:number}>;dependencyWarnings:string[]}
export interface ManifestPackV1{id:string;name:string;assetIds:string[]}
export interface ShadedLmLibraryManifestV1{schemaVersion:1;app:'SHADED-LM';assets:ManifestAssetV1[];bundles:ManifestBundleV1[];packs:ManifestPackV1[];categories:Array<{id:string;name:string;path:string[];terminal:boolean;parentId?:string}>}
export interface ExportTarget{id:string;name:string}
export interface ExportResult{targetId:string;files:number;bytes?:number}
export type ExportScope='index'|'portable'|'full'
