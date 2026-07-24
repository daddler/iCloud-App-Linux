import { describe, expect, it, vi } from 'vitest';
import { ContactsService } from '../../electron/main/contacts/ContactsService';

const VCARD = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'FN:Anna Beispiel',
  'EMAIL;TYPE=HOME:anna@example.com',
  'TEL;TYPE=CELL:+491234567',
  'END:VCARD',
].join('\r\n');

vi.mock('tsdav', () => ({
  createDAVClient: vi.fn(async () => ({
    fetchAddressBooks: vi.fn(async () => [{ url: 'https://contacts.icloud.com/addressbook/' }]),
    fetchVCards: vi.fn(async () => [{ url: 'https://contacts.icloud.com/addressbook/1.vcf', data: VCARD }]),
  })),
}));

describe('ContactsService', () => {
  it('returns an empty list when no credentials are configured, without hitting the network', async () => {
    const service = new ContactsService(() => null);
    await expect(service.listContacts()).resolves.toEqual([]);
  });

  it('parses vCards fetched over CardDAV into Contact records', async () => {
    const service = new ContactsService(() => ({ appleId: 'me@icloud.com', appSpecificPassword: 'abcd-efgh-ijkl-mnop' }));
    const contacts = await service.listContacts();
    expect(contacts).toEqual([
      {
        id: 'https://contacts.icloud.com/addressbook/1.vcf',
        fullName: 'Anna Beispiel',
        emails: ['anna@example.com'],
        phones: ['+491234567'],
      },
    ]);
  });
});
