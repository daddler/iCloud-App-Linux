import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AppPreferences } from '@shared/ipc-types';
import { Toggle } from '../../components/Toggle';
import { useDavCredentials } from '../../hooks/useDavCredentials';
import { Spinner } from '../../components/Spinner';

export function Settings({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [busy, setBusy] = useState(false);
  const [preferences, setPreferences] = useState<AppPreferences | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.icloud.app.getPreferences().then((prefs) => {
      if (!cancelled) setPreferences(prefs);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    setBusy(true);
    try {
      await window.icloud.auth.logout();
      onLoggedOut();
    } finally {
      setBusy(false);
    }
  }

  async function handleAutostartChange(enabled: boolean) {
    setPreferences((prev) => (prev ? { ...prev, autostart: enabled } : prev));
    await window.icloud.app.setAutostart(enabled);
  }

  async function handleMinimizeToTrayChange(enabled: boolean) {
    setPreferences((prev) => (prev ? { ...prev, minimizeToTray: enabled } : prev));
    await window.icloud.app.setMinimizeToTray(enabled);
  }

  return (
    <div className="mx-auto w-full max-w-lg overflow-y-auto p-8">
      <h1 className="mb-6 text-xl font-extrabold tracking-tight text-nimbus-heading">Einstellungen</h1>

      <section className="mb-6 rounded-xl border border-nimbus-border bg-nimbus-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-nimbus-heading">Verhalten</h2>

        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-sm text-nimbus-text">Beim Systemstart starten</p>
            <p className="text-xs text-nimbus-subtle">
              Startet iCloud Explorer automatisch, wenn du dich anmeldest.
            </p>
          </div>
          <Toggle
            label="Beim Systemstart starten"
            checked={preferences?.autostart ?? false}
            disabled={!preferences}
            onChange={handleAutostartChange}
          />
        </div>

        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-sm text-nimbus-text">In den Tray minimieren</p>
            <p className="text-xs text-nimbus-subtle">
              Schließen minimiert das Fenster in den Tray, statt die App zu beenden.
            </p>
          </div>
          <Toggle
            label="In den Tray minimieren"
            checked={preferences?.minimizeToTray ?? false}
            disabled={!preferences}
            onChange={handleMinimizeToTrayChange}
          />
        </div>
      </section>

      <DavCredentialsSection />

      <section className="mb-6 rounded-xl border border-nimbus-border bg-nimbus-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-nimbus-heading">Konto</h2>
        <button
          type="button"
          onClick={handleLogout}
          disabled={busy}
          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-60"
        >
          Abmelden
        </button>
      </section>

      <section className="rounded-xl border border-nimbus-border bg-nimbus-surface p-4 text-sm text-nimbus-subtle">
        <h2 className="mb-2 text-sm font-semibold text-nimbus-heading">Rechtlicher Hinweis</h2>
        <p>
          Diese App ist nicht von Apple autorisiert oder mit Apple verbunden. Sie nutzt die
          inoffizielle iCloud-Web-API über das Open-Source-Projekt rclone, um Zugriff auf iCloud
          Drive und Fotos zu ermöglichen. Apple kann diesen Zugriff jederzeit ändern oder blockieren.
        </p>
      </section>
    </div>
  );
}

function DavCredentialsSection() {
  const queryClient = useQueryClient();
  const { data: hasCredentials, isLoading } = useDavCredentials();
  const [appleId, setAppleId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await window.icloud.davAuth.setCredentials(appleId, password);
      setAppleId('');
      setPassword('');
      await queryClient.invalidateQueries({ queryKey: ['davAuth'] });
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
      await queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    try {
      await window.icloud.davAuth.clearCredentials();
      await queryClient.invalidateQueries({ queryKey: ['davAuth'] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-nimbus-border bg-nimbus-surface p-4">
      <h2 className="mb-1 text-sm font-semibold text-nimbus-heading">Kontakte & Kalender</h2>
      <p className="mb-3 text-xs text-nimbus-subtle">
        Kontakte und Kalender werden über iCloud&apos;s CardDAV/CalDAV-Protokoll synchronisiert. Apple
        verlangt dafür ein separates{' '}
        <a href="https://appleid.apple.com" target="_blank" rel="noreferrer" className="text-nimbus-cyan">
          App-spezifisches Passwort
        </a>{' '}
        — nicht dein normales Apple-ID-Passwort.
      </p>

      {isLoading ? (
        <Spinner size={16} />
      ) : hasCredentials ? (
        <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm text-nimbus-text">
          <span>App-spezifisches Passwort ist eingerichtet.</span>
          <button
            type="button"
            onClick={handleClear}
            disabled={busy}
            className="text-xs font-semibold text-red-400 hover:underline disabled:opacity-60"
          >
            Entfernen
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <input
            type="email"
            required
            placeholder="Apple-ID"
            value={appleId}
            onChange={(e) => setAppleId(e.target.value)}
            className="w-full rounded-lg border border-nimbus-border bg-black/25 px-3 py-2 text-sm text-nimbus-text outline-none placeholder:text-nimbus-faint"
          />
          <input
            type="password"
            required
            placeholder="App-spezifisches Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-nimbus-border bg-black/25 px-3 py-2 text-sm text-nimbus-text outline-none placeholder:text-nimbus-faint"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-lg bg-nimbus-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy && <Spinner size={16} />}
            Speichern
          </button>
        </form>
      )}
    </section>
  );
}
