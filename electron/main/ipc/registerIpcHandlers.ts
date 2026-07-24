import { randomUUID } from 'node:crypto';
import { app, dialog, ipcMain, shell, type BrowserWindow } from 'electron';
import type { AuthService } from '../auth/AuthService';
import type { FsBridge } from '../fs/FsBridge';
import type { MountManager } from '../mount/MountManager';
import type { PhotosService } from '../photos/PhotosService';
import type { TransferService } from '../transfer/TransferService';
import type { PreferencesController } from '../preferences/PreferencesController';
import type { AppState } from '../state/AppState';
import type { ContactsService } from '../contacts/ContactsService';
import type { CalendarService } from '../calendar/CalendarService';

export interface IpcDependencies {
  window: BrowserWindow;
  authService: AuthService;
  mountManager: MountManager;
  fsBridge: FsBridge;
  transferService: TransferService;
  photosService: PhotosService;
  preferencesController: PreferencesController;
}

/**
 * Registers Contacts/Calendar + their app-specific-password credential store.
 * Independent of rclone/mount entirely (CardDAV/CalDAV, not the iclouddrive
 * backend) so it's registered unconditionally, in both mock and real mode.
 */
export function registerDavIpcHandlers(
  appState: AppState,
  contactsService: ContactsService,
  calendarService: CalendarService,
): void {
  ipcMain.handle('davAuth:hasCredentials', () => appState.getDavCredentials() !== null);
  ipcMain.handle('davAuth:setCredentials', (_e, appleId: string, appSpecificPassword: string) => {
    appState.setDavCredentials({ appleId, appSpecificPassword });
  });
  ipcMain.handle('davAuth:clearCredentials', () => appState.clearDavCredentials());

  ipcMain.handle('contacts:list', () => contactsService.listContacts());
  ipcMain.handle('calendar:listUpcoming', () => calendarService.listUpcomingEvents());
}

/** Registers custom-titlebar window controls. Independent of the rest of the IPC surface so it works in mock mode too. */
export function registerWindowIpcHandlers(window: BrowserWindow): void {
  ipcMain.handle('app:getVersion', () => app.getVersion());

  ipcMain.handle('window:minimize', () => window.minimize());
  ipcMain.handle('window:toggleMaximize', () => {
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  });
  ipcMain.handle('window:close', () => window.close());
  ipcMain.handle('window:isMaximized', () => window.isMaximized());

  const notify = () => window.webContents.send('window:maximizeChanged', window.isMaximized());
  window.on('maximize', notify);
  window.on('unmaximize', notify);
}

export function registerIpcHandlers(deps: IpcDependencies): void {
  const { window, authService, mountManager, fsBridge, transferService, photosService, preferencesController } =
    deps;

  ipcMain.handle('auth:status', () => authService.status());
  ipcMain.handle('auth:startLogin', (_e, appleId: string, password: string) =>
    authService.startLogin(appleId, password),
  );
  ipcMain.handle('auth:submitTwoFactorCode', (_e, code: string) => authService.submitTwoFactorCode(code));
  ipcMain.handle('auth:logout', () => authService.logout());

  ipcMain.handle('mount:status', () => mountManager.getStatus());
  ipcMain.handle('mount:retry', () => mountManager.mountAll());

  ipcMain.handle('fs:readdir', (_e, path: string) => fsBridge.readdir(path));
  ipcMain.handle('fs:stat', (_e, path: string) => fsBridge.stat(path));
  ipcMain.handle('fs:mkdir', (_e, path: string) => fsBridge.mkdir(path));
  ipcMain.handle('fs:rename', (_e, from: string, to: string) => fsBridge.rename(from, to));
  ipcMain.handle('fs:remove', (_e, path: string, recursive: boolean) => fsBridge.remove(path, recursive));
  ipcMain.handle('fs:openPath', async (_e, path: string) => {
    const abs = fsBridge.toAbsolutePath(path);
    return shell.openPath(abs);
  });
  ipcMain.handle('fs:revealInFileManager', (_e, path: string) => {
    shell.showItemInFolder(fsBridge.toAbsolutePath(path));
  });
  ipcMain.handle('fs:listRecent', (_e, limit: number) => fsBridge.listRecent(limit));
  ipcMain.handle('fs:storageUsage', () => fsBridge.storageUsage());

  ipcMain.handle('transfer:copyIn', (_e, sourceAbsPaths: string[], destRelDir: string) =>
    transferService.copyIn(sourceAbsPaths, fsBridge.toAbsolutePath(destRelDir)),
  );

  ipcMain.handle('photos:listAlbums', () => photosService.listAlbums());
  ipcMain.handle('photos:listAlbum', (_e, album: string) => photosService.listAlbum(album));
  ipcMain.handle('photos:download', async (_e, paths: string[], destDir?: string) => {
    const target =
      destDir ??
      (await dialog.showOpenDialog(window, { properties: ['openDirectory'] })).filePaths[0] ??
      undefined;
    if (!target) return { jobId: '' };
    const jobId = randomUUID();
    void photosService.download(paths, target);
    return { jobId };
  });

  ipcMain.handle('app:getPreferences', () => preferencesController.getPreferences());
  ipcMain.handle('app:setAutostart', (_e, enabled: boolean) => preferencesController.setAutostart(enabled));
  ipcMain.handle('app:setMinimizeToTray', (_e, enabled: boolean) => preferencesController.setMinimizeToTray(enabled));
}
