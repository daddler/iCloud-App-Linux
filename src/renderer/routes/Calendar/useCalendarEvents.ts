import { useQuery } from '@tanstack/react-query';
import { useDavCredentials } from '../../hooks/useDavCredentials';

export function useCalendarEvents() {
  const { data: hasCredentials } = useDavCredentials();
  return useQuery({
    queryKey: ['calendarEvents'],
    queryFn: () => window.icloud.calendar.listUpcoming(),
    enabled: hasCredentials === true,
  });
}
