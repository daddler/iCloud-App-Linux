import { useQuery } from '@tanstack/react-query';
import { useDavCredentials } from '../../hooks/useDavCredentials';

export function useContacts() {
  const { data: hasCredentials } = useDavCredentials();
  return useQuery({
    queryKey: ['contacts'],
    queryFn: () => window.icloud.contacts.list(),
    enabled: hasCredentials === true,
  });
}
