import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { PhotoAsset } from '@shared/ipc-types';

const COLUMN_WIDTH = 160;

export function PhotoGrid({ assets, onSelect }: { assets: PhotoAsset[]; onSelect: (index: number) => void }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const columns = Math.max(1, Math.floor((parentRef.current?.clientWidth ?? 800) / COLUMN_WIDTH));
  const rowCount = Math.ceil(assets.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => COLUMN_WIDTH,
    overscan: 4,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto p-2">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            className="absolute left-0 top-0 grid w-full gap-2"
            style={{
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {assets
              .slice(virtualRow.index * columns, virtualRow.index * columns + columns)
              .map((asset, i) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onSelect(virtualRow.index * columns + i)}
                  className="aspect-square overflow-hidden rounded-lg bg-neutral-200 hover:opacity-90 dark:bg-neutral-700"
                >
                  <img
                    src={`icloud-media://photos/${encodeURIComponent(asset.path)}`}
                    alt={asset.filename}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
