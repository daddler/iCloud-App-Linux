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
    <div className="flex h-full w-full items-center justify-center bg-neutral-50 dark:bg-neutral-900">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-800">
        {step === 'welcome' && (
          <>
            <h1 className="mb-2 text-xl font-semibold">iCloud Explorer</h1>
            <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-300">
              Diese App nutzt die inoffizielle iCloud-Weboberfläche über das Open-Source-Projekt{' '}
              <code>rclone</code>, um deine iCloud Drive-Dateien und Fotos unter Linux zugänglich zu machen.
              Sie ist nicht von Apple autorisiert oder mit Apple verbunden; Apple kann diesen Zugriff
              jederzeit ändern oder blockieren. Deine Zugangsdaten verlassen dein Gerät nur in Richtung
              der offiziellen iCloud-Server.
            </p>
            <button
              type="button"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => setStep('credentials')}
            >
              Weiter
            </button>
          </>
        )}

        {step === 'credentials' && (
          <form onSubmit={submitCredentials}>
            <h1 className="mb-4 text-lg font-semibold">Mit Apple-ID anmelden</h1>
            <label className="mb-1 block text-sm font-medium">Apple-ID</label>
            <input
              type="email"
              required
              value={appleId}
              onChange={(e) => setAppleId(e.target.value)}
              className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
              autoFocus
            />
            <label className="mb-1 block text-sm font-medium">Passwort</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
            />
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy && <Spinner size={16} />}
              Anmelden
            </button>
          </form>
        )}

        {step === 'twofactor' && (
          <form onSubmit={submitCode}>
            <h1 className="mb-2 text-lg font-semibold">Bestätigungscode</h1>
            <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
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
              className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-center text-lg tracking-widest dark:border-neutral-600 dark:bg-neutral-700"
              autoFocus
            />
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy && <Spinner size={16} />}
              Bestätigen
            </button>
          </form>
        )}

        {step === 'connecting' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Spinner />
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Verbinde mit iCloud...</p>
          </div>
        )}
      </div>
    </div>
  );
}
