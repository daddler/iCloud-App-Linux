import { promises as fs } from 'node:fs';
import { basename, join } from 'node:path';
import type { PhotoAsset } from '@shared/ipc-types';

/**
 * Read-only browsing of iCloud Photos via the dedicated read-only mount
 * (see MountManager.getPhotosMountPoint()). This is deliberately the simpler
 * "Option A" from the plan (reuse the mount + generic directory listing
 * rather than a separate rc `operations/list`-based API) — revisit if a
 * real-account spike shows this doesn't scale to large libraries.
 */
export class PhotosService {
  constructor(private readonly photosMountRoot: string) {}

  async listAlbum(album: string): Promise<PhotoAsset[]> {
    const albumDir = join(this.photosMountRoot, album);
    const entries = await fs.readdir(albumDir, { withFileTypes: true });
    const assets: PhotoAsset[] = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const full = join(albumDir, entry.name);
      const st = await fs.stat(full);
      assets.push({
        id: full,
        path: join(album, entry.name),
        filename: entry.name,
        takenAt: st.mtime.toISOString(),
        thumbnailAvailable: false,
      });
    }
    return assets;
  }

  async download(relPaths: string[], destDir: string): Promise<void> {
    await fs.mkdir(destDir, { recursive: true });
    for (const relPath of relPaths) {
      const source = join(this.photosMountRoot, relPath);
      const dest = join(destDir, basename(relPath));
      await fs.copyFile(source, dest);
    }
  }
}
