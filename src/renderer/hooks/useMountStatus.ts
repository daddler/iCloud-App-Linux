import { useQuery } from '@tanstack/react-query';

export function useMountStatus() {
  return useQuery({
    queryKey: ['mountStatus'],
    queryFn: () => window.icloud.mount.status(),
    refetchInterval: 30_000,
  });
}
