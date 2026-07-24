/** Types shared between the Electron main process, preload bridge and renderer. */

export type DirEntryKind = 'file' | 'directory';

export interface DirEntry {
  name: string;
  path: string; // path relative to the remote's mount root
  kind: DirEntryKind;
  size: number;
  modifiedAt: string; // ISO 8601
}

export interface FileStat {
  path: string;
  kind: DirEntryKind;
  size: number;
  modifiedAt: string;
}

export type AppView = 'onboarding' | 'drive' | 'photos' | 'settings';

export type AuthStage = 'idle' | 'awaiting-credentials' | 'awaiting-2fa' | 'authenticated' | 'error';

export interface AuthStartResult {
  stage: AuthStage;
  message?: string;
}

export interface AuthStatus {
  isAuthenticated: boolean;
  appleIdMasked?: string;
  needsReauth: boolean;
}

export interface MountStatus {
  driveMounted: boolean;
  photosMounted: boolean;
  fuseAvailable: boolean;
  error?: string;
}

export interface TransferProgress {
  jobId: string;
  phase: 'copying' | 'uploading' | 'done' | 'error';
  bytesDone: number;
  bytesTotal: number;
  currentFile?: string;
  error?: string;
}

export interface StartTransferResult {
  jobId: string;
}

export interface PhotoAsset {
  id: string;
  path: string; // relative path under the photos mount root
  filename: string;
  takenAt?: string;
  thumbnailAvailable: boolean;
}

export interface IcloudBridge {
  auth: {
    status(): Promise<AuthStatus>;
    startLogin(appleId: string, password: string): Promise<AuthStartResult>;
    submitTwoFactorCode(code: string): Promise<AuthStartResult>;
    logout(): Promise<void>;
  };
  mount: {
    status(): Promise<MountStatus>;
    retry(): Promise<MountStatus>;
  };
  fs: {
    readdir(path: string): Promise<DirEntry[]>;
    stat(path: string): Promise<FileStat>;
    mkdir(path: string): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    remove(path: string, recursive: boolean): Promise<void>;
    openPath(path: string): Promise<string>; // returns '' on success, error string otherwise
    revealInFileManager(path: string): Promise<void>;
  };
  transfer: {
    getPathForFile(file: File): string;
    copyIn(sourceAbsPaths: string[], destRelDir: string): Promise<StartTransferResult>;
    onProgress(jobId: string, cb: (p: TransferProgress) => void): () => void;
  };
  photos: {
    listAlbums(): Promise<string[]>;
    listAlbum(album: string): Promise<PhotoAsset[]>;
    download(paths: string[], destDir?: string): Promise<StartTransferResult>;
  };
}

declare global {
  interface Window {
    icloud: IcloudBridge;
  }
}
