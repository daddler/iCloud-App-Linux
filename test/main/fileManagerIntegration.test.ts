import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addFileManagerBookmarks, removeFileManagerBookmarks } from '../../electron/main/integration/fileManagerIntegration';

let testDir: string;
let bookmarksPath: string;

describe('fileManagerIntegration', () => {
  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'file-manager-integration-test-'));
    bookmarksPath = join(testDir, 'gtk-3.0', 'bookmarks');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates the bookmarks file and adds entries when none exists yet', () => {
    addFileManagerBookmarks([{ path: '/home/user/mount/drive', label: 'iCloud Drive' }], bookmarksPath);

    expect(readFileSync(bookmarksPath, 'utf8')).toBe('file:///home/user/mount/drive iCloud Drive\n');
  });

  it('preserves existing bookmarks and does not duplicate an already-present entry', () => {
    mkdirSync(join(testDir, 'gtk-3.0'), { recursive: true });
    writeFileSync(bookmarksPath, 'file:///home/user/Other Other\n', 'utf8');

    addFileManagerBookmarks(
      [
        { path: '/home/user/Other', label: 'Other' },
        { path: '/home/user/mount/photos', label: 'iCloud Fotos' },
      ],
      bookmarksPath,
    );

    const lines = readFileSync(bookmarksPath, 'utf8').trim().split('\n');
    expect(lines).toEqual(['file:///home/user/Other Other', 'file:///home/user/mount/photos iCloud Fotos']);
  });

  it('removes only the requested bookmarks, leaving unrelated entries intact', () => {
    mkdirSync(join(testDir, 'gtk-3.0'), { recursive: true });
    writeFileSync(
      bookmarksPath,
      'file:///home/user/mount/drive iCloud Drive\nfile:///home/user/Other Other\n',
      'utf8',
    );

    removeFileManagerBookmarks(['/home/user/mount/drive'], bookmarksPath);

    expect(readFileSync(bookmarksPath, 'utf8')).toBe('file:///home/user/Other Other\n');
  });

  it('is a no-op when removing from a bookmarks file that does not exist', () => {
    expect(() => removeFileManagerBookmarks(['/home/user/mount/drive'], bookmarksPath)).not.toThrow();
  });
});
