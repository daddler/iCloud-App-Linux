import { useQuery } from '@tanstack/react-query';

export function useAppVersion() {
  return useQuery({
    queryKey: ['appVersion'],
    queryFn: () => window.icloud.app.getVersion(),
    staleTime: Infinity,
  });
}
