import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PhotoGrid } from './PhotoGrid';
import { PhotoViewer } from './PhotoViewer';
import { useAlbum } from './useAlbum';
import { useAlbums } from './useAlbums';
import { Spinner } from '../../components/Spinner';

export function PhotosGallery() {
  const queryClient = useQueryClient();
  const { data: albums, isLoading: albumsLoading, error: albumsError } = useAlbums();
  const [album, setAlbum] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { data: assets, isLoading, error } = useAlbum(album);

  useEffect(() => {
    if (album === null && albums && albums.length > 0) {
      setAlbum(albums[0]);
    }
  }, [albums, album]);

  async function handleDownload() {
    if (viewerIndex === null || !assets) return;
    await window.icloud.photos.download([assets[viewerIndex].path]);
  }

  async function handleRetry() {
    await window.icloud.mount.retry();
    await queryClient.invalidateQueries({ queryKey: ['albums'] });
  }

  if (albumsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (albumsError || !albums || albums.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-sm text-neutral-600 dark:text-neutral-300">
        <p>
          Fotos sind derzeit nicht verfügbar. Möglicherweise konnte das Fotos-Laufwerk nicht
          eingehängt werden.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        {albums.map((name) => (
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
