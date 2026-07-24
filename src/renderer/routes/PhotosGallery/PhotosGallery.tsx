import { useState } from 'react';
import { PhotoGrid } from './PhotoGrid';
import { PhotoViewer } from './PhotoViewer';
import { useAlbum } from './useAlbum';
import { Spinner } from '../../components/Spinner';

const ALBUMS = ['All Photos', 'Favorites', 'Recently Added'];

export function PhotosGallery() {
  const [album, setAlbum] = useState(ALBUMS[0]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { data: assets, isLoading, error } = useAlbum(album);

  async function handleDownload() {
    if (viewerIndex === null || !assets) return;
    await window.icloud.photos.download([assets[viewerIndex].path]);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        {ALBUMS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setAlbum(name)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              album === name
                ? 'bg-blue-600 text-white'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
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
        {assets && <PhotoGrid assets={assets} onSelect={setViewerIndex} />}
      </div>

      {viewerIndex !== null && assets && (
        <PhotoViewer
          assets={assets}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onNavigate={setViewerIndex}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
