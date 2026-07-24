import type { SVGProps } from 'react';

/** Minimal shared icon set (stroke-based, matches the Nimbus design language) so routes don't each hand-roll SVGs. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ChevronLeftIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <polyline points="15 18 9 12 15 6" />
  </Icon>
);

export const ChevronRightIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <polyline points="9 18 15 12 9 6" />
  </Icon>
);

export const SearchIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Icon>
);

export const DriveIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </Icon>
);

export const PhotosIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </Icon>
);

export const ContactsIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Icon>
);

export const CalendarIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </Icon>
);

export const NotesIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M4 4h16v16H4z" />
    <path d="M4 10h16" />
    <path d="M10 4v16" />
  </Icon>
);

export const RecentIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Icon>
);

export const SharedIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </Icon>
);

export const TrashIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1.5 14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2L5 6" />
  </Icon>
);

export const FolderPlusIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </Icon>
);

export const UploadIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </Icon>
);

export const ListViewIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </Icon>
);

export const GridViewIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </Icon>
);

export const CompactViewIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="4" />
    <rect x="3" y="10" width="18" height="4" />
    <rect x="3" y="16" width="18" height="4" />
  </Icon>
);

export const MoreIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </Icon>
);

export const CheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <polyline points="20 6 9 17 4 12" />
  </Icon>
);
