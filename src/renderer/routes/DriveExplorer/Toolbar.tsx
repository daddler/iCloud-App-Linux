export function Toolbar({
  search,
  onSearchChange,
  onNewFolder,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onNewFolder: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
      <button
        type="button"
        onClick={onNewFolder}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
      >
        Neuer Ordner
      </button>
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="In diesem Ordner suchen..."
        className="ml-auto w-64 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-800"
      />
    </div>
  );
}
