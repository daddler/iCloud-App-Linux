import { describe, expect, it, vi } from 'vitest';
import { CalendarService } from '../../electron/main/calendar/CalendarService';

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:event-1',
  'SUMMARY:Teammeeting',
  'DTSTART:20260801T090000Z',
  'DTEND:20260801T100000Z',
  'LOCATION:Büro',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

vi.mock('tsdav', () => ({
  createDAVClient: vi.fn(async () => ({
    fetchCalendars: vi.fn(async () => [{ url: 'https://caldav.icloud.com/calendars/home/' }]),
    fetchCalendarObjects: vi.fn(async () => [{ url: 'https://caldav.icloud.com/calendars/home/1.ics', data: ICS }]),
  })),
}));

describe('CalendarService', () => {
  it('returns an empty list when no credentials are configured, without hitting the network', async () => {
    const service = new CalendarService(() => null);
    await expect(service.listUpcomingEvents()).resolves.toEqual([]);
  });

  it('parses VEVENTs fetched over CalDAV into CalendarEvent records', async () => {
    const service = new CalendarService(() => ({ appleId: 'me@icloud.com', appSpecificPassword: 'abcd-efgh-ijkl-mnop' }));
    const events = await service.listUpcomingEvents();
    expect(events).toEqual([
      {
        id: 'https://caldav.icloud.com/calendars/home/1.ics#event-1',
        summary: 'Teammeeting',
        start: new Date('2026-08-01T09:00:00Z').toISOString(),
        end: new Date('2026-08-01T10:00:00Z').toISOString(),
        location: 'Büro',
      },
    ]);
  });
});
