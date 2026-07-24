import type { AppState } from '../state/AppState';
import type { TrayManager } from '../tray/TrayManager';
import { isAutostartEnabled, setAutostartEnabled } from '../integration/autostart';
import type { AppPreferences } from '@shared/ipc-types';

export interface AutostartControl {
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;
}

const defaultAutostart: AutostartControl = { isEnabled: isAutostartEnabled, setEnabled: setAutostartEnabled };

/**
 * Owns the two app-level preferences that aren't tied to any iCloud remote
 * state: launching at system login (autostart.ts, backed by a
 * ~/.config/autostart desktop entry - the filesystem *is* the persisted
 * state) and minimizing to the tray instead of quitting on window close
 * (backed by AppState + the TrayManager it toggles). `autostart` is
 * constructor-injectable so tests don't have to touch the real filesystem.
 */
export class PreferencesController {
  private minimizeToTrayEnabled: boolean;

  constructor(
    private readonly appState: AppState,
    private readonly trayManager: TrayManager,
    private readonly autostart: AutostartControl = defaultAutostart,
  ) {
    this.minimizeToTrayEnabled = appState.get().minimizeToTray;
    if (this.minimizeToTrayEnabled) this.trayManager.enable();
  }

  getPreferences(): AppPreferences {
    return { autostart: this.autostart.isEnabled(), minimizeToTray: this.minimizeToTrayEnabled };
  }

  setAutostart(enabled: boolean): void {
    this.autostart.setEnabled(enabled);
  }

  setMinimizeToTray(enabled: boolean): void {
    this.minimizeToTrayEnabled = enabled;
    this.appState.update({ minimizeToTray: enabled });
    if (enabled) {
      this.trayManager.enable();
    } else {
      this.trayManager.disable();
    }
  }

  /** Whether the main window's `close` should hide it instead of letting the app quit. */
  shouldHideOnClose(): boolean {
    return this.minimizeToTrayEnabled;
  }
}
