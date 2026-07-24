import { useQuery } from '@tanstack/react-query';

export function useAlbums() {
  return useQuery<string[]>({
    queryKey: ['albums'],
    queryFn: () => window.icloud.photos.listAlbums(),
  });
}
