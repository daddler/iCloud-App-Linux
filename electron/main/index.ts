import { join } from 'node:path';
import { app, BrowserWindow } from 'electron';
import { RcloneManager } from './rclone/RcloneManager';
import { AuthService } from './auth/AuthService';
import { MountManager } from './mount/MountManager';
import { FsBridge } from './fs/FsBridge';
import { TransferService } from './transfer/TransferService';
import { PhotosService } from './photos/PhotosService';
import { AppState } from './state/AppState';
import { registerIpcHandlers } from './ipc/registerIpcHandlers';
import { registerMediaProtocolScheme, setupMediaProtocolHandler } from './protocol/mediaProtocol';
import {
  addFileManagerBookmarks,
  removeFileManagerBookmarks,
  type FileManagerBookmark,
} from './integration/fileManagerIntegration';
import { TrayManager } from './tray/TrayManager';
import { PreferencesController } from './preferences/PreferencesController';

const isDev = !app.isPackaged;
const MOCK_MODE = process.env.E2E_MOCK_RCLONE === '1';

registerMediaProtocolScheme(); // must run before app 'ready'

let mainWindow: BrowserWindow | null = null;
let rcloneManager: RcloneManager | null = null;
let mountManager: MountManager | null = null;
let quitting = false;

// Bundled as ESM (root package.json has "type": "module"), so use
// import.meta.dirname (Node 20.11+, present in Electron 32's bundled Node)
// rather than the CJS-only __dirname.
const mainDir = import.meta.dirname;

function createWindow(): BrowserWindow {
  return new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(mainDir, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
}

async function loadWindowContent(win: BrowserWindow): Promise<void> {
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await win.loadFile(join(mainDir, '../renderer/index.html'));
  }
}

async function bootstrap(): Promise<void> {
  const appState = new AppState();
  appState.load();

  // Content is loaded only after IPC handlers are registered below, so the
  // renderer can never race a handler call ahead of ipcMain.handle() (e.g.
  // "No handler registered for 'auth:status'" if it queries auth state on
  // mount before rclone has finished starting up).
  mainWindow = createWindow();
  const win = mainWindow;

  if (MOCK_MODE) {
    console.log('[main] Running in E2E_MOCK_RCLONE mode: real rclone/auth/mount are skipped.');
    // In mock mode the renderer is expected to be driven by test fixtures;
    // IPC handlers are intentionally not registered here (see test/e2e).
    await loadWindowContent(win);
    return;
  }

  const { value: configPass } = appState.getOrCreateConfigPass();
  const configPath = join(app.getPath('userData'), 'rclone.conf');

  rcloneManager = new RcloneManager({ configPath, configPass });
  await rcloneManager.start();
  const rc = rcloneManager.getClient();

  mountManager = new MountManager(rc, {
    drivePoint: join(app.getPath('userData'), 'mount', 'drive'),
    photosPoint: join(app.getPath('userData'), 'mount', 'photos'),
  });

  const authService = new AuthService(rc);
  const status = await authService.status();
  if (status.isAuthenticated) {
    const mountStatus = await mountManager.mountAll();
    const bookmarks: FileManagerBookmark[] = [];
    if (mountStatus.driveMounted) {
      bookmarks.push({ path: mountManager.getDriveMountPoint(), label: 'iCloud Drive' });
    }
    if (mountStatus.photosMounted) {
      bookmarks.push({ path: mountManager.getPhotosMountPoint(), label: 'iCloud Fotos' });
    }
    addFileManagerBookmarks(bookmarks);
  }

  const fsBridge = new FsBridge(mountManager.getDriveMountPoint());
  const transferService = new TransferService(rc, () => mainWindow?.webContents ?? null);
  const photosService = new PhotosService(mountManager.getPhotosMountPoint());

  const trayManager = new TrayManager(win, () => app.quit());
  const preferencesController = new PreferencesController(appState, trayManager);
  win.on('close', (event) => {
    if (!quitting && preferencesController.shouldHideOnClose()) {
      event.preventDefault();
      win.hide();
    }
  });

  setupMediaProtocolHandler({
    drive: mountManager.getDriveMountPoint(),
    photos: mountManager.getPhotosMountPoint(),
  });

  registerIpcHandlers({
    window: win,
    authService,
    mountManager,
    fsBridge,
    transferService,
    photosService,
    preferencesController,
  });

  await loadWindowContent(win);
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void loadWindowContent(createWindow());
});

app.on('before-quit', (event) => {
  if (quitting || !mountManager) return;
  event.preventDefault();
  quitting = true;
  void (async () => {
    if (mountManager) {
      removeFileManagerBookmarks([mountManager.getDriveMountPoint(), mountManager.getPhotosMountPoint()]);
      await mountManager.unmountAll();
    }
    await rcloneManager?.shutdown();
    app.quit();
  })();
});
