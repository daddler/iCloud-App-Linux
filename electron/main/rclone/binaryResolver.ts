import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

/**
 * Folder names under resources/rclone use Node's/electron-builder's arch
 * naming ("x64", "arm64") directly — NOT the uname-style "x86_64" rclone
 * itself uses for its release filenames — so that electron-builder.yml's
 * `${arch}` extraResources macro (which expands to "x64"/"arm64") lines up
 * with what scripts/fetch-rclone.sh actually wrote to disk.
 */
function archFolder(): string {
  switch (process.arch) {
    case 'x64':
    case 'arm64':
      return process.arch;
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
