import type { AppView, AuthStatus } from '@shared/ipc-types';
import { useDirectory } from '../routes/DriveExplorer/useDirectory';
import { useAlbums } from '../routes/PhotosGallery/useAlbums';
import { useContacts } from '../routes/Contacts/useContacts';
import { useCalendarEvents } from '../routes/Calendar/useCalendarEvents';
import { useStorageUsage } from '../hooks/useStorageUsage';
import { useMountStatus } from '../hooks/useMountStatus';
import { formatBytes } from '../lib/format';
import {
  CalendarIcon,
  ContactsIcon,
  DriveIcon,
  NotesIcon,
  PhotosIcon,
  RecentIcon,
  SharedIcon,
  TrashIcon,
} from './icons';

const TAG_COLORS = [
  { label: 'Wichtig', color: '#ff6b9d' },
  { label: 'Arbeit', color: '#f0b429' },
  { label: 'Familie', color: '#34d399' },
];

export function Sidebar({
  view,
  onNavigate,
  authStatus,
}: {
  view: AppView;
  onNavigate: (view: AppView) => void;
  authStatus: AuthStatus | null;
}) {
  const { data: rootEntries } = useDirectory('/');
  const { data: albums } = useAlbums();
  const { data: contacts } = useContacts();
  const { data: events } = useCalendarEvents();
  const { data: usage } = useStorageUsage();
  const { data: mountStatus } = useMountStatus();

  const documentsShare = usage && usage.totalBytes > 0 ? (usage.documentsBytes / usage.totalBytes) * 100 : 0;
  const mediaShare = usage && usage.totalBytes > 0 ? (usage.mediaBytes / usage.totalBytes) * 100 : 0;
  const otherShare = usage && usage.totalBytes > 0 ? (usage.otherBytes / usage.totalBytes) * 100 : 0;

  const connected = Boolean(authStatus?.isAuthenticated) && Boolean(mountStatus?.driveMounted);

  return (
    <aside className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto border-r border-nimbus-border bg-nimbus-sunken px-2.5 py-4">
      {/* Storage tile */}
      <div className="rounded-xl border border-nimbus-border bg-gradient-to-b from-[rgba(124,92,255,0.12)] to-[rgba(34,211,238,0.05)] p-3.5">
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-nimbus-subtle">
          Speicher
        </div>
        <div className="text-lg font-extrabold tracking-tight text-nimbus-heading">
          {usage ? formatBytes(usage.totalBytes) : '—'}
          <span className="ml-1 text-xs font-medium text-nimbus-faint">in iCloud Drive</span>
        </div>
        <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="bg-nimbus-purple" style={{ width: `${documentsShare}%` }} />
          <div className="bg-nimbus-cyan" style={{ width: `${mediaShare}%` }} />
          <div className="bg-nimbus-amber" style={{ width: `${otherShare}%` }} />
        </div>
        <div className="mt-2 flex gap-2.5 text-[10px] text-nimbus-subtle">
          <Legend color="#7c5cff" label="Dokumente" />
          <Legend color="#22d3ee" label="Medien" />
          <Legend color="#f0b429" label="Sonstiges" />
        </div>
      </div>

      <NavSection title="Bibliothek">
        <NavItem
          icon={<DriveIcon stroke={view === 'drive' ? '#7c5cff' : undefined} />}
          label="iCloud Drive"
          active={view === 'drive'}
          count={rootEntries?.length}
          onClick={() => onNavigate('drive')}
        />
        <NavItem
          icon={<PhotosIcon stroke="#ff6b9d" />}
          label="Fotos"
          active={view === 'photos'}
          count={albums?.length}
          onClick={() => onNavigate('photos')}
        />
        <NavItem
          icon={<ContactsIcon stroke="#22d3ee" />}
          label="Kontakte"
          active={view === 'contacts'}
          count={contacts?.length}
          onClick={() => onNavigate('contacts')}
        />
        <NavItem
          icon={<CalendarIcon stroke="#f0b429" />}
          label="Kalender"
          active={view === 'calendar'}
          count={events?.length}
          onClick={() => onNavigate('calendar')}
        />
        <NavItem icon={<NotesIcon stroke="#34d399" />} label="Notizen" disabled disabledHint="Bald verfügbar" />
      </NavSection>

      <NavSection title="Ansichten">
        <NavItem
          icon={<RecentIcon />}
          label="Zuletzt"
          active={view === 'recents'}
          onClick={() => onNavigate('recents')}
        />
        <NavItem icon={<SharedIcon />} label="Geteilt" disabled disabledHint="Nicht verfügbar" />
        <NavItem icon={<TrashIcon />} label="Papierkorb" disabled disabledHint="Nicht verfügbar" />
      </NavSection>

      <div>
        <div className="flex items-center justify-between px-2.5 pb-2">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-nimbus-faint">Tags</div>
          <div className="cursor-not-allowed text-sm text-nimbus-disabled" title="Nicht verfügbar">
            +
          </div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {TAG_COLORS.map((tag) => (
            <div
              key={tag.label}
              title="Nicht verfügbar"
              className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] text-nimbus-disabled"
            >
              <span className="h-2 w-2 rounded-sm opacity-40" style={{ background: tag.color }} />
              <span>{tag.label}</span>
            </div>
          ))}
        </nav>
      </div>

      <button
        type="button"
        onClick={() => onNavigate('settings')}
        className="mt-auto flex items-center gap-2.5 rounded-[10px] border border-nimbus-border bg-black/35 px-3 py-2.5 text-left"
      >
        <span className="relative h-2 w-2 flex-shrink-0">
          <span
            className={`absolute inset-0 rounded-full ${connected ? 'bg-nimbus-green' : 'bg-nimbus-disabled'}`}
            style={connected ? { boxShadow: '0 0 8px rgba(52,211,153,0.6)' } : undefined}
          />
        </span>
        <span className="min-w-0">
          <div className="text-[11.5px] font-semibold text-nimbus-text">
            {connected ? 'Verbunden' : 'Nicht verbunden'}
          </div>
          <div className="truncate font-mono text-[9.5px] text-nimbus-faint">
            {authStatus?.appleIdMasked ?? '—'}
          </div>
        </span>
      </button>
    </aside>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-2.5 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-nimbus-faint">
        {title}
      </div>
      <nav className="flex flex-col gap-0.5">{children}</nav>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  count,
  onClick,
  disabled,
  disabledHint,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  if (disabled) {
    return (
      <div
        title={disabledHint}
        className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-nimbus-disabled"
      >
        {icon}
        <span>{label}</span>
        {disabledHint && <span className="ml-auto text-[10px]">{disabledHint}</span>}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] ${
        active
          ? 'bg-nimbus-purple/[0.14] font-semibold text-nimbus-heading'
          : 'text-nimbus-text/80 hover:bg-white/[0.04]'
      }`}
    >
      {active && <span className="absolute bottom-[9px] left-0 top-[9px] w-0.5 rounded-full bg-nimbus-purple" />}
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className="ml-auto font-mono text-[10px] text-nimbus-subtle">{count}</span>
      )}
    </button>
  );
}
