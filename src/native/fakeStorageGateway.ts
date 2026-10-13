import type { AssetBundle, SourceRef } from '../domain/library';
import type {
  GrantValidation,
  MaterializedBundle,
  SourcePage,
  StorageGateway,
  TreeGrant,
  WriteBundleResult,
  ZipCatalog,
} from './storageGateway';

interface FakeTreePage extends SourcePage {
  cursor?: string;
}

export interface FakeStorageGatewayOptions {
  grant: TreeGrant;
  treePages?: FakeTreePage[];
  zipCatalogs?: Record<string, ZipCatalog>;
  grantValidation?: GrantValidation;
}

export class FakeStorageGateway implements StorageGateway {
  readonly releasedMaterializations: string[] = [];
  readonly deletedSources: SourceRef[][] = [];
  readonly writtenBundles: Array<{ bundleId: string; destinationPath: string[] }> = [];

  private materializationSequence = 0;

  constructor(private readonly options: FakeStorageGatewayOptions) {}

  async chooseTree(): Promise<TreeGrant> {
    return structuredClone(this.options.grant);
  }

  async validateGrant(grantId: string): Promise<GrantValidation> {
    if (grantId !== this.options.grant.grantId) {
      return { valid: false, readable: false, writable: false, reason: 'grant-not-found' };
    }

    return structuredClone(
      this.options.grantValidation ?? { valid: true, readable: true, writable: true },
    );
  }

  async listTreePage(grantId: string, cursor?: string): Promise<SourcePage> {
    const validation = await this.validateGrant(grantId);
    if (!validation.valid || !validation.readable) {
      throw new Error(validation.reason ?? 'grant-unreadable');
    }

    const pages = this.options.treePages ?? [];
    const page = cursor
      ? pages.find((candidate) => candidate.cursor === cursor)
      : pages.find((candidate) => candidate.cursor === undefined) ?? pages[0];

    if (!page) return { entries: [] };

    return {
      entries: structuredClone(page.entries),
      ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
    };
  }

  async listZip(source: SourceRef, maxDepth: number): Promise<ZipCatalog> {
    if (maxDepth < 1) throw new Error('maxDepth must be at least 1');

    const key = source.kind === 'zip-entry' ? source.entryPath : source.displayPath;
    const catalog = this.options.zipCatalogs?.[key];
    if (!catalog) return { entries: [], warnings: [] };

    return structuredClone(catalog);
  }

  async materialize(bundle: AssetBundle): Promise<MaterializedBundle> {
    this.materializationSequence += 1;
    const id = `materialized-${bundle.id}-${this.materializationSequence}`;
    const memberUrls = Object.fromEntries(
      bundle.members.map((member) => [
        member.relativePath,
        `fake://${bundle.id}/${member.relativePath}`,
      ]),
    );

    const primaryUrl = memberUrls[bundle.primaryMember];
    if (!primaryUrl) throw new Error(`Primary member ${bundle.primaryMember} is not in bundle`);

    return { id, bundleId: bundle.id, primaryUrl, memberUrls };
  }

  async releaseMaterialization(materializationId: string): Promise<void> {
    this.releasedMaterializations.push(materializationId);
  }

  async writeManagedBundle(
    bundle: AssetBundle,
    destinationPath: string[],
  ): Promise<WriteBundleResult> {
    this.writtenBundles.push({ bundleId: bundle.id, destinationPath: [...destinationPath] });
    return {
      destinationPath: [...destinationPath],
      writtenMembers: bundle.members.map((member) => ({
        relativePath: member.relativePath,
        documentId: `fake-managed:${destinationPath.join('/')}/${member.relativePath}`,
        size: member.size,
      })),
    };
  }

  async deleteMembers(members: SourceRef[]): Promise<void> {
    this.deletedSources.push(structuredClone(members));
  }
}
