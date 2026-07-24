import { createDAVClient } from 'tsdav';
import ICAL from 'ical.js';
import type { CalendarEvent } from '@shared/ipc-types';
import type { DavCredentials } from '../state/AppState';

const UPCOMING_WINDOW_DAYS = 90;
const MAX_EVENTS = 100;

/**
 * Real iCloud Calendar via the standard, documented CalDAV protocol
 * (caldav.icloud.com) — same app-specific-password credential as Contacts.
 * Recurring events (RRULE) are not expanded; only the base occurrence in
 * each object is shown, which is a reasonable v1 limit given this app's
 * file-explorer-like scope rather than a full calendar client.
 */
export class CalendarService {
  constructor(private readonly getCredentials: () => DavCredentials | null) {}

  async listUpcomingEvents(): Promise<CalendarEvent[]> {
    const creds = this.getCredentials();
    if (!creds) return [];

    const client = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: { username: creds.appleId, password: creds.appSpecificPassword },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });

    const calendars = await client.fetchCalendars();
    const now = new Date();
    const horizon = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const events: CalendarEvent[] = [];

    for (const calendar of calendars) {
      const objects = await client.fetchCalendarObjects({
        calendar,
        timeRange: { start: now.toISOString(), end: horizon.toISOString() },
      });

      for (const object of objects) {
        if (!object.data) continue;
        const component = new ICAL.Component(ICAL.parse(object.data));
        for (const vevent of component.getAllSubcomponents('vevent')) {
          const event = new ICAL.Event(vevent);
          if (!event.startDate) continue;
          events.push({
            id: `${object.url}#${event.uid}`,
            summary: event.summary || 'Ohne Titel',
            start: event.startDate.toJSDate().toISOString(),
            end: event.endDate ? event.endDate.toJSDate().toISOString() : undefined,
            location: event.location || undefined,
          });
        }
      }
    }

    events.sort((a, b) => a.start.localeCompare(b.start));
    return events.slice(0, MAX_EVENTS);
  }
}
