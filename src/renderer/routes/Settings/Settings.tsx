import { useEffect, useState } from 'react';
import type { AppPreferences } from '@shared/ipc-types';
import { Toggle } from '../../components/Toggle';

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
    <div className="mx-auto max-w-lg p-8">
      <h1 className="mb-6 text-xl font-semibold">Einstellungen</h1>

      <section className="mb-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-2 text-sm font-medium">Verhalten</h2>

        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-sm">Beim Systemstart starten</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
            <p className="text-sm">In den Tray minimieren</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
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

      <section className="mb-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-2 text-sm font-medium">Konto</h2>
        <button
          type="button"
          onClick={handleLogout}
          disabled={busy}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:hover:bg-red-950"
        >
          Abmelden
        </button>
      </section>

      <section className="rounded-xl border border-neutral-200 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
        <h2 className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">Rechtlicher Hinweis</h2>
        <p>
          Diese App ist nicht von Apple autorisiert oder mit Apple verbunden. Sie nutzt die
          inoffizielle iCloud-Web-API über das Open-Source-Projekt rclone, um Zugriff auf iCloud
          Drive und Fotos zu ermöglichen. Apple kann diesen Zugriff jederzeit ändern oder blockieren.
        </p>
      </section>
    </div>
  );
}
