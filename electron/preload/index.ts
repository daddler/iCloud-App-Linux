import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type {
  AuthStartResult,
  AuthStatus,
  DirEntry,
  FileStat,
  IcloudBridge,
  MountStatus,
  PhotoAsset,
  StartTransferResult,
  TransferProgress,
} from '@shared/ipc-types';

const bridge: IcloudBridge = {
  auth: {
    status: () => ipcRenderer.invoke('auth:status') as Promise<AuthStatus>,
    startLogin: (appleId, password) =>
      ipcRenderer.invoke('auth:startLogin', appleId, password) as Promise<AuthStartResult>,
    submitTwoFactorCode: (code) =>
      ipcRenderer.invoke('auth:submitTwoFactorCode', code) as Promise<AuthStartResult>,
    logout: () => ipcRenderer.invoke('auth:logout') as Promise<void>,
  },
  mount: {
    status: () => ipcRenderer.invoke('mount:status') as Promise<MountStatus>,
    retry: () => ipcRenderer.invoke('mount:retry') as Promise<MountStatus>,
  },
  fs: {
    readdir: (path) => ipcRenderer.invoke('fs:readdir', path) as Promise<DirEntry[]>,
    stat: (path) => ipcRenderer.invoke('fs:stat', path) as Promise<FileStat>,
    mkdir: (path) => ipcRenderer.invoke('fs:mkdir', path) as Promise<void>,
    rename: (from, to) => ipcRenderer.invoke('fs:rename', from, to) as Promise<void>,
    remove: (path, recursive) => ipcRenderer.invoke('fs:remove', path, recursive) as Promise<void>,
    openPath: (path) => ipcRenderer.invoke('fs:openPath', path) as Promise<string>,
    revealInFileManager: (path) => ipcRenderer.invoke('fs:revealInFileManager', path) as Promise<void>,
  },
  transfer: {
    getPathForFile: (file) => webUtils.getPathForFile(file),
    copyIn: (sourceAbsPaths, destRelDir) =>
      ipcRenderer.invoke('transfer:copyIn', sourceAbsPaths, destRelDir) as Promise<StartTransferResult>,
    onProgress: (jobId, cb) => {
      const listener = (_event: Electron.IpcRendererEvent, progress: TransferProgress) => {
        if (progress.jobId === jobId) cb(progress);
      };
      ipcRenderer.on('transfer:progress', listener);
      return () => ipcRenderer.removeListener('transfer:progress', listener);
    },
  },
  photos: {
    listAlbums: () => ipcRenderer.invoke('photos:listAlbums') as Promise<string[]>,
    listAlbum: (album) => ipcRenderer.invoke('photos:listAlbum', album) as Promise<PhotoAsset[]>,
    download: (paths, destDir) =>
      ipcRenderer.invoke('photos:download', paths, destDir) as Promise<StartTransferResult>,
  },
};

contextBridge.exposeInMainWorld('icloud', bridge);
