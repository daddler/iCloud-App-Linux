import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DirEntry } from '@shared/ipc-types';
import { formatBytes, formatDate } from '../../lib/format';
import { iconFor } from '../../lib/fileKind';
import { MoreIcon } from '../../components/icons';

export type ViewMode = 'list' | 'grid' | 'compact';

export function FileList({
  entries,
  viewMode,
  onOpen,
  onContextMenu,
}: {
  entries: DirEntry[];
  viewMode: ViewMode;
  onOpen: (entry: DirEntry) => void;
  onContextMenu: (entry: DirEntry, x: number, y: number) => void;
}) {
  if (viewMode === 'grid') {
    return <GridList entries={entries} onOpen={onOpen} onContextMenu={onContextMenu} />;
  }
  return <RowList entries={entries} compact={viewMode === 'compact'} onOpen={onOpen} onContextMenu={onContextMenu} />;
}

function RowList({
  entries,
  compact,
  onOpen,
  onContextMenu,
}: {
  entries: DirEntry[];
  compact: boolean;
  onOpen: (entry: DirEntry) => void;
  onContextMenu: (entry: DirEntry, x: number, y: number) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowHeight = compact ? 28 : 48;
  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto px-3.5 pb-3">
      <div className="sticky top-0 z-10 grid grid-cols-[1fr_110px_150px_30px] gap-2 bg-nimbus-bg px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-nimbus-faint">
        <div>Name</div>
        <div>Größe</div>
        <div>Geändert</div>
        <div />
      </div>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const entry = entries[virtualRow.index];
          const icon = iconFor(entry);
          return (
            <div
              key={entry.path}
              className="group absolute left-0 top-0 grid w-full grid-cols-[1fr_110px_150px_30px] items-center gap-2 rounded-[10px] border border-transparent px-3 text-[13px] text-nimbus-text hover:border-nimbus-purple/15 hover:bg-nimbus-purple/[0.06]"
              style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
              onDoubleClick={() => onOpen(entry)}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(entry, e.clientX, e.clientY);
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                {!compact && (
                  <div
                    className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg text-nimbus-bg"
                    style={{ background: icon.gradient }}
                  >
                    <span className="text-[9.5px] font-extrabold tracking-wide">{icon.label}</span>
                  </div>
                )}
                <span
                  className={`truncate ${entry.kind === 'directory' ? 'font-bold' : 'font-medium'}`}
                >
                  {entry.name}
                </span>
              </div>
              <div className="font-mono text-[11.5px] text-nimbus-subtle">
                {entry.kind === 'file' ? formatBytes(entry.size) : '—'}
              </div>
              <div className="font-mono text-[11.5px] text-nimbus-subtle">{formatDate(entry.modifiedAt)}</div>
              <div className="flex justify-center text-nimbus-faint">
                <MoreIcon width={14} height={14} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GridList({
  entries,
  onOpen,
  onContextMenu,
}: {
  entries: DirEntry[];
  onOpen: (entry: DirEntry) => void;
  onContextMenu: (entry: DirEntry, x: number, y: number) => void;
}) {
  return (
    <div className="grid h-full auto-rows-min grid-cols-[repeat(auto-fill,minmax(112px,1fr))] items-start gap-3 overflow-y-auto p-4">
      {entries.map((entry) => {
        const icon = iconFor(entry);
        return (
          <div
            key={entry.path}
            className="flex cursor-default flex-col items-center gap-2 rounded-xl border border-transparent p-2.5 text-center hover:border-nimbus-purple/15 hover:bg-nimbus-purple/[0.06]"
            onDoubleClick={() => onOpen(entry)}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(entry, e.clientX, e.clientY);
            }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-nimbus-bg"
              style={{ background: icon.gradient }}
            >
              <span className="text-[11px] font-extrabold tracking-wide">{icon.label}</span>
            </div>
            <span className="line-clamp-2 w-full break-words text-[12px] text-nimbus-text">{entry.name}</span>
          </div>
        );
      })}
    </div>
  );
}
