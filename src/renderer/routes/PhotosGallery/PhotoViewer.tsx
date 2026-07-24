import type { PhotoAsset } from '@shared/ipc-types';

export function PhotoViewer({
  assets,
  index,
  onClose,
  onNavigate,
  onDownload,
}: {
  assets: PhotoAsset[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDownload: (asset: PhotoAsset) => void;
}) {
  const asset = assets[index];
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="truncate text-sm">{asset.filename}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDownload(asset)}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
          >
            Herunterladen
          </button>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
            Schließen
          </button>
        </div>
      </div>
      <div className="relative flex flex-1 items-center justify-center">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onNavigate(index - 1)}
          className="absolute left-4 rounded-full bg-white/10 px-3 py-2 disabled:opacity-30"
        >
          {'<'}
        </button>
        <img
          src={`icloud-media://photos/${encodeURIComponent(asset.path)}`}
          alt={asset.filename}
          className="max-h-full max-w-full object-contain"
        />
        <button
          type="button"
          disabled={index === assets.length - 1}
          onClick={() => onNavigate(index + 1)}
          className="absolute right-4 rounded-full bg-white/10 px-3 py-2 disabled:opacity-30"
        >
          {'>'}
        </button>
      </div>
    </div>
  );
}
