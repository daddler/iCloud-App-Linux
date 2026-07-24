import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DirEntry } from '@shared/ipc-types';
import { useRecent } from '../../hooks/useRecent';
import { FileList } from '../DriveExplorer/FileList';
import { ContextMenu, type ContextMenuState } from '../DriveExplorer/ContextMenu';
import { RenameDialog, ConfirmDeleteDialog } from '../DriveExplorer/dialogs';
import { Spinner } from '../../components/Spinner';

export function Recents({ search }: { search: string }) {
  const { data: recent, isLoading, error } = useRecent(200);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [renameTarget, setRenameTarget] = useState<DirEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DirEntry | null>(null);
  const queryClient = useQueryClient();

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['recent'] });
  }

  const entries: DirEntry[] = useMemo(
    () => (recent ?? []).map((r) => ({ name: r.name, path: r.path, kind: 'file' as const, size: r.size, modifiedAt: r.modifiedAt })),
    [recent],
  );

  const visible = useMemo(() => {
    if (!search.trim()) return entries;
    const needle = search.trim().toLowerCase();
    return entries.filter((e) => e.name.toLowerCase().includes(needle));
  }, [entries, search]);

  function handleOpen(entry: DirEntry) {
    void window.icloud.fs.openPath(entry.path);
  }

  return (
    <div className="flex h-full flex-col bg-nimbus-bg">
      <div className="flex-shrink-0 border-b border-nimbus-border px-6 py-5">
        <div className="font-mono text-[10.5px] tracking-[0.08em] text-nimbus-purple">{'// RECENTS'}</div>
        <h1 className="m-0 mt-1.5 text-2xl font-extrabold tracking-tight text-nimbus-heading">Zuletzt</h1>
        <div className="mt-1 text-xs text-nimbus-subtle">
          Die {visible.length} zuletzt geänderten Dateien in iCloud Drive
        </div>
      </div>
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
            entries={visible}
            viewMode="list"
            onOpen={handleOpen}
            onContextMenu={(entry, x, y) => setMenu({ entry, x, y })}
          />
        )}
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

      {renameTarget && (
        <RenameDialog
          currentName={renameTarget.name}
          onSubmit={async (newName) => {
            const parent = renameTarget.path.slice(0, renameTarget.path.length - renameTarget.name.length);
            await window.icloud.fs.rename(renameTarget.path, `${parent}${newName}`);
            await invalidate();
          }}
          onClose={() => setRenameTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          itemName={deleteTarget.name}
          onConfirm={async () => {
            await window.icloud.fs.remove(deleteTarget.path, false);
            await invalidate();
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
