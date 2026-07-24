import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { getPath: () => '/fake/exe/path' },
}));

import { isAutostartEnabled, setAutostartEnabled } from '../../electron/main/integration/autostart';

describe('autostart', () => {
  let testDir: string;
  let desktopFilePath: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'autostart-test-'));
    desktopFilePath = join(testDir, 'autostart', 'com.icloudexplorer.linux.desktop');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('reports disabled when no desktop file exists', () => {
    expect(isAutostartEnabled(desktopFilePath)).toBe(false);
  });

  it('creates a desktop entry pointing at $APPIMAGE when enabled', () => {
    const originalAppimage = process.env.APPIMAGE;
    process.env.APPIMAGE = '/home/user/Applications/iCloud-Explorer.AppImage';
    try {
      setAutostartEnabled(true, desktopFilePath);

      expect(existsSync(desktopFilePath)).toBe(true);
      const contents = readFileSync(desktopFilePath, 'utf8');
      expect(contents).toContain('[Desktop Entry]');
      expect(contents).toContain('Exec="/home/user/Applications/iCloud-Explorer.AppImage"');
      expect(contents).toContain('X-GNOME-Autostart-enabled=true');
      expect(isAutostartEnabled(desktopFilePath)).toBe(true);
    } finally {
      if (originalAppimage === undefined) delete process.env.APPIMAGE;
      else process.env.APPIMAGE = originalAppimage;
    }
  });

  it('falls back to the running executable when $APPIMAGE is unset', () => {
    const originalAppimage = process.env.APPIMAGE;
    delete process.env.APPIMAGE;
    try {
      setAutostartEnabled(true, desktopFilePath);
      expect(readFileSync(desktopFilePath, 'utf8')).toContain('Exec="/fake/exe/path"');
    } finally {
      if (originalAppimage !== undefined) process.env.APPIMAGE = originalAppimage;
    }
  });

  it('removes the desktop entry when disabled', () => {
    setAutostartEnabled(true, desktopFilePath);
    expect(existsSync(desktopFilePath)).toBe(true);

    setAutostartEnabled(false, desktopFilePath);
    expect(existsSync(desktopFilePath)).toBe(false);
  });

  it('is a no-op when disabling and no desktop file exists', () => {
    expect(() => setAutostartEnabled(false, desktopFilePath)).not.toThrow();
  });
});
