import { randomUUID } from 'node:crypto';
import { dialog, ipcMain, shell, type BrowserWindow } from 'electron';
import type { AuthService } from '../auth/AuthService';
import type { FsBridge } from '../fs/FsBridge';
import type { MountManager } from '../mount/MountManager';
import type { PhotosService } from '../photos/PhotosService';
import type { TransferService } from '../transfer/TransferService';

export interface IpcDependencies {
  window: BrowserWindow;
  authService: AuthService;
  mountManager: MountManager;
  fsBridge: FsBridge;
  transferService: TransferService;
  photosService: PhotosService;
}

export function registerIpcHandlers(deps: IpcDependencies): void {
  const { window, authService, mountManager, fsBridge, transferService, photosService } = deps;

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
}
