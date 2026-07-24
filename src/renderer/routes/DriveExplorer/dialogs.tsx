import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';

export function NewFolderDialog({ onSubmit, onClose }: { onSubmit: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
    onClose();
  }
  return (
    <Modal title="Neuer Ordner" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-lg border border-nimbus-border bg-black/25 px-3 py-2 text-sm text-nimbus-text outline-none"
          placeholder="Ordnername"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-nimbus-subtle hover:bg-white/5">
            Abbrechen
          </button>
          <button type="submit" className="rounded-lg bg-nimbus-purple px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110">
            Erstellen
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function RenameDialog({
  currentName,
  onSubmit,
  onClose,
}: {
  currentName: string;
  onSubmit: (newName: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(currentName);
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim() && name.trim() !== currentName) onSubmit(name.trim());
    onClose();
  }
  return (
    <Modal title="Umbenennen" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-lg border border-nimbus-border bg-black/25 px-3 py-2 text-sm text-nimbus-text outline-none"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-nimbus-subtle hover:bg-white/5">
            Abbrechen
          </button>
          <button type="submit" className="rounded-lg bg-nimbus-purple px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110">
            Speichern
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmDeleteDialog({
  itemName,
  onConfirm,
  onClose,
}: {
  itemName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Löschen bestätigen" onClose={onClose}>
      <p className="mb-4 text-sm text-nimbus-subtle">
        Soll &bdquo;{itemName}&ldquo; wirklich gelöscht werden? Dies kann nicht rückgängig gemacht werden.
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-nimbus-subtle hover:bg-white/5">
          Abbrechen
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
        >
          Löschen
        </button>
      </div>
    </Modal>
  );
}
