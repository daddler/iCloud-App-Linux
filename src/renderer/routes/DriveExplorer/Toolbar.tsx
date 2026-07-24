import { useRef } from 'react';
import { formatRelativeTime } from '../../lib/format';
import { CheckIcon, CompactViewIcon, FolderPlusIcon, GridViewIcon, ListViewIcon, UploadIcon } from '../../components/icons';
import type { ViewMode } from './FileList';

export function Toolbar({
  title,
  itemCount,
  totalSize,
  lastSyncedAt,
  viewMode,
  onViewModeChange,
  onNewFolder,
  onUploadFiles,
}: {
  title: string;
  itemCount: number;
  totalSize: string;
  lastSyncedAt: number | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNewFolder: () => void;
  onUploadFiles: (paths: string[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const paths = Array.from(e.target.files ?? [])
      .map((file) => window.icloud.transfer.getPathForFile(file))
      .filter(Boolean);
    if (paths.length > 0) onUploadFiles(paths);
    e.target.value = '';
  }

  return (
    <div className="flex flex-shrink-0 items-end justify-between gap-4 border-b border-nimbus-border px-6 pb-4 pt-5">
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <div className="font-mono text-[10.5px] tracking-[0.08em] text-nimbus-purple">{'// ICLOUD_DRIVE'}</div>
          {lastSyncedAt !== null && (
            <div className="flex items-center gap-1.5 rounded-full bg-nimbus-green/10 px-2 py-0.5 text-[10.5px] font-semibold text-nimbus-green">
              <CheckIcon width={10} height={10} strokeWidth={3} />
              Sync · {formatRelativeTime(lastSyncedAt)}
            </div>
          )}
        </div>
        <h1 className="m-0 text-2xl font-extrabold tracking-tight text-nimbus-heading">{title}</h1>
        <div className="mt-1 text-xs text-nimbus-subtle">
          {itemCount} Objekte · {totalSize}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-[9px] border border-nimbus-border bg-white/[0.04] p-0.5">
          <ViewModeButton mode="list" current={viewMode} onClick={onViewModeChange}>
            <ListViewIcon width={13} height={13} />
          </ViewModeButton>
          <ViewModeButton mode="grid" current={viewMode} onClick={onViewModeChange}>
            <GridViewIcon width={13} height={13} />
          </ViewModeButton>
          <ViewModeButton mode="compact" current={viewMode} onClick={onViewModeChange}>
            <CompactViewIcon width={13} height={13} />
          </ViewModeButton>
        </div>

        <button
          type="button"
          onClick={onNewFolder}
          className="flex h-[34px] items-center gap-1.5 rounded-[9px] border border-nimbus-borderStrong bg-white/[0.03] px-3.5 text-[12.5px] font-semibold text-nimbus-text"
        >
          <FolderPlusIcon width={13} height={13} />
          Ordner
        </button>

        <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileInputChange} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-[34px] items-center gap-1.5 rounded-[9px] px-3.5 text-[12.5px] font-bold text-white shadow-[0_6px_20px_rgba(124,92,255,0.35)]"
          style={{ background: 'linear-gradient(135deg, #7c5cff, #5a3fff)' }}
        >
          <UploadIcon width={13} height={13} strokeWidth={2.4} />
          Hochladen
        </button>
      </div>
    </div>
  );
}

function ViewModeButton({
  mode,
  current,
  onClick,
  children,
}: {
  mode: ViewMode;
  current: ViewMode;
  onClick: (mode: ViewMode) => void;
  children: React.ReactNode;
}) {
  const active = mode === current;
  return (
    <button
      type="button"
      onClick={() => onClick(mode)}
      className={`flex h-[26px] w-[30px] items-center justify-center rounded-md ${
        active ? 'bg-nimbus-purple/20 text-nimbus-purpleSoft' : 'text-nimbus-faint'
      }`}
    >
      {children}
    </button>
  );
}

export function FilterPills({
  active,
  counts,
  onChange,
}: {
  active: 'all' | 'folders' | 'documents' | 'media';
  counts: { all: number; folders: number; documents: number; media: number };
  onChange: (value: 'all' | 'folders' | 'documents' | 'media') => void;
}) {
  const pills: Array<{ key: typeof active; label: string }> = [
    { key: 'all', label: 'Alle' },
    { key: 'folders', label: 'Ordner' },
    { key: 'documents', label: 'Dokumente' },
    { key: 'media', label: 'Medien' },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-nimbus-border px-6 py-3">
      {pills.map((pill) => (
        <button
          key={pill.key}
          type="button"
          onClick={() => onChange(pill.key)}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] ${
            active === pill.key
              ? 'bg-nimbus-purple/[0.14] font-semibold text-nimbus-purpleSoft'
              : 'text-nimbus-subtle hover:bg-white/[0.04]'
          }`}
        >
          {pill.label} <span className="font-mono opacity-70">{counts[pill.key]}</span>
        </button>
      ))}
    </div>
  );
}
