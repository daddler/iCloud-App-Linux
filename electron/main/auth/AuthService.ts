import type { RcClient } from '../rclone/rcClient';
import type { AuthStartResult, AuthStatus } from '@shared/ipc-types';

const REMOTE_NAME = 'icloud';

/**
 * Drives Apple ID + 2FA authentication for the `icloud` rclone remote via
 * rclone's rc `config/create` / `config/update` "continuation" protocol
 * (the same mechanism `rclone config create` uses interactively, but driven
 * programmatically with `nonInteractive: true` + a returned `State` token).
 *
 * IMPORTANT (see plan docs, "Risiken/offene Punkte"): the exact shape of the
 * continuation response for the `iclouddrive` backend's 2FA step is the
 * single highest-uncertainty integration point in this project and MUST be
 * verified against the pinned rclone version (resources/rclone/checksums.json)
 * with a real Apple ID before relying on this in production. The field names
 * below (`State`, `Result`, `Option`) match rclone's general config-continuation
 * protocol as of v1.6x; adjust here if the bundled version differs.
 */
export class AuthService {
  private pendingState: string | null = null;

  constructor(private readonly rc: RcClient) {}

  async status(): Promise<AuthStatus> {
    try {
      const dump = await this.rc.call<Record<string, unknown>>('config/dump');
      const remote = dump[REMOTE_NAME] as Record<string, unknown> | undefined;
      if (!remote) {
        return { isAuthenticated: false, needsReauth: false };
      }
      return { isAuthenticated: true, needsReauth: false };
    } catch {
      return { isAuthenticated: false, needsReauth: false };
    }
  }

  async startLogin(appleId: string, password: string): Promise<AuthStartResult> {
    try {
      const result = await this.rc.call<{ State?: string; Error?: string }>('config/create', {
        name: REMOTE_NAME,
        type: 'iclouddrive',
        parameters: { apple_id: appleId, password },
        opt: { nonInteractive: true, noObscure: false },
      });

      if (result.State) {
        this.pendingState = result.State;
        return { stage: 'awaiting-2fa', message: 'Enter the verification code sent to your trusted device.' };
      }
      return { stage: 'authenticated' };
    } catch (err) {
      return { stage: 'error', message: (err as Error).message };
    }
  }

  async submitTwoFactorCode(code: string): Promise<AuthStartResult> {
    if (!this.pendingState) {
      return { stage: 'error', message: 'No pending 2FA challenge. Please start login again.' };
    }
    try {
      const result = await this.rc.call<{ State?: string; Error?: string }>('config/create', {
        name: REMOTE_NAME,
        type: 'iclouddrive',
        parameters: {},
        opt: { nonInteractive: true, state: this.pendingState, result: code },
      });

      if (result.Error) {
        return { stage: 'awaiting-2fa', message: result.Error };
      }
      if (result.State) {
        // Some flows need a second round (e.g. SMS vs. device confirmation).
        this.pendingState = result.State;
        return { stage: 'awaiting-2fa', message: 'Additional verification step required.' };
      }

      this.pendingState = null;
      return { stage: 'authenticated' };
    } catch (err) {
      return { stage: 'error', message: (err as Error).message };
    }
  }

  async reauthenticate(password: string): Promise<AuthStartResult> {
    try {
      const result = await this.rc.call<{ State?: string; Error?: string }>('config/update', {
        name: REMOTE_NAME,
        parameters: { password },
        opt: { nonInteractive: true },
      });
      if (result.State) {
        this.pendingState = result.State;
        return { stage: 'awaiting-2fa' };
      }
      return { stage: 'authenticated' };
    } catch (err) {
      return { stage: 'error', message: (err as Error).message };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.rc.call('config/delete', { name: REMOTE_NAME });
    } finally {
      this.pendingState = null;
    }
  }
}
