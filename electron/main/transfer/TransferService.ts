import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { WebContents } from 'electron';
import type { RcClient } from '../rclone/rcClient';
import type { TransferProgress } from '@shared/ipc-types';

interface FileTask {
  sourceAbsPath: string;
  destAbsPath: string;
}

/**
 * Handles copy-in transfers (e.g. drag & drop from outside the app) by
 * streaming files directly onto the FUSE mount with plain Node `fs` calls.
 * rclone's VFS layer (mounted with --vfs-cache-mode writes) picks up the
 * writes and uploads them to iCloud in the background — this service does
 * not talk to the iCloud API directly.
 *
 * Progress is reported in two phases:
 *   "copying"   — our own byte counters while streaming onto the mount
 *   "uploading" — derived from rclone rc `core/stats` while pending
 *                 uploads (vfs writes not yet flushed) are still in flight
 */
export class TransferService {
  constructor(
    private readonly rc: RcClient,
    private readonly getWebContents: () => WebContents | null,
  ) {}

  async copyIn(sourceAbsPaths: string[], destAbsDir: string): Promise<{ jobId: string }> {
    const jobId = randomUUID();
    void this.runCopyJob(jobId, sourceAbsPaths, destAbsDir);
    return { jobId };
  }

  private emit(progress: TransferProgress): void {
    this.getWebContents()?.send('transfer:progress', progress);
  }

  private async runCopyJob(jobId: string, sourceAbsPaths: string[], destAbsDir: string): Promise<void> {
    try {
      const tasks = await this.planTasks(sourceAbsPaths, destAbsDir);
      const bytesTotal = await totalSize(tasks);
      let bytesDone = 0;

      for (const task of tasks) {
        this.emit({ jobId, phase: 'copying', bytesDone, bytesTotal, currentFile: basename(task.sourceAbsPath) });
        await copyWithProgress(task, (delta) => {
          bytesDone += delta;
          this.emit({ jobId, phase: 'copying', bytesDone, bytesTotal, currentFile: basename(task.sourceAbsPath) });
        });
      }

      this.emit({ jobId, phase: 'uploading', bytesDone: bytesTotal, bytesTotal });
      await this.waitForVfsFlush();

      this.emit({ jobId, phase: 'done', bytesDone: bytesTotal, bytesTotal });
    } catch (err) {
      this.emit({ jobId, phase: 'error', bytesDone: 0, bytesTotal: 0, error: (err as Error).message });
    }
  }

  /** Expands directories in the source list into individual file copy tasks, resolving name collisions. */
  private async planTasks(sourceAbsPaths: string[], destAbsDir: string): Promise<FileTask[]> {
    const tasks: FileTask[] = [];
    for (const source of sourceAbsPaths) {
      const st = await fs.stat(source);
      if (st.isDirectory()) {
        for await (const file of walk(source)) {
          const rel = file.slice(source.length);
          tasks.push({ sourceAbsPath: file, destAbsPath: await uniqueDest(join(destAbsDir, basename(source), rel)) });
        }
      } else {
        tasks.push({ sourceAbsPath: source, destAbsPath: await uniqueDest(join(destAbsDir, basename(source))) });
      }
    }
    return tasks;
  }

  /** Polls rclone's stats until there are no pending VFS writes left to upload. */
  private async waitForVfsFlush(attempts = 60, delayMs = 1000): Promise<void> {
    for (let i = 0; i < attempts; i += 1) {
      try {
        const stats = await this.rc.call<{ transferring?: unknown[] }>('core/stats');
        if (!stats.transferring || stats.transferring.length === 0) return;
      } catch {
        return; // best-effort; don't block "done" forever if stats aren't available
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function totalSize(tasks: FileTask[]): Promise<number> {
  let sum = 0;
  for (const task of tasks) {
    sum += (await fs.stat(task.sourceAbsPath)).size;
  }
  return sum;
}

async function copyWithProgress(task: FileTask, onBytes: (delta: number) => void): Promise<void> {
  await fs.mkdir(dirname(task.destAbsPath), { recursive: true });
  await new Promise<void>((resolvePromise, reject) => {
    const readStream = createReadStream(task.sourceAbsPath);
    const writeStream = createWriteStream(task.destAbsPath);
    readStream.on('data', (chunk: string | Buffer) => onBytes(Buffer.byteLength(chunk)));
    readStream.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', () => resolvePromise());
    readStream.pipe(writeStream);
  });
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

/** Renames on collision to match Explorer/Finder convention: "file.txt" -> "file (1).txt". */
async function uniqueDest(destAbsPath: string): Promise<string> {
  let candidate = destAbsPath;
  let counter = 1;
  const dot = destAbsPath.lastIndexOf('.');
  const base = dot > 0 ? destAbsPath.slice(0, dot) : destAbsPath;
  const ext = dot > 0 ? destAbsPath.slice(dot) : '';
  while (true) {
    try {
      await fs.access(candidate);
      candidate = `${base} (${counter})${ext}`;
      counter += 1;
    } catch {
      return candidate;
    }
  }
}
