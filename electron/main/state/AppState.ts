import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, safeStorage } from 'electron';

interface PersistedState {
  hasCompletedOnboarding: boolean;
  appleIdMasked?: string;
  minimizeToTray: boolean;
}

const DEFAULT_STATE: PersistedState = { hasCompletedOnboarding: false, minimizeToTray: false };

/**
 * Owns two small pieces of on-disk state:
 *  - app-state.json: non-secret UI state (onboarding flag, masked Apple ID for display).
 *  - a random config-encryption key for rclone.conf, protected by Electron's
 *    safeStorage (libsecret/kwallet on Linux). Falls back to a plaintext file
 *    with a loud warning if no OS keyring is available.
 */
export class AppState {
  private readonly statePath = join(app.getPath('userData'), 'app-state.json');
  private readonly keyPath = join(app.getPath('userData'), 'rclone.key');
  private readonly keyPathPlaintextFallback = join(app.getPath('userData'), 'rclone.key.plaintext');

  private state: PersistedState = DEFAULT_STATE;

  load(): void {
    if (existsSync(this.statePath)) {
      try {
        this.state = { ...DEFAULT_STATE, ...JSON.parse(readFileSync(this.statePath, 'utf8')) };
      } catch {
        this.state = DEFAULT_STATE;
      }
    }
  }

  get(): PersistedState {
    return this.state;
  }

  update(patch: Partial<PersistedState>): void {
    this.state = { ...this.state, ...patch };
    writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  /**
   * Returns the config-encryption password for rclone.conf, generating and
   * persisting a new random one on first run.
   */
  getOrCreateConfigPass(): { value: string; usedPlaintextFallback: boolean } {
    if (safeStorage.isEncryptionAvailable()) {
      if (existsSync(this.keyPath)) {
        const encrypted = readFileSync(this.keyPath);
        return { value: safeStorage.decryptString(encrypted), usedPlaintextFallback: false };
      }
      const value = randomBytes(32).toString('hex');
      writeFileSync(this.keyPath, safeStorage.encryptString(value));
      return { value, usedPlaintextFallback: false };
    }

    // No OS keyring available (some minimal Linux desktop environments).
    console.warn(
      '[AppState] No OS keyring available (safeStorage.isEncryptionAvailable() === false). ' +
        'Falling back to a plaintext config-encryption key file. This is less secure; ' +
        'install/enable a keyring (e.g. gnome-keyring, kwallet) for better protection.',
    );
    if (existsSync(this.keyPathPlaintextFallback)) {
      return { value: readFileSync(this.keyPathPlaintextFallback, 'utf8'), usedPlaintextFallback: true };
    }
    const value = randomBytes(32).toString('hex');
    writeFileSync(this.keyPathPlaintextFallback, value, { mode: 0o600 });
    return { value, usedPlaintextFallback: true };
  }
}
