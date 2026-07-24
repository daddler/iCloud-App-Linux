import type { DirEntry } from '@shared/ipc-types';

const DOCUMENT_EXTENSIONS = new Set([
  'doc',
  'docx',
  'pdf',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'pages',
  'numbers',
  'key',
  'csv',
  'odt',
  'rtf',
]);

const MEDIA_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'heic',
  'webp',
  'mp3',
  'mp4',
  'mov',
  'wav',
  'm4a',
  'avi',
  'mkv',
]);

const ICON_STYLE: Record<string, { gradient: string }> = {
  pdf: { gradient: 'linear-gradient(135deg,#ff8a5b,#e05b2b)' },
  doc: { gradient: 'linear-gradient(135deg,#7c5cff,#5a3fff)' },
  docx: { gradient: 'linear-gradient(135deg,#7c5cff,#5a3fff)' },
  xls: { gradient: 'linear-gradient(135deg,#34d399,#0f9d67)' },
  xlsx: { gradient: 'linear-gradient(135deg,#34d399,#0f9d67)' },
  ppt: { gradient: 'linear-gradient(135deg,#ff8a5b,#e05b2b)' },
  pptx: { gradient: 'linear-gradient(135deg,#ff8a5b,#e05b2b)' },
  mp3: { gradient: 'linear-gradient(135deg,#ff6b9d,#c34b7a)' },
  mp4: { gradient: 'linear-gradient(135deg,#ff6b9d,#c34b7a)' },
  mov: { gradient: 'linear-gradient(135deg,#ff6b9d,#c34b7a)' },
  jpg: { gradient: 'linear-gradient(135deg,#ff6b9d,#c34b7a)' },
  jpeg: { gradient: 'linear-gradient(135deg,#ff6b9d,#c34b7a)' },
  png: { gradient: 'linear-gradient(135deg,#ff6b9d,#c34b7a)' },
};

const DEFAULT_ICON = { gradient: 'linear-gradient(135deg,#8a92a3,#6b7285)' };
const DIR_ICON = { gradient: 'linear-gradient(135deg,#8ea6ff,#5f7dff)' };

export type FileCategory = 'folder' | 'document' | 'media' | 'other';

export function extensionOf(entry: DirEntry): string {
  const dot = entry.name.lastIndexOf('.');
  return dot > 0 ? entry.name.slice(dot + 1).toLowerCase() : '';
}

export function categoryOf(entry: DirEntry): FileCategory {
  if (entry.kind === 'directory') return 'folder';
  const ext = extensionOf(entry);
  if (DOCUMENT_EXTENSIONS.has(ext)) return 'document';
  if (MEDIA_EXTENSIONS.has(ext)) return 'media';
  return 'other';
}

export function iconFor(entry: DirEntry): { label: string; gradient: string } {
  if (entry.kind === 'directory') return { label: 'DIR', gradient: DIR_ICON.gradient };
  const ext = extensionOf(entry);
  const style = ICON_STYLE[ext] ?? DEFAULT_ICON;
  return { label: ext ? ext.slice(0, 4).toUpperCase() : 'FILE', gradient: style.gradient };
}
