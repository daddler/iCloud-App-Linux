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

/** Shape of rclone's `fs.ConfigOut` as returned by rc `config/create` / `config/update` with `nonInteractive`. */
interface ConfigOut {
  State?: string;
  Error?: string;
  Result?: string;
  Option?: {
    Name?: string;
    Help?: string;
    Examples?: { Value: string; Help?: string }[];
  } | null;
}

const BODY_MARKER = 'returned body: ';

/**
 * rclone's REST layer formats non-2xx Apple responses as
 * `HTTP error 400 (400 Bad Request) returned body: "<Go-%q-quoted JSON>"`,
 * which is unreadable in the UI (it dumps Apple's whole auth-state JSON).
 * Turn that into a short, user-facing German message.
 */
export function friendlyAuthError(raw: string): string {
  const markerIdx = raw.indexOf(BODY_MARKER);
  const head = markerIdx >= 0 ? raw.slice(0, markerIdx).trim() : raw.trim();
  const status = /HTTP error (\d{3})/.exec(head)?.[1];

  let appleMessage: string | undefined;
  if (markerIdx >= 0) {
    try {
      // Go's %q output is (for this ASCII/UTF-8 JSON) a valid JSON string literal.
      const bodyText = JSON.parse(raw.slice(markerIdx + BODY_MARKER.length).trim()) as string;
      const body = JSON.parse(bodyText) as {
        service_errors?: { message?: string }[];
        serviceErrors?: { message?: string }[];
      };
      appleMessage = (body.service_errors ?? body.serviceErrors)?.[0]?.message;
    } catch {
      // Body isn't JSON - fall through to the generic messages below.
    }
  }

  const isCodeValidation = /validate2FACode|validateSMSCode/i.test(head);
  if (isCodeValidation && status && status.startsWith('4')) {
    return (
      'Apple hat den Bestätigungscode abgelehnt (falsch oder abgelaufen). ' +
      'Gib den neuesten Code ein oder fordere einen Code per SMS an.' +
      (appleMessage ? ` (Apple: ${appleMessage})` : '')
    );
  }
  if (/requestSMSCode|failed to send SMS code/i.test(head)) {
    return 'Apple konnte keinen SMS-Code senden. Bitte später erneut versuchen.' + (appleMessage ? ` (Apple: ${appleMessage})` : '');
  }
  if (/failed to get trusted phone numbers|auth session state lost/i.test(head)) {
    return 'Die Anmeldesitzung bei Apple ist nicht mehr gültig. Bitte gehe zurück und melde dich erneut an.';
  }
  if (/incorrect username or password/i.test(head)) {
    return 'Apple-ID oder Passwort ist falsch.';
  }
  if (appleMessage) return `${head.replace(/:\s*$/, '')}: ${appleMessage}`;
  return head || raw;
}

/**
 * Drives Apple ID + 2FA authentication for the `icloud` rclone remote via
 * rclone's rc `config/create` / `config/update` "continuation" protocol
 * (the same mechanism `rclone config create` uses interactively, but driven
 * programmatically with `nonInteractive: true` + a returned `State` token).
 *
 * Verified against rclone v1.75.1's (same as v1.74.4) `backend/iclouddrive/icloud.go` Config():
 *  - state ""            -> SRP sign-in, pushes a code to trusted devices, returns State "2fa_do"
 *                           (or, for accounts without trusted devices, goes straight to the SMS flow)
 *  - state "2fa_do"      -> Result = 6-digit code, or "sms" to switch to an SMS code
 *  - state "2fa_sms_select" -> Result = "<phoneId>_<mode>" picked from Option.Examples
 *  - state "2fa_sms_<id>_<mode>" -> Result = SMS code
 * Every continuation call MUST pass `continue: true`: without it rc's
 * config/create deletes the whole remote section first (fs/config CreateRemote),
 * wiping apple_id/password and the saved SRP session the 2FA step depends on.
 */
export class AuthService {
  private pendingState: string | null = null;
  // Resent on every continuation round-trip (verified against a real Apple ID
  // on the pinned rclone, see git history) - harmless with `continue: true`.
  private pendingParameters: Record<string, unknown> = {};

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
    this.pendingState = null;
    this.pendingParameters = { apple_id: appleId, password };
    try {
      const out = await this.rc.call<ConfigOut>('config/create', {
        name: REMOTE_NAME,
        type: 'iclouddrive',
        parameters: this.pendingParameters,
        opt: { nonInteractive: true, obscure: true },
      });
      return await this.handleConfigOut(out, null);
    } catch (err) {
      return { stage: 'error', message: friendlyAuthError((err as Error).message) };
    }
  }

  /** `code` is the 6-digit verification code, or the literal "sms" to request a code via text message. */
  async submitTwoFactorCode(code: string): Promise<AuthStartResult> {
    if (!this.pendingState) {
      return { stage: 'error', message: 'Keine offene 2FA-Anfrage. Bitte melde dich erneut an.' };
    }
    const state = this.pendingState;
    try {
      const out = await this.continueConfig(state, code.trim());
      return await this.handleConfigOut(out, state);
    } catch (err) {
      const message = friendlyAuthError((err as Error).message);
      // The "2fa_do" step keeps rclone's saved SRP session on failure, so the
      // same state can be retried with a corrected code. The SMS validation
      // step clears it, so the whole login has to be restarted.
      if (state === '2fa_do') {
        return { stage: 'awaiting-2fa', message };
      }
      this.pendingState = null;
      return { stage: 'error', message: `${message} Bitte melde dich erneut an.` };
    }
  }

  async reauthenticate(password: string): Promise<AuthStartResult> {
    this.pendingState = null;
    this.pendingParameters = { password };
    try {
      const out = await this.rc.call<ConfigOut>('config/update', {
        name: REMOTE_NAME,
        parameters: this.pendingParameters,
        opt: { nonInteractive: true, obscure: true },
      });
      return await this.handleConfigOut(out, null);
    } catch (err) {
      return { stage: 'error', message: friendlyAuthError((err as Error).message) };
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

  private continueConfig(state: string, result: string): Promise<ConfigOut> {
    return this.rc.call<ConfigOut>('config/update', {
      name: REMOTE_NAME,
      parameters: this.pendingParameters,
      opt: { nonInteractive: true, obscure: true, continue: true, state, result },
    });
  }

  private async handleConfigOut(out: ConfigOut, previousState: string | null): Promise<AuthStartResult> {
    if (out.Error) {
      // fs.ConfigError returns a bogus follow-up state ("authenticate") the
      // iclouddrive backend doesn't handle, so stay on the state we were in.
      this.pendingState = previousState;
      return previousState
        ? { stage: 'awaiting-2fa', message: friendlyAuthError(out.Error) }
        : { stage: 'error', message: friendlyAuthError(out.Error) };
    }

    if (!out.State) {
      this.pendingState = null;
      this.pendingParameters = {};
      return { stage: 'authenticated' };
    }

    this.pendingState = out.State;

    if (out.State === '2fa_sms_select') {
      // Several trusted phone numbers - pick the first one; the UI only has a code field.
      const first = out.Option?.Examples?.[0]?.Value;
      if (!first) {
        this.pendingState = null;
        return { stage: 'error', message: 'Apple hat keine vertrauenswürdige Telefonnummer geliefert.' };
      }
      const next = await this.continueConfig(out.State, first);
      return this.handleConfigOut(next, out.State);
    }

    if (out.State.startsWith('2fa_sms_')) {
      const target = /sent to (.+)$/.exec(out.Option?.Help ?? '')?.[1];
      return {
        stage: 'awaiting-2fa',
        message: target ? `Apple hat einen Code per SMS an ${target} gesendet.` : 'Apple hat einen Code per SMS gesendet.',
      };
    }

    return { stage: 'awaiting-2fa' };
  }
}
