import { useQuery } from '@tanstack/react-query';

export function useDavCredentials() {
  return useQuery({
    queryKey: ['davAuth', 'hasCredentials'],
    queryFn: () => window.icloud.davAuth.hasCredentials(),
  });
}
