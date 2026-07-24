import { execFile } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { promisify } from 'node:util';
import type { RcClient } from '../rclone/rcClient';
import { checkFuseAvailability } from './fuseCheck';
import type { MountStatus } from '@shared/ipc-types';

const execFileAsync = promisify(execFile);

export interface MountPaths {
  drivePoint: string;
  photosPoint: string;
}

const VFS_CACHE_MODE_WRITES = 'writes';

/**
 * Owns the FUSE mount lifecycle for the `icloud:` (Drive) and `icloud:Photos`
 * (read-only Photos) remotes, driven through rclone's rc `mount/*` endpoints.
 */
export class MountManager {
  private driveMounted = false;
  private photosMounted = false;

  constructor(
    private readonly rc: RcClient,
    private readonly paths: MountPaths,
  ) {
    mkdirSync(this.paths.drivePoint, { recursive: true });
    mkdirSync(this.paths.photosPoint, { recursive: true });
  }

  async mountAll(): Promise<MountStatus> {
    const fuse = await checkFuseAvailability();
    if (!fuse.available) {
      return { driveMounted: false, photosMounted: false, fuseAvailable: false, error: fuse.reason };
    }

    await this.forceUnmountStale(this.paths.drivePoint);
    await this.forceUnmountStale(this.paths.photosPoint);

    try {
      await this.rc.call('mount/mount', {
        fs: 'icloud:',
        mountPoint: this.paths.drivePoint,
        vfsOpt: { CacheMode: VFS_CACHE_MODE_WRITES },
      });
      this.driveMounted = true;
    } catch (err) {
      return {
        driveMounted: false,
        photosMounted: false,
        fuseAvailable: true,
        error: `Failed to mount iCloud Drive: ${(err as Error).message}`,
      };
    }

    try {
      await this.rc.call('mount/mount', {
        fs: 'icloud:Photos',
        mountPoint: this.paths.photosPoint,
        vfsOpt: { CacheMode: 'off', ReadOnly: true },
        mountOpt: { ReadOnly: true },
      });
      this.photosMounted = true;
    } catch (err) {
      // Photos mount is best-effort for v1 — Drive still works without it.
      console.warn(`[MountManager] Photos mount failed: ${(err as Error).message}`);
    }

    return { driveMounted: this.driveMounted, photosMounted: this.photosMounted, fuseAvailable: true };
  }

  async unmountAll(): Promise<void> {
    if (this.driveMounted) {
      await this.tryUnmount(this.paths.drivePoint);
      this.driveMounted = false;
    }
    if (this.photosMounted) {
      await this.tryUnmount(this.paths.photosPoint);
      this.photosMounted = false;
    }
  }

  getDriveMountPoint(): string {
    return this.paths.drivePoint;
  }

  getPhotosMountPoint(): string {
    return this.paths.photosPoint;
  }

  async getStatus(): Promise<MountStatus> {
    const fuse = await checkFuseAvailability();
    return { driveMounted: this.driveMounted, photosMounted: this.photosMounted, fuseAvailable: fuse.available, error: fuse.reason };
  }

  private async tryUnmount(mountPoint: string): Promise<void> {
    try {
      await this.rc.call('mount/unmount', { mountPoint });
    } catch {
      await this.forceUnmountStale(mountPoint);
    }
  }

  /** Defensively unmounts a leftover mountpoint from a previous crashed session. */
  private async forceUnmountStale(mountPoint: string): Promise<void> {
    for (const bin of ['fusermount3', 'fusermount']) {
      try {
        await execFileAsync(bin, ['-u', mountPoint]);
        return;
      } catch {
        // try next binary / ignore if not actually mounted
      }
    }
  }
}
