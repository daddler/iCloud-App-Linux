import { describe, expect, it } from 'vitest';
import type { AppState } from '../../electron/main/state/AppState';
import type { TrayManager } from '../../electron/main/tray/TrayManager';
import { PreferencesController, type AutostartControl } from '../../electron/main/preferences/PreferencesController';

function fakeAppState(initial: { minimizeToTray: boolean }): AppState {
  const state = { hasCompletedOnboarding: true, minimizeToTray: initial.minimizeToTray };
  return {
    get: () => state,
    update: (patch: Partial<typeof state>) => Object.assign(state, patch),
  } as unknown as AppState;
}

function fakeTrayManager(): TrayManager & { enabled: boolean } {
  return {
    enabled: false,
    enable() {
      this.enabled = true;
    },
    disable() {
      this.enabled = false;
    },
    isEnabled() {
      return this.enabled;
    },
  } as unknown as TrayManager & { enabled: boolean };
}

function fakeAutostart(initialEnabled = false): AutostartControl & { calls: boolean[] } {
  let enabled = initialEnabled;
  return {
    calls: [],
    isEnabled: () => enabled,
    setEnabled(value: boolean) {
      enabled = value;
      this.calls.push(value);
    },
  };
}

describe('PreferencesController', () => {
  it('enables the tray on construction when minimizeToTray was already persisted as true', () => {
    const tray = fakeTrayManager();
    new PreferencesController(fakeAppState({ minimizeToTray: true }), tray, fakeAutostart());
    expect(tray.enabled).toBe(true);
  });

  it('leaves the tray disabled on construction when minimizeToTray is false', () => {
    const tray = fakeTrayManager();
    new PreferencesController(fakeAppState({ minimizeToTray: false }), tray, fakeAutostart());
    expect(tray.enabled).toBe(false);
  });

  it('setMinimizeToTray persists the flag and toggles the tray', () => {
    const appState = fakeAppState({ minimizeToTray: false });
    const tray = fakeTrayManager();
    const controller = new PreferencesController(appState, tray, fakeAutostart());

    controller.setMinimizeToTray(true);
    expect(tray.enabled).toBe(true);
    expect(appState.get().minimizeToTray).toBe(true);
    expect(controller.shouldHideOnClose()).toBe(true);

    controller.setMinimizeToTray(false);
    expect(tray.enabled).toBe(false);
    expect(appState.get().minimizeToTray).toBe(false);
    expect(controller.shouldHideOnClose()).toBe(false);
  });

  it('setAutostart delegates to the injected autostart control', () => {
    const autostart = fakeAutostart(false);
    const controller = new PreferencesController(fakeAppState({ minimizeToTray: false }), fakeTrayManager(), autostart);

    controller.setAutostart(true);
    expect(autostart.calls).toEqual([true]);
    expect(controller.getPreferences().autostart).toBe(true);
  });

  it('getPreferences reflects both autostart and minimizeToTray', () => {
    const controller = new PreferencesController(
      fakeAppState({ minimizeToTray: false }),
      fakeTrayManager(),
      fakeAutostart(false),
    );

    expect(controller.getPreferences()).toEqual({ autostart: false, minimizeToTray: false });
    controller.setAutostart(true);
    controller.setMinimizeToTray(true);
    expect(controller.getPreferences()).toEqual({ autostart: true, minimizeToTray: true });
  });
});
