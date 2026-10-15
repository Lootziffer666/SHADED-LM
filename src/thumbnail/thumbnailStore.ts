import type{LibraryDb}from'../db/libraryDb';
import type{ThumbnailRecord}from'../domain/library';

export class ThumbnailStore{
 constructor(private db:LibraryDb){}
 async put(assetId:string,fingerprint:string,blob:Blob):Promise<ThumbnailRecord>{const id=`thumb:${assetId}:${fingerprint}`,key=`thumbnail-blob:${id}`,record:ThumbnailRecord={id,assetId,fingerprint,storageRef:`dexie:${key}`,width:256,height:256,generatedAt:Date.now()};await this.db.transaction('rw',this.db.settings,this.db.thumbnails,async()=>{await this.db.settings.put({key,value:blob});await this.db.thumbnails.put(record)});return record}
 async getBlob(record:ThumbnailRecord):Promise<Blob|undefined>{const key=record.storageRef.replace(/^dexie:/,'');const value=(await this.db.settings.get(key))?.value;return value instanceof Blob?value:undefined}
 async createObjectUrl(record:ThumbnailRecord):Promise<string|undefined>{const blob=await this.getBlob(record);return blob?URL.createObjectURL(blob):undefined}
 async remove(record:ThumbnailRecord):Promise<void>{const key=record.storageRef.replace(/^dexie:/,'');await this.db.transaction('rw',this.db.settings,this.db.thumbnails,async()=>{await this.db.settings.delete(key);await this.db.thumbnails.delete(record.id)})}
}
