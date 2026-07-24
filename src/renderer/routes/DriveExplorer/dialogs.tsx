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
          className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
          placeholder="Ordnername"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700">
            Abbrechen
          </button>
          <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
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
          className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-700"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700">
            Abbrechen
          </button>
          <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
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
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
        Soll &bdquo;{itemName}&ldquo; wirklich gelöscht werden? Dies kann nicht rückgängig gemacht werden.
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700">
          Abbrechen
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
        >
          Löschen
        </button>
      </div>
    </Modal>
  );
}
