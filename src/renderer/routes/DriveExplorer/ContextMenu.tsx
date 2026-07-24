import { useEffect, useRef } from 'react';
import type { DirEntry } from '@shared/ipc-types';

export interface ContextMenuState {
  entry: DirEntry;
  x: number;
  y: number;
}

export function ContextMenu({
  state,
  onClose,
  onOpen,
  onRename,
  onDelete,
  onReveal,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onOpen: (entry: DirEntry) => void;
  onRename: (entry: DirEntry) => void;
  onDelete: (entry: DirEntry) => void;
  onReveal: (entry: DirEntry) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const items: Array<{ label: string; action: () => void }> = [
    { label: state.entry.kind === 'directory' ? 'Öffnen' : 'Öffnen & Bearbeiten', action: () => onOpen(state.entry) },
    { label: 'Umbenennen', action: () => onRename(state.entry) },
    { label: 'Im Dateimanager anzeigen', action: () => onReveal(state.entry) },
    { label: 'Löschen', action: () => onDelete(state.entry) },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 w-56 rounded-lg border border-neutral-200 bg-white py-1 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
      style={{ left: state.x, top: state.y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className="block w-full px-3 py-1.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700"
          onClick={() => {
            item.action();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
