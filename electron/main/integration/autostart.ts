import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { app } from 'electron';

const APP_ID = 'com.icloudexplorer.linux';

export function getAutostartDesktopFilePath(): string {
  return join(homedir(), '.config', 'autostart', `${APP_ID}.desktop`);
}

/**
 * The AppImage runtime sets $APPIMAGE to the absolute path of the .AppImage
 * file that was actually executed (see the AppImage spec) - that's the
 * stable, double-click-equivalent command to autostart. Falls back to the
 * running executable for dev/non-AppImage builds, where autostart is mostly
 * only useful for testing the toggle itself.
 */
function resolveExecutablePath(): string {
  return process.env.APPIMAGE ?? app.getPath('exe');
}

export function isAutostartEnabled(desktopFilePath: string = getAutostartDesktopFilePath()): boolean {
  return existsSync(desktopFilePath);
}

export function setAutostartEnabled(
  enabled: boolean,
  desktopFilePath: string = getAutostartDesktopFilePath(),
): void {
  if (!enabled) {
    if (existsSync(desktopFilePath)) unlinkSync(desktopFilePath);
    return;
  }

  mkdirSync(dirname(desktopFilePath), { recursive: true });
  const exec = resolveExecutablePath();
  const contents = [
    '[Desktop Entry]',
    'Type=Application',
    'Name=iCloud Explorer',
    `Exec="${exec}"`,
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    '',
  ].join('\n');
  writeFileSync(desktopFilePath, contents, 'utf8');
}
