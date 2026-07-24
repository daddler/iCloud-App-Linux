import { Menu, Tray, nativeImage, type BrowserWindow } from 'electron';
import { resolveAppIconPath } from './iconResolver';

/**
 * Owns the optional tray icon used for "minimize to tray": when enabled, the
 * main window's `close` is intercepted (see index.ts) to hide instead of
 * quit, and this tray icon becomes the only way back in (or out, via Quit).
 */
export class TrayManager {
  private tray: Tray | null = null;

  constructor(
    private readonly window: BrowserWindow,
    private readonly onQuit: () => void,
  ) {}

  enable(): void {
    if (this.tray) return;

    const iconPath = resolveAppIconPath();
    const icon = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
    this.tray = new Tray(icon);
    this.tray.setToolTip('iCloud Explorer');
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Öffnen', click: () => this.showWindow() },
        { type: 'separator' },
        { label: 'Beenden', click: () => this.onQuit() },
      ]),
    );
    this.tray.on('click', () => this.showWindow());
  }

  disable(): void {
    this.tray?.destroy();
    this.tray = null;
  }

  isEnabled(): boolean {
    return this.tray !== null;
  }

  private showWindow(): void {
    if (this.window.isMinimized()) this.window.restore();
    this.window.show();
    this.window.focus();
  }
}
