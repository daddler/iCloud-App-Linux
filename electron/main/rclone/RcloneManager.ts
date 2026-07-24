import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createServer } from 'node:net';
import { resolveRcloneBinaryPath } from './binaryResolver';
import { RcClient } from './rcClient';

/** Finds a free ephemeral TCP port by briefly binding to port 0. */
async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const { port } = address;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error('Could not determine a free port')));
      }
    });
  });
}

export interface RcloneManagerOptions {
  configPath: string;
  configPass: string;
}

/**
 * Owns a single long-lived `rclone rcd` child process for the lifetime of the app.
 * The rc HTTP control API is bound to a random localhost port with a random
 * per-launch user/pass so no other local process can reach it.
 */
export class RcloneManager {
  private process: ChildProcessWithoutNullStreams | null = null;
  private client: RcClient | null = null;
  private startPromise: Promise<void> | null = null;

  constructor(private readonly opts: RcloneManagerOptions) {}

  async start(): Promise<void> {
    if (this.startPromise) return this.startPromise;
    this.startPromise = this.doStart();
    return this.startPromise;
  }

  private async doStart(): Promise<void> {
    const binaryPath = resolveRcloneBinaryPath();
    const port = await findFreePort();
    const user = randomBytes(12).toString('hex');
    const pass = randomBytes(24).toString('hex');

    const child = spawn(
      binaryPath,
      [
        'rcd',
        `--rc-addr=127.0.0.1:${port}`,
        `--rc-user=${user}`,
        `--rc-pass=${pass}`,
        `--config=${this.opts.configPath}`,
        '--rc-no-auth=false',
      ],
      {
        env: {
          ...process.env,
          RCLONE_CONFIG_PASS: this.opts.configPass,
        },
        stdio: 'pipe',
      },
    );

    this.process = child;
    this.client = new RcClient({ baseUrl: `http://127.0.0.1:${port}`, user, pass });

    child.stderr.on('data', (chunk: Buffer) => {
      console.error(`[rclone] ${chunk.toString().trim()}`);
    });

    await this.waitUntilHealthy();
  }

  private async waitUntilHealthy(attempts = 30, delayMs = 200): Promise<void> {
    for (let i = 0; i < attempts; i += 1) {
      try {
        await this.client?.call('core/version');
        return;
      } catch {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw new Error('rclone rcd did not become healthy in time');
  }

  getClient(): RcClient {
    if (!this.client) {
      throw new Error('RcloneManager has not been started yet');
    }
    return this.client;
  }

  async shutdown(): Promise<void> {
    if (!this.process) return;
    try {
      await this.client?.call('core/quit');
    } catch {
      // Process may already be unresponsive; fall through to a hard kill.
    }
    await new Promise<void>((resolve) => {
      if (!this.process) return resolve();
      const child = this.process;
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        resolve();
      }, 3000);
      child.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    this.process = null;
    this.client = null;
    this.startPromise = null;
  }
}
