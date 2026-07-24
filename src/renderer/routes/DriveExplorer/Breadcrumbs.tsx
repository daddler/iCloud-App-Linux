export function Breadcrumbs({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) {
  const segments = path.split('/').filter(Boolean);

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        type="button"
        className="rounded px-2 py-1 font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700"
        onClick={() => onNavigate('/')}
      >
        iCloud Drive
      </button>
      {segments.map((segment, index) => {
        const segmentPath = `/${segments.slice(0, index + 1).join('/')}`;
        return (
          <span key={segmentPath} className="flex items-center gap-1">
            <span className="text-neutral-400">/</span>
            <button
              type="button"
              className="rounded px-2 py-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              onClick={() => onNavigate(segmentPath)}
            >
              {segment}
            </button>
          </span>
        );
      })}
    </div>
  );
}
