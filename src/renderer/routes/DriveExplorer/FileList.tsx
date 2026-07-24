import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DirEntry } from '@shared/ipc-types';

function formatSize(bytes: number): string {
  if (bytes === 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

export function FileList({
  entries,
  onOpen,
  onContextMenu,
}: {
  entries: DirEntry[];
  onOpen: (entry: DirEntry) => void;
  onContextMenu: (entry: DirEntry, x: number, y: number) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div className="sticky top-0 z-10 grid grid-cols-[1fr,100px,180px] gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium uppercase text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
        <span>Name</span>
        <span>Größe</span>
        <span>Geändert</span>
      </div>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const entry = entries[virtualRow.index];
          return (
            <div
              key={entry.path}
              className="absolute left-0 top-0 grid w-full grid-cols-[1fr,100px,180px] items-center gap-2 px-3 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
              onDoubleClick={() => onOpen(entry)}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(entry, e.clientX, e.clientY);
              }}
            >
              <span className="truncate">
                <span
                  className={`mr-2 inline-block h-2.5 w-2.5 rounded-sm ${
                    entry.kind === 'directory' ? 'bg-blue-400' : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                />
                {entry.name}
              </span>
              <span className="text-neutral-500">{entry.kind === 'file' ? formatSize(entry.size) : ''}</span>
              <span className="text-neutral-500">{formatDate(entry.modifiedAt)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
