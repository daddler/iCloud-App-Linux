import { promises as fs } from 'node:fs';
import { extname, join } from 'node:path';
import type { DirEntry, FileStat, RecentEntry, StorageUsage } from '@shared/ipc-types';

const DOCUMENT_EXTENSIONS = new Set([
  '.doc',
  '.docx',
  '.pdf',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.pages',
  '.numbers',
  '.key',
  '.csv',
  '.odt',
  '.rtf',
]);

const MEDIA_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.heic',
  '.webp',
  '.mp3',
  '.mp4',
  '.mov',
  '.wav',
  '.m4a',
  '.avi',
  '.mkv',
]);

/**
 * Wraps plain Node `fs` calls scoped to a mount root (the FUSE mountpoint for
 * `icloud:`), with strict path-containment checks so the renderer can never
 * escape the mount root (e.g. via `..` segments).
 */
export class FsBridge {
  constructor(private readonly mountRoot: string) {}

  /**
   * Resolves a relative path against the mount root using a manual segment
   * stack, rejecting any ".." that would pop above the root outright rather
   * than silently clamping it (e.g. path.resolve/normalize would silently
   * turn "../../etc" into the harmless-but-surprising "<root>/etc").
   */
  private resolveSafe(relPath: string): string {
    const stack: string[] = [];
    for (const segment of relPath.split('/')) {
      if (segment === '' || segment === '.') continue;
      if (segment === '..') {
        if (stack.length === 0) {
          throw new Error(`Path escapes mount root: ${relPath}`);
        }
        stack.pop();
        continue;
      }
      stack.push(segment);
    }
    return join(this.mountRoot, ...stack);
  }

  async readdir(relPath: string): Promise<DirEntry[]> {
    const dirAbs = this.resolveSafe(relPath);
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });
    const results: DirEntry[] = [];
    for (const entry of entries) {
      const entryAbs = join(dirAbs, entry.name);
      const st = await fs.stat(entryAbs);
      results.push({
        name: entry.name,
        path: join(relPath, entry.name),
        kind: entry.isDirectory() ? 'directory' : 'file',
        size: st.size,
        modifiedAt: st.mtime.toISOString(),
      });
    }
    return results;
  }

  async stat(relPath: string): Promise<FileStat> {
    const abs = this.resolveSafe(relPath);
    const st = await fs.stat(abs);
    return {
      path: relPath,
      kind: st.isDirectory() ? 'directory' : 'file',
      size: st.size,
      modifiedAt: st.mtime.toISOString(),
    };
  }

  async mkdir(relPath: string): Promise<void> {
    await fs.mkdir(this.resolveSafe(relPath), { recursive: true });
  }

  async rename(fromRel: string, toRel: string): Promise<void> {
    await fs.rename(this.resolveSafe(fromRel), this.resolveSafe(toRel));
  }

  async remove(relPath: string, recursive: boolean): Promise<void> {
    await fs.rm(this.resolveSafe(relPath), { recursive, force: false });
  }

  /** Resolves a relative path to its absolute on-disk (mount) location, for use by shell.openPath etc. */
  toAbsolutePath(relPath: string): string {
    return this.resolveSafe(relPath);
  }

  /** Recursively walks every file under the mount root, depth-first. Directories themselves are not yielded. */
  private async *walkFiles(dirAbs: string, dirRel: string): AsyncGenerator<DirEntry> {
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });
    for (const entry of entries) {
      const entryAbs = join(dirAbs, entry.name);
      const entryRel = join(dirRel, entry.name);
      if (entry.isDirectory()) {
        yield* this.walkFiles(entryAbs, entryRel);
        continue;
      }
      const st = await fs.stat(entryAbs);
      yield { name: entry.name, path: entryRel, kind: 'file', size: st.size, modifiedAt: st.mtime.toISOString() };
    }
  }

  /** Recent files across the whole Drive tree, most recently modified first. */
  async listRecent(limit: number): Promise<RecentEntry[]> {
    const all: RecentEntry[] = [];
    for await (const file of this.walkFiles(this.mountRoot, '/')) {
      all.push({ name: file.name, path: file.path, size: file.size, modifiedAt: file.modifiedAt });
    }
    all.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    return all.slice(0, limit);
  }

  /** Real, computed usage of the Drive mount by category (no iCloud account quota is available via rclone). */
  async storageUsage(): Promise<StorageUsage> {
    const usage: StorageUsage = { totalBytes: 0, documentsBytes: 0, mediaBytes: 0, otherBytes: 0 };
    for await (const file of this.walkFiles(this.mountRoot, '/')) {
      usage.totalBytes += file.size;
      const ext = extname(file.name).toLowerCase();
      if (DOCUMENT_EXTENSIONS.has(ext)) usage.documentsBytes += file.size;
      else if (MEDIA_EXTENSIONS.has(ext)) usage.mediaBytes += file.size;
      else usage.otherBytes += file.size;
    }
    return usage;
  }
}
