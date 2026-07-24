import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface FileManagerBookmark {
  path: string;
  label: string;
}

export function getGtkBookmarksPath(): string {
  return join(homedir(), '.config', 'gtk-3.0', 'bookmarks');
}

/**
 * Adds the mounted iCloud folders to the GTK bookmarks file so they show up
 * as pinned locations in the sidebar of Nautilus/Nemo/other GTK-based file
 * managers - the closest Linux equivalent to a drive letter in Windows
 * Explorer. Best-effort: failures (no $HOME, read-only config, ...) are
 * logged and otherwise ignored, since this is a convenience, not a feature
 * anything else depends on.
 */
export function addFileManagerBookmarks(
  bookmarks: FileManagerBookmark[],
  bookmarksPath: string = getGtkBookmarksPath(),
): void {
  if (bookmarks.length === 0) return;
  try {
    mkdirSync(dirname(bookmarksPath), { recursive: true });
    const existingLines = readBookmarkLines(bookmarksPath);
    const existingUris = new Set(existingLines.map((line) => line.split(' ')[0]));
    const newLines = bookmarks
      .filter((b) => !existingUris.has(toUri(b.path)))
      .map((b) => `${toUri(b.path)} ${b.label}`);
    if (newLines.length === 0) return;
    writeFileSync(bookmarksPath, [...existingLines, ...newLines].join('\n') + '\n', 'utf8');
  } catch (err) {
    console.warn(`[fileManagerIntegration] Failed to add file manager bookmarks: ${(err as Error).message}`);
  }
}

/** Removes previously-added bookmarks, e.g. when unmounting or quitting. */
export function removeFileManagerBookmarks(paths: string[], bookmarksPath: string = getGtkBookmarksPath()): void {
  if (paths.length === 0 || !existsSync(bookmarksPath)) return;
  try {
    const uris = new Set(paths.map(toUri));
    const remaining = readBookmarkLines(bookmarksPath).filter((line) => !uris.has(line.split(' ')[0]));
    writeFileSync(bookmarksPath, remaining.length > 0 ? remaining.join('\n') + '\n' : '', 'utf8');
  } catch (err) {
    console.warn(`[fileManagerIntegration] Failed to remove file manager bookmarks: ${(err as Error).message}`);
  }
}

function readBookmarkLines(bookmarksPath: string): string[] {
  if (!existsSync(bookmarksPath)) return [];
  return readFileSync(bookmarksPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function toUri(path: string): string {
  return `file://${path}`;
}
