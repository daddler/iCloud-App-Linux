import { useQuery } from '@tanstack/react-query';
import type { PhotoAsset } from '@shared/ipc-types';

export function useAlbum(album: string) {
  return useQuery<PhotoAsset[]>({
    queryKey: ['album', album],
    queryFn: () => window.icloud.photos.listAlbum(album),
  });
}
