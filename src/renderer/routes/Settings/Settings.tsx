import { useState } from 'react';

export function Settings({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await window.icloud.auth.logout();
      onLoggedOut();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="mb-6 text-xl font-semibold">Einstellungen</h1>

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
