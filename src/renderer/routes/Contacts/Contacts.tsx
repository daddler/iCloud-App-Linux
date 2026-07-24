import { useMemo } from 'react';
import { useContacts } from './useContacts';
import { useDavCredentials } from '../../hooks/useDavCredentials';
import { Spinner } from '../../components/Spinner';
import { ContactsIcon } from '../../components/icons';

export function Contacts({ search, onOpenSettings }: { search: string; onOpenSettings: () => void }) {
  const { data: hasCredentials } = useDavCredentials();
  const { data: contacts, isLoading, error } = useContacts();

  const visible = useMemo(() => {
    if (!contacts) return [];
    if (!search.trim()) return contacts;
    const needle = search.trim().toLowerCase();
    return contacts.filter(
      (c) =>
        c.fullName.toLowerCase().includes(needle) ||
        c.emails.some((e) => e.toLowerCase().includes(needle)),
    );
  }, [contacts, search]);

  return (
    <div className="flex h-full flex-col bg-nimbus-bg">
      <div className="flex-shrink-0 border-b border-nimbus-border px-6 py-5">
        <div className="font-mono text-[10.5px] tracking-[0.08em] text-nimbus-cyan">{'// CONTACTS'}</div>
        <h1 className="m-0 mt-1.5 text-2xl font-extrabold tracking-tight text-nimbus-heading">Kontakte</h1>
        <div className="mt-1 text-xs text-nimbus-subtle">Über CardDAV synchronisiert (contacts.icloud.com)</div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {hasCredentials === false && <EmptyState onOpenSettings={onOpenSettings} />}
        {hasCredentials === true && isLoading && (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        )}
        {hasCredentials === true && error && (
          <div className="flex h-full items-center justify-center text-sm text-red-400">
            {(error as Error).message}
          </div>
        )}
        {hasCredentials === true && !isLoading && !error && (
          <div className="flex flex-col gap-1">
            {visible.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3.5 rounded-[10px] border border-transparent px-3 py-2.5 hover:border-nimbus-purple/15 hover:bg-nimbus-purple/[0.06]"
              >
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-nimbus-bg"
                  style={{ background: 'linear-gradient(135deg, #22d3ee, #7c5cff)' }}
                >
                  {contact.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-nimbus-text">{contact.fullName}</div>
                  <div className="truncate font-mono text-[11px] text-nimbus-faint">
                    {[...contact.emails, ...contact.phones].join(' · ') || '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <ContactsIcon width={28} height={28} className="text-nimbus-faint" />
      <p className="max-w-xs text-sm text-nimbus-subtle">
        Kontakte benötigen ein App-spezifisches Passwort für CardDAV. Richte es in den Einstellungen ein.
      </p>
      <button
        type="button"
        onClick={onOpenSettings}
        className="rounded-lg bg-nimbus-purple px-3.5 py-1.5 text-sm font-semibold text-white"
      >
        Zu den Einstellungen
      </button>
    </div>
  );
}
