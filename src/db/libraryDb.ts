import Dexie,{type EntityTable} from 'dexie';
import type {AssetRecord,AssetBundle,PackRecord,ThumbnailRecord,IndexJobRecord} from '../domain/library';
export interface SettingRecord{key:string;value:unknown}
export class LibraryDb extends Dexie{
  assets!:EntityTable<AssetRecord,'id'>;bundles!:EntityTable<AssetBundle,'id'>;packs!:EntityTable<PackRecord,'id'>;thumbnails!:EntityTable<ThumbnailRecord,'id'>;jobs!:EntityTable<IndexJobRecord,'id'>;settings!:EntityTable<SettingRecord,'key'>;
  constructor(name='shaded-lm'){super(name);this.version(1).stores({assets:'id,bundleId,packId,fingerprint,*categoryPath,*tags,updatedAt',bundles:'id,primaryMember',packs:'id,name,*assetIds',thumbnails:'id,assetId,[assetId+fingerprint],fingerprint',jobs:'id,assetId,state,updatedAt',settings:'key'});}
}
export const libraryDb=new LibraryDb();
