import { createDAVClient } from 'tsdav';
import ICAL from 'ical.js';
import type { Contact } from '@shared/ipc-types';
import type { DavCredentials } from '../state/AppState';

/**
 * Real iCloud Contacts via the standard, documented CardDAV protocol
 * (contacts.icloud.com) — unlike Drive/Photos this has nothing to do with
 * rclone's reverse-engineered private API. Requires an app-specific password
 * (Apple rejects the main Apple ID password for any CardDAV/CalDAV client).
 */
export class ContactsService {
  constructor(private readonly getCredentials: () => DavCredentials | null) {}

  async listContacts(): Promise<Contact[]> {
    const creds = this.getCredentials();
    if (!creds) return [];

    const client = await createDAVClient({
      serverUrl: 'https://contacts.icloud.com',
      credentials: { username: creds.appleId, password: creds.appSpecificPassword },
      authMethod: 'Basic',
      defaultAccountType: 'carddav',
    });

    const addressBooks = await client.fetchAddressBooks();
    const contacts: Contact[] = [];

    for (const addressBook of addressBooks) {
      const vcards = await client.fetchVCards({ addressBook });
      for (const vcard of vcards) {
        if (!vcard.data) continue;
        const component = new ICAL.Component(ICAL.parse(vcard.data));
        const fullName = component.getFirstPropertyValue('fn') as string | null;
        if (!fullName) continue;
        contacts.push({
          id: vcard.url,
          fullName,
          emails: component.getAllProperties('email').map((prop) => String(prop.getFirstValue())),
          phones: component.getAllProperties('tel').map((prop) => String(prop.getFirstValue())),
        });
      }
    }

    contacts.sort((a, b) => a.fullName.localeCompare(b.fullName));
    return contacts;
  }
}
