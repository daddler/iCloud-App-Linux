import { useQuery } from '@tanstack/react-query';

export function useStorageUsage() {
  return useQuery({
    queryKey: ['storageUsage'],
    queryFn: () => window.icloud.fs.storageUsage(),
    staleTime: 60_000,
  });
}
