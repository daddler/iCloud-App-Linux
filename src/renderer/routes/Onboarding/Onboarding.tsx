import { useState, type FormEvent } from 'react';
import { Spinner } from '../../components/Spinner';

type Step = 'welcome' | 'credentials' | 'twofactor' | 'connecting';

export function Onboarding({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [step, setStep] = useState<Step>('welcome');
  const [appleId, setAppleId] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitCredentials(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await window.icloud.auth.startLogin(appleId, password);
      if (result.stage === 'awaiting-2fa') {
        setStep('twofactor');
      } else if (result.stage === 'authenticated') {
        onAuthenticated();
      } else {
        setError(result.message ?? 'Anmeldung fehlgeschlagen.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await window.icloud.auth.submitTwoFactorCode(code);
      if (result.stage === 'authenticated') {
        onAuthenticated();
      } else if (result.stage === 'awaiting-2fa') {
        setError(result.message ?? 'Bitte erneut versuchen.');
        setCode('');
      } else {
        setError(result.message ?? 'Verifizierung fehlgeschlagen.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center bg-nimbus-bg"
      style={{
        background:
          'radial-gradient(900px 500px at 12% -10%, rgba(120,90,255,0.18), transparent 60%), radial-gradient(700px 500px at 100% 100%, rgba(0,200,180,0.10), transparent 55%), linear-gradient(180deg, #0b0d12 0%, #0a0c11 100%)',
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-nimbus-border bg-nimbus-surface p-8 shadow-2xl">
        <div className="mb-5 flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ background: 'conic-gradient(from 210deg at 50% 50%, #7c5cff, #22d3ee, #7c5cff)' }}
          >
            <div className="h-2.5 w-2.5 rounded-sm bg-nimbus-bg" />
          </div>
          <div className="text-base font-extrabold tracking-tight text-nimbus-heading">
            Nimbus<span className="text-nimbus-purple">.</span>
          </div>
        </div>

        {step === 'welcome' && (
          <>
            <h1 className="mb-2 text-xl font-bold text-nimbus-heading">iCloud Explorer</h1>
            <p className="mb-6 text-sm text-nimbus-subtle">
              Diese App nutzt die inoffizielle iCloud-Weboberfläche über das Open-Source-Projekt{' '}
              <code className="text-nimbus-cyan">rclone</code>, um deine iCloud Drive-Dateien und Fotos unter
              Linux zugänglich zu machen. Sie ist nicht von Apple autorisiert oder mit Apple verbunden; Apple
              kann diesen Zugriff jederzeit ändern oder blockieren. Deine Zugangsdaten verlassen dein Gerät nur
              in Richtung der offiziellen iCloud-Server.
            </p>
            <button
              type="button"
              className="w-full rounded-lg bg-nimbus-purple px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
              onClick={() => setStep('credentials')}
            >
              Weiter
            </button>
          </>
        )}

        {step === 'credentials' && (
          <form onSubmit={submitCredentials}>
            <h1 className="mb-4 text-lg font-bold text-nimbus-heading">Mit Apple-ID anmelden</h1>
            <label className="mb-1 block text-sm font-medium text-nimbus-text">Apple-ID</label>
            <input
              type="email"
              required
              value={appleId}
              onChange={(e) => setAppleId(e.target.value)}
              className="mb-3 w-full rounded-lg border border-nimbus-border bg-black/25 px-3 py-2 text-sm text-nimbus-text outline-none"
              autoFocus
            />
            <label className="mb-1 block text-sm font-medium text-nimbus-text">Passwort</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 w-full rounded-lg border border-nimbus-border bg-black/25 px-3 py-2 text-sm text-nimbus-text outline-none"
            />
            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-nimbus-purple px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {busy && <Spinner size={16} />}
              Anmelden
            </button>
          </form>
        )}

        {step === 'twofactor' && (
          <form onSubmit={submitCode}>
            <h1 className="mb-2 text-lg font-bold text-nimbus-heading">Bestätigungscode</h1>
            <p className="mb-4 text-sm text-nimbus-subtle">
              Apple hat einen Code an eines deiner vertrauenswürdigen Geräte gesendet. Gib ihn unten ein.
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="mb-4 w-full rounded-lg border border-nimbus-border bg-black/25 px-3 py-2 text-center font-mono text-lg tracking-widest text-nimbus-text outline-none"
              autoFocus
            />
            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-nimbus-purple px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {busy && <Spinner size={16} />}
              Bestätigen
            </button>
          </form>
        )}

        {step === 'connecting' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Spinner />
            <p className="text-sm text-nimbus-subtle">Verbinde mit iCloud...</p>
          </div>
        )}
      </div>
    </div>
  );
}
