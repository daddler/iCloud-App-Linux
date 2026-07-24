const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value.toFixed(exp === 0 ? 0 : 1).replace('.', ',')} ${UNITS[exp]}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

/** e.g. "gerade eben", "vor 2 Min", "vor 3 Std" — for a "last synced" indicator. */
export function formatRelativeTime(epochMs: number): string {
  const diffMs = Date.now() - epochMs;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std`;
  return `vor ${Math.floor(hours / 24)} Tg`;
}
