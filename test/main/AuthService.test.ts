import { describe, expect, it, vi } from 'vitest';
import { AuthService, friendlyAuthError } from '../../electron/main/auth/AuthService';
import type { RcClient } from '../../electron/main/rclone/rcClient';

function fakeRc(responses: unknown[]) {
  const call = vi.fn(async () => {
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next;
  });
  return { rc: { call } as unknown as RcClient, call };
}

describe('AuthService', () => {
  it('continues the 2FA step with continue:true so rclone keeps the remote config', async () => {
    const { rc, call } = fakeRc([{ State: '2fa_do', Option: { Help: 'x' } }, { State: '' }]);
    const auth = new AuthService(rc);
    expect((await auth.startLogin('a@b.de', 'pw')).stage).toBe('awaiting-2fa');
    expect((await auth.submitTwoFactorCode('123456')).stage).toBe('authenticated');
    expect(call).toHaveBeenLastCalledWith('config/update', {
      name: 'icloud',
      parameters: { apple_id: 'a@b.de', password: 'pw' },
      opt: { nonInteractive: true, obscure: true, continue: true, state: '2fa_do', result: '123456' },
    });
  });

  it('lets the user retry after Apple rejects a device code', async () => {
    const { rc } = fakeRc([
      { State: '2fa_do' },
      new Error('validate2FACode failed: HTTP error 400 (400 Bad Request) returned body: "{\\n \\"successful\\" : false\\n}"'),
      { State: '' },
    ]);
    const auth = new AuthService(rc);
    await auth.startLogin('a@b.de', 'pw');
    const failed = await auth.submitTwoFactorCode('000000');
    expect(failed.stage).toBe('awaiting-2fa');
    expect(failed.message).toContain('abgelehnt');
    expect(failed.message).not.toContain('successful');
    expect((await auth.submitTwoFactorCode('123456')).stage).toBe('authenticated');
  });

  it('auto-selects the first phone when rclone asks which number to text', async () => {
    const { rc, call } = fakeRc([
      { State: '2fa_do' },
      { State: '2fa_sms_select', Option: { Examples: [{ Value: '1_sms', Help: '+49 ••52' }, { Value: '2_sms' }] } },
      { State: '2fa_sms_1_sms', Option: { Help: 'Enter the verification code sent to +49 ••52' } },
    ]);
    const auth = new AuthService(rc);
    await auth.startLogin('a@b.de', 'pw');
    const res = await auth.submitTwoFactorCode('sms');
    expect(res).toEqual({ stage: 'awaiting-2fa', message: 'Apple hat einen Code per SMS an +49 ••52 gesendet.' });
    expect(call).toHaveBeenLastCalledWith('config/update', expect.objectContaining({
      opt: expect.objectContaining({ state: '2fa_sms_select', result: '1_sms', continue: true }),
    }));
  });
});

describe('friendlyAuthError', () => {
  it('extracts Apple service_errors messages', () => {
    const raw = 'authFederate: HTTP error 400 (Bad) returned body: "{\\"service_errors\\":[{\\"message\\":\\"Nope\\"}]}"';
    expect(friendlyAuthError(raw)).toBe('authFederate: HTTP error 400 (Bad): Nope');
  });
});
