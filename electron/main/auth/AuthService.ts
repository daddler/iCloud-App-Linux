import type { RcClient } from '../rclone/rcClient';
import type { AuthStartResult, AuthStatus } from '@shared/ipc-types';

const REMOTE_NAME = 'icloud';

/** Keeps the first couple of characters of the local part visible (e.g. for initials), masks the rest. */
function maskAppleId(appleId: string): string {
  const [local, domain] = appleId.split('@');
  if (!local || !domain) return appleId;
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
}

/**
 * Derives 2-letter initials from the Apple ID's local part, e.g.
 * "fabian.watermuelder@..." -> "FW" (first letter of first + last name
 * segment), falling back to the first two characters for a single-segment
 * local part (e.g. "fabian@..." -> "FA").
 */
function computeInitials(appleId: string): string | undefined {
  const local = appleId.split('@')[0];
  if (!local) return undefined;
  const segments = local.split(/[._-]+/).filter(Boolean);
  if (segments.length >= 2) {
    return (segments[0][0] + segments[segments.length - 1][0]).toUpperCase();
  }
  if (segments.length === 1 && segments[0].length > 0) {
    return segments[0].slice(0, 2).toUpperCase();
  }
  return undefined;
}

/**
 * Drives Apple ID + 2FA authentication for the `icloud` rclone remote via
 * rclone's rc `config/create` / `config/update` "continuation" protocol
 * (the same mechanism `rclone config create` uses interactively, but driven
 * programmatically with `nonInteractive: true` + a returned `State` token).
 *
 * Verified end-to-end against a real Apple ID on the pinned rclone version
 * (resources/rclone/checksums.json): each continuation round-trip must resend
 * the original `parameters` (apple_id/password) alongside `state`/`result` -
 * rclone's rc layer does not remember earlier answers itself, so omitting
 * them on the 2FA step fails with "an Apple ID is required".
 */
export class AuthService {
  private pendingState: string | null = null;
  // rclone's rc config-continuation protocol does not remember earlier
  // answers across --continue/state round-trips - the original parameters
  // (apple_id, password) must be resent on every call or the backend fails
  // with "an Apple ID is required" once it reaches the 2FA step.
  private pendingParameters: Record<string, unknown> = {};
  private pendingEndpoint: 'config/create' | 'config/update' = 'config/create';

  constructor(private readonly rc: RcClient) {}

  async status(): Promise<AuthStatus> {
    try {
      const dump = await this.rc.call<Record<string, unknown>>('config/dump');
      const remote = dump[REMOTE_NAME] as Record<string, unknown> | undefined;
      if (!remote) {
        return { isAuthenticated: false, needsReauth: false };
      }
      const appleId = typeof remote.apple_id === 'string' ? remote.apple_id : undefined;
      return {
        isAuthenticated: true,
        needsReauth: false,
        appleIdMasked: appleId ? maskAppleId(appleId) : undefined,
        userInitials: appleId ? computeInitials(appleId) : undefined,
      };
    } catch {
      return { isAuthenticated: false, needsReauth: false };
    }
  }

  async startLogin(appleId: string, password: string): Promise<AuthStartResult> {
    const parameters = { apple_id: appleId, password };
    try {
      const result = await this.rc.call<{ State?: string; Error?: string }>('config/create', {
        name: REMOTE_NAME,
        type: 'iclouddrive',
        parameters,
        opt: { nonInteractive: true, noObscure: false },
      });

      if (result.State) {
        this.pendingState = result.State;
        this.pendingParameters = parameters;
        this.pendingEndpoint = 'config/create';
        return { stage: 'awaiting-2fa', message: 'Enter the verification code sent to your trusted device.' };
      }
      this.pendingParameters = {};
      return { stage: 'authenticated' };
    } catch (err) {
      this.pendingParameters = {};
      return { stage: 'error', message: (err as Error).message };
    }
  }

  async submitTwoFactorCode(code: string): Promise<AuthStartResult> {
    if (!this.pendingState) {
      return { stage: 'error', message: 'No pending 2FA challenge. Please start login again.' };
    }
    try {
      const result = await this.rc.call<{ State?: string; Error?: string }>(this.pendingEndpoint, {
        name: REMOTE_NAME,
        type: 'iclouddrive',
        // The original apple_id/password must be resent on every continuation
        // round-trip - rclone's rc config state does not persist them itself.
        parameters: this.pendingParameters,
        // `continue: true` is required here, distinct from state/result: without
        // it, rclone's config/create handler treats this as a brand new create
        // and deletes the remote's in-progress config section (including the
        // backend's saved 2FA session) before ever looking at `state`, failing
        // with "auth session state lost, please reconfigure".
        opt: { nonInteractive: true, continue: true, state: this.pendingState, result: code },
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
      this.pendingParameters = {};
      return { stage: 'authenticated' };
    } catch (err) {
      return { stage: 'error', message: (err as Error).message };
    }
  }

  async reauthenticate(password: string): Promise<AuthStartResult> {
    const parameters = { password };
    try {
      const result = await this.rc.call<{ State?: string; Error?: string }>('config/update', {
        name: REMOTE_NAME,
        parameters,
        opt: { nonInteractive: true },
      });
      if (result.State) {
        this.pendingState = result.State;
        this.pendingParameters = parameters;
        this.pendingEndpoint = 'config/update';
        return { stage: 'awaiting-2fa' };
      }
      this.pendingParameters = {};
      return { stage: 'authenticated' };
    } catch (err) {
      this.pendingParameters = {};
      return { stage: 'error', message: (err as Error).message };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.rc.call('config/delete', { name: REMOTE_NAME });
    } finally {
      this.pendingState = null;
      this.pendingParameters = {};
    }
  }
}
