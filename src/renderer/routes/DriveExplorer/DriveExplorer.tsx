import { useMemo, useState, type DragEvent } from 'react';
import type { DirEntry, TransferProgress } from '@shared/ipc-types';
import { Breadcrumbs } from './Breadcrumbs';
import { Toolbar } from './Toolbar';
import { FileList } from './FileList';
import { ContextMenu, type ContextMenuState } from './ContextMenu';
import { NewFolderDialog, RenameDialog, ConfirmDeleteDialog } from './dialogs';
import { useDirectory } from './useDirectory';
import { useFileOps, joinPath } from './useFileOps';
import { Spinner } from '../../components/Spinner';
import { TransferToast } from '../../components/Toast';

export function DriveExplorer() {
  const [path, setPath] = useState('/');
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DirEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DirEntry | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [transfers, setTransfers] = useState<Record<string, TransferProgress>>({});

  const { data: entries, isLoading, error } = useDirectory(path);
  const { mkdir, rename, remove } = useFileOps(path);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (!search.trim()) return entries;
    return entries.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()));
  }, [entries, search]);

  function handleOpen(entry: DirEntry) {
    if (entry.kind === 'directory') {
      setPath(entry.path);
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

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const paths = Array.from(e.dataTransfer.files)
      .map((file) => window.icloud.transfer.getPathForFile(file))
      .filter(Boolean);
    if (paths.length === 0) return;
    const { jobId } = await window.icloud.transfer.copyIn(paths, path);
    if (jobId) trackTransfer(jobId);
  }

  return (
    <div
      className="relative flex h-full flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <Breadcrumbs path={path} onNavigate={setPath} />
      </div>
      <Toolbar search={search} onSearchChange={setSearch} onNewFolder={() => setShowNewFolder(true)} />

      <div className="relative flex-1 overflow-hidden">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center text-sm text-red-600">
            {(error as Error).message}
          </div>
        )}
        {!isLoading && !error && (
          <FileList
            entries={filteredEntries}
            onOpen={handleOpen}
            onContextMenu={(entry, x, y) => setMenu({ entry, x, y })}
          />
        )}

        {isDragOver && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-4 border-dashed border-blue-500 bg-blue-500/10">
            <span className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              Dateien hier ablegen, um sie hochzuladen
            </span>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 flex flex-col gap-2">
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
          onSubmit={(newName) =>
            rename.mutate({ from: renameTarget.path, to: joinPath(path, newName) })
          }
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
