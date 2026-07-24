import { randomUUID } from 'node:crypto';
import { ipcMain, type BrowserWindow } from 'electron';
import type {
  AppPreferences,
  AuthStatus,
  CalendarEvent,
  Contact,
  DirEntry,
  MountStatus,
  PhotoAsset,
  RecentEntry,
  StorageUsage,
} from '@shared/ipc-types';

/**
 * `npm run dev:mock` sets E2E_MOCK_RCLONE=1 to skip real rclone/Apple auth entirely
 * (see electron/main/index.ts), but there was previously no fixture layer behind that
 * flag at all — every window.icloud.* call would reject with "no handler registered".
 * This registers the full IPC surface against small in-memory fixtures instead, so the
 * UI can actually be driven and visually checked without a real iCloud account.
 */

function dir(name: string): DirEntry {
  return { name, path: `/${name}`, kind: 'directory', size: 0, modifiedAt: '2026-01-01T00:00:00.000Z' };
}

function file(path: string, size: number, modifiedAt: string): DirEntry {
  const name = path.split('/').pop()!;
  return { name, path, kind: 'file', size, modifiedAt };
}

const tree: Record<string, DirEntry[]> = {
  '/': [
    dir('Dokumente'),
    dir('Fotos-Backup'),
    file('/Rechnung_2026.pdf', 245_000, '2026-07-20T10:12:00.000Z'),
    file('/Projektplan.docx', 88_000, '2026-07-18T09:00:00.000Z'),
    file('/Budget.xlsx', 34_000, '2026-06-30T15:45:00.000Z'),
    file('/Podcast_Folge12.mp3', 5_400_000, '2026-07-01T08:00:00.000Z'),
    file('/Urlaubsfoto.jpg', 3_100_000, '2026-05-12T18:22:00.000Z'),
  ],
  '/Dokumente': [
    file('/Dokumente/Vertrag.pdf', 190_000, '2026-04-02T11:00:00.000Z'),
    file('/Dokumente/Notizen.txt', 2_100, '2026-07-22T20:15:00.000Z'),
  ],
  '/Fotos-Backup': [file('/Fotos-Backup/IMG_0001.jpg', 2_800_000, '2026-03-14T07:30:00.000Z')],
};

const DOCUMENT_EXT = new Set(['pdf', 'docx', 'doc', 'xlsx', 'xls', 'txt']);
const MEDIA_EXT = new Set(['jpg', 'jpeg', 'png', 'mp3', 'mp4']);

function computeStorageUsage(): StorageUsage {
  const usage: StorageUsage = { totalBytes: 0, documentsBytes: 0, mediaBytes: 0, otherBytes: 0 };
  for (const entries of Object.values(tree)) {
    for (const entry of entries) {
      if (entry.kind !== 'file') continue;
      usage.totalBytes += entry.size;
      const ext = entry.name.split('.').pop()?.toLowerCase() ?? '';
      if (DOCUMENT_EXT.has(ext)) usage.documentsBytes += entry.size;
      else if (MEDIA_EXT.has(ext)) usage.mediaBytes += entry.size;
      else usage.otherBytes += entry.size;
    }
  }
  return usage;
}

let davCredentialsSet = false;
let preferences: AppPreferences = { autostart: false, minimizeToTray: false };

const MOCK_CONTACTS: Contact[] = [
  { id: '1', fullName: 'Anna Beispiel', emails: ['anna@example.com'], phones: ['+49 151 2345678'] },
  { id: '2', fullName: 'Max Mustermann', emails: ['max@example.com'], phones: [] },
];

const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    summary: 'Zahnarzttermin',
    start: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    location: 'Praxis Dr. Beispiel',
  },
  { id: '2', summary: 'Teammeeting', start: new Date(Date.now() + 5 * 86_400_000).toISOString() },
];

export function registerMockIpcHandlers(window: BrowserWindow): void {
  ipcMain.handle('auth:status', (): AuthStatus => ({
    isAuthenticated: true,
    appleIdMasked: 'da***@icloud.com',
    userInitials: 'DA',
    needsReauth: false,
  }));
  ipcMain.handle('auth:startLogin', () => ({ stage: 'authenticated' }));
  ipcMain.handle('auth:submitTwoFactorCode', () => ({ stage: 'authenticated' }));
  ipcMain.handle('auth:logout', () => {});

  ipcMain.handle('app:getPreferences', (): AppPreferences => preferences);
  ipcMain.handle('app:setAutostart', (_e, enabled: boolean) => {
    preferences = { ...preferences, autostart: enabled };
  });
  ipcMain.handle('app:setMinimizeToTray', (_e, enabled: boolean) => {
    preferences = { ...preferences, minimizeToTray: enabled };
  });

  ipcMain.handle('mount:status', (): MountStatus => ({ driveMounted: true, photosMounted: true, fuseAvailable: true }));
  ipcMain.handle('mount:retry', (): MountStatus => ({ driveMounted: true, photosMounted: true, fuseAvailable: true }));

  ipcMain.handle('fs:readdir', (_e, path: string) => tree[path] ?? []);
  ipcMain.handle('fs:stat', (_e, path: string) => {
    const parent = path.slice(0, path.length - (path.split('/').pop()?.length ?? 0) - 1) || '/';
    const entry = (tree[parent] ?? []).find((e) => e.path === path);
    return entry ?? { path, kind: 'file', size: 0, modifiedAt: new Date().toISOString() };
  });
  ipcMain.handle('fs:mkdir', (_e, path: string) => {
    const parent = path.slice(0, path.lastIndexOf('/')) || '/';
    const name = path.split('/').pop()!;
    tree[parent] = [...(tree[parent] ?? []), dir(name)];
    tree[path] = tree[path] ?? [];
  });
  ipcMain.handle('fs:rename', (_e, from: string, to: string) => {
    for (const entries of Object.values(tree)) {
      const entry = entries.find((e) => e.path === from);
      if (entry) {
        entry.path = to;
        entry.name = to.split('/').pop()!;
      }
    }
  });
  ipcMain.handle('fs:remove', (_e, path: string) => {
    for (const key of Object.keys(tree)) {
      tree[key] = tree[key].filter((e) => e.path !== path);
    }
  });
  ipcMain.handle('fs:openPath', () => '');
  ipcMain.handle('fs:revealInFileManager', () => {});
  ipcMain.handle('fs:listRecent', (_e, limit: number): RecentEntry[] => {
    const all = Object.values(tree)
      .flat()
      .filter((e) => e.kind === 'file')
      .map((e) => ({ name: e.name, path: e.path, size: e.size, modifiedAt: e.modifiedAt }));
    all.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    return all.slice(0, limit);
  });
  ipcMain.handle('fs:storageUsage', computeStorageUsage);

  ipcMain.handle('transfer:copyIn', (_e, sourceAbsPaths: string[]) => {
    const jobId = randomUUID();
    const bytesTotal = sourceAbsPaths.length * 1_000_000;
    setTimeout(() => {
      window.webContents.send('transfer:progress', {
        jobId,
        phase: 'copying',
        bytesDone: bytesTotal / 2,
        bytesTotal,
        currentFile: sourceAbsPaths[0],
      });
    }, 200);
    setTimeout(() => {
      window.webContents.send('transfer:progress', { jobId, phase: 'done', bytesDone: bytesTotal, bytesTotal });
    }, 900);
    return { jobId };
  });

  ipcMain.handle('photos:listAlbums', (): string[] => ['Favoriten', 'Zuletzt']);
  ipcMain.handle('photos:listAlbum', (): PhotoAsset[] => []);
  ipcMain.handle('photos:download', () => ({ jobId: '' }));

  ipcMain.handle('davAuth:hasCredentials', () => davCredentialsSet);
  ipcMain.handle('davAuth:setCredentials', () => {
    davCredentialsSet = true;
  });
  ipcMain.handle('davAuth:clearCredentials', () => {
    davCredentialsSet = false;
  });
  ipcMain.handle('contacts:list', (): Contact[] => (davCredentialsSet ? MOCK_CONTACTS : []));
  ipcMain.handle('calendar:listUpcoming', (): CalendarEvent[] => (davCredentialsSet ? MOCK_EVENTS : []));
}
