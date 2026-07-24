import type { ReactNode } from 'react';

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-96 rounded-xl border border-nimbus-border bg-nimbus-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-nimbus-heading">{title}</h2>
        {children}
      </div>
    </div>
  );
}
