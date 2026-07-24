import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { DirEntry, FileStat } from '@shared/ipc-types';

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
}
