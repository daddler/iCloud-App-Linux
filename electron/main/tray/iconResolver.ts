import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

/**
 * Resolves the absolute path to the app icon, used for the tray icon and
 * (best-effort) the autostart desktop entry's Icon= field. Mirrors
 * ../rclone/binaryResolver.ts's candidate-path pattern: packaged apps ship
 * it under process.resourcesPath via electron-builder.yml's extraResources,
 * dev runs read it straight from the repo.
 */
export function resolveAppIconPath(): string | undefined {
  const candidates = [
    join(process.resourcesPath ?? '', 'icons', 'icon.png'),
    join(app.getAppPath(), 'resources', 'icons', 'icon.png'),
    join(process.cwd(), 'resources', 'icons', 'icon.png'),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}
