import { useQuery } from '@tanstack/react-query';

export function useRecent(limit = 100) {
  return useQuery({
    queryKey: ['recent', limit],
    queryFn: () => window.icloud.fs.listRecent(limit),
  });
}
