import Dexie, { type Table } from 'dexie';
import type {
  AssetBundle,
  AssetRecord,
  IndexJobRecord,
  LibrarySettingRecord,
  PackRecord,
  ThumbnailRecord,
} from '../domain/library';

export class LibraryDb extends Dexie {
  assets!: Table<AssetRecord, string>;
  bundles!: Table<AssetBundle, string>;
  packs!: Table<PackRecord, string>;
  thumbnails!: Table<ThumbnailRecord, string>;
  jobs!: Table<IndexJobRecord, string>;
  settings!: Table<LibrarySettingRecord, string>;

  constructor(name = 'shaded-lm-library') {
    super(name);

    this.version(1).stores({
      assets: 'id, bundleId, packId, fingerprint, updatedAt, sourceAvailable, *tags, *categoryPath',
      bundles: 'id',
      packs: 'id, name, *assetIds',
      thumbnails: 'id, assetId, fingerprint, generatedAt, [assetId+fingerprint]',
      jobs: 'id, assetId, fingerprint, state, updatedAt',
      settings: 'key',
    });
  }
}

export const libraryDb = new LibraryDb();
