import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type {
  AppPreferences,
  AuthStartResult,
  AuthStatus,
  CalendarEvent,
  Contact,
  DirEntry,
  FileStat,
  IcloudBridge,
  MountStatus,
  PhotoAsset,
  RecentEntry,
  StartTransferResult,
  StorageUsage,
  TransferProgress,
} from '@shared/ipc-types';

const bridge: IcloudBridge = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
    getPreferences: () => ipcRenderer.invoke('app:getPreferences') as Promise<AppPreferences>,
    setAutostart: (enabled) => ipcRenderer.invoke('app:setAutostart', enabled) as Promise<void>,
    setMinimizeToTray: (enabled) => ipcRenderer.invoke('app:setMinimizeToTray', enabled) as Promise<void>,
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize') as Promise<void>,
    close: () => ipcRenderer.invoke('window:close') as Promise<void>,
    isMaximized: () => ipcRenderer.invoke('window:isMaximized') as Promise<boolean>,
    onMaximizeChange: (cb) => {
      const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => cb(isMaximized);
      ipcRenderer.on('window:maximizeChanged', listener);
      return () => ipcRenderer.removeListener('window:maximizeChanged', listener);
    },
  },
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
    listRecent: (limit) => ipcRenderer.invoke('fs:listRecent', limit) as Promise<RecentEntry[]>,
    storageUsage: () => ipcRenderer.invoke('fs:storageUsage') as Promise<StorageUsage>,
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
  davAuth: {
    hasCredentials: () => ipcRenderer.invoke('davAuth:hasCredentials') as Promise<boolean>,
    setCredentials: (appleId, appSpecificPassword) =>
      ipcRenderer.invoke('davAuth:setCredentials', appleId, appSpecificPassword) as Promise<void>,
    clearCredentials: () => ipcRenderer.invoke('davAuth:clearCredentials') as Promise<void>,
  },
  contacts: {
    list: () => ipcRenderer.invoke('contacts:list') as Promise<Contact[]>,
  },
  calendar: {
    listUpcoming: () => ipcRenderer.invoke('calendar:listUpcoming') as Promise<CalendarEvent[]>,
  },
};

contextBridge.exposeInMainWorld('icloud', bridge);
