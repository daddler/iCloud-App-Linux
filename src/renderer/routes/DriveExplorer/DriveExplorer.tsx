import { useMemo, useState, type DragEvent } from 'react';
import type { DirEntry, TransferProgress } from '@shared/ipc-types';
import { Toolbar, FilterPills } from './Toolbar';
import { FileList, type ViewMode } from './FileList';
import { ContextMenu, type ContextMenuState } from './ContextMenu';
import { NewFolderDialog, RenameDialog, ConfirmDeleteDialog } from './dialogs';
import { useDirectory } from './useDirectory';
import { useFileOps, joinPath } from './useFileOps';
import { Spinner } from '../../components/Spinner';
import { TransferToast } from '../../components/Toast';
import { StatusBar } from '../../components/StatusBar';
import { categoryOf } from '../../lib/fileKind';
import { formatBytes } from '../../lib/format';

type FilterKey = 'all' | 'folders' | 'documents' | 'media';

export function DriveExplorer({
  path,
  onNavigate,
  search,
}: {
  path: string;
  onNavigate: (path: string) => void;
  search: string;
}) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DirEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DirEntry | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [transfers, setTransfers] = useState<Record<string, TransferProgress>>({});

  const { data: entries, isLoading, error, dataUpdatedAt } = useDirectory(path);
  const { mkdir, rename, remove } = useFileOps(path);

  const counts = useMemo(() => {
    const result = { all: 0, folders: 0, documents: 0, media: 0 };
    for (const entry of entries ?? []) {
      result.all += 1;
      if (categoryOf(entry) === 'folder') result.folders += 1;
      else if (categoryOf(entry) === 'document') result.documents += 1;
      else if (categoryOf(entry) === 'media') result.media += 1;
    }
    return result;
  }, [entries]);

  const totalSize = useMemo(
    () => formatBytes((entries ?? []).reduce((sum, e) => sum + e.size, 0)),
    [entries],
  );

  const visibleEntries = useMemo(() => {
    if (!entries) return [];
    let result = entries;
    if (filter !== 'all') {
      const wanted = filter === 'folders' ? 'folder' : filter === 'documents' ? 'document' : 'media';
      result = result.filter((e) => categoryOf(e) === wanted);
    }
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(needle));
    }
    return result;
  }, [entries, filter, search]);

  function handleOpen(entry: DirEntry) {
    if (entry.kind === 'directory') {
      onNavigate(entry.path);
    } else {
      void window.icloud.fs.openPath(entry.path);
    }
  }

  function trackTransfer(jobId: string) {
    window.icloud.transfer.onProgress(jobId, (progress) => {
      setTransfers((prev) => ({ ...prev, [jobId]: progress }));
      if (progress.phase === 'done' || progress.phase === 'error') {
        setTimeout(() => {
          setTransfers((prev) => {
            const next = { ...prev };
            delete next[jobId];
            return next;
          });
        }, 4000);
      }
    });
  }

  async function uploadPaths(paths: string[]) {
    if (paths.length === 0) return;
    const { jobId } = await window.icloud.transfer.copyIn(paths, path);
    if (jobId) trackTransfer(jobId);
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const paths = Array.from(e.dataTransfer.files)
      .map((file) => window.icloud.transfer.getPathForFile(file))
      .filter(Boolean);
    await uploadPaths(paths);
  }

  return (
    <div
      className="relative flex h-full min-w-0 flex-col bg-nimbus-bg"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <Toolbar
        title={path === '/' ? 'Alle Dateien' : (path.split('/').filter(Boolean).pop() ?? 'Alle Dateien')}
        itemCount={counts.all}
        totalSize={totalSize}
        lastSyncedAt={dataUpdatedAt || null}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNewFolder={() => setShowNewFolder(true)}
        onUploadFiles={(paths) => void uploadPaths(paths)}
      />
      <FilterPills active={filter} counts={counts} onChange={setFilter} />

      <div className="relative flex-1 overflow-hidden">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center text-sm text-red-400">
            {(error as Error).message}
          </div>
        )}
        {!isLoading && !error && (
          <FileList
            entries={visibleEntries}
            viewMode={viewMode}
            onOpen={handleOpen}
            onContextMenu={(entry, x, y) => setMenu({ entry, x, y })}
          />
        )}

        {isDragOver && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-4 border-dashed border-nimbus-purple bg-nimbus-purple/10">
            <span className="rounded-lg bg-nimbus-purple px-4 py-2 text-sm font-medium text-white">
              Dateien hier ablegen, um sie hochzuladen
            </span>
          </div>
        )}
      </div>

      <StatusBar itemCount={counts.all} path={path} />

      <div className="pointer-events-none absolute bottom-10 right-4 flex flex-col gap-2">
        {Object.values(transfers).map((progress) => (
          <div key={progress.jobId} className="pointer-events-auto">
            <TransferToast progress={progress} />
          </div>
        ))}
      </div>

      {menu && (
        <ContextMenu
          state={menu}
          onClose={() => setMenu(null)}
          onOpen={handleOpen}
          onRename={setRenameTarget}
          onDelete={setDeleteTarget}
          onReveal={(entry) => void window.icloud.fs.revealInFileManager(entry.path)}
        />
      )}

      {showNewFolder && (
        <NewFolderDialog onSubmit={(name) => mkdir.mutate(name)} onClose={() => setShowNewFolder(false)} />
      )}

      {renameTarget && (
        <RenameDialog
          currentName={renameTarget.name}
          onSubmit={(newName) => rename.mutate({ from: renameTarget.path, to: joinPath(path, newName) })}
          onClose={() => setRenameTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          itemName={deleteTarget.name}
          onConfirm={() => remove.mutate({ path: deleteTarget.path, recursive: deleteTarget.kind === 'directory' })}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
