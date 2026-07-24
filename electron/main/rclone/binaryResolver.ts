import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

/** Maps Node's os.arch() values to the folder names used under resources/rclone. */
function archFolder(): string {
  switch (process.arch) {
    case 'x64':
      return 'x86_64';
    case 'arm64':
      return 'arm64';
    default:
      throw new Error(`Unsupported architecture for bundled rclone: ${process.arch}`);
  }
}

/**
 * Resolves the absolute path to the bundled rclone binary.
 * In packaged apps this lives under process.resourcesPath (extraResources,
 * outside the asar archive so it stays executable). In dev it lives under
 * resources/rclone/<arch>/rclone, fetched by scripts/fetch-rclone.sh.
 */
export function resolveRcloneBinaryPath(): string {
  const arch = archFolder();
  const candidates = [
    join(process.resourcesPath ?? '', 'rclone', arch, 'rclone'),
    join(app.getAppPath(), 'resources', 'rclone', arch, 'rclone'),
    join(process.cwd(), 'resources', 'rclone', arch, 'rclone'),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      `Bundled rclone binary not found for arch "${arch}". Checked: ${candidates.join(', ')}. ` +
        'Run "npm run prebuild:rclone" to fetch it.',
    );
  }
  return found;
}
