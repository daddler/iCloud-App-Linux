import { useEffect, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from './icons';

export interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
}

export function TitleBar({
  breadcrumb,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  search,
  onSearchChange,
  userInitials,
  onAvatarClick,
}: {
  breadcrumb: BreadcrumbSegment[];
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  userInitials?: string;
  onAvatarClick: () => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="drag-region grid h-[46px] flex-shrink-0 grid-cols-[220px_1fr_260px] items-center gap-2 border-b border-nimbus-border bg-gradient-to-b from-[#171b24] to-nimbus-surface px-3.5">
      <div className="flex items-center gap-3.5">
        <div className="no-drag flex gap-[7px]">
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => void window.icloud.window.close()}
            className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]"
          />
          <button
            type="button"
            aria-label="Minimieren"
            onClick={() => void window.icloud.window.minimize()}
            className="h-[11px] w-[11px] rounded-full bg-[#febc2e]"
          />
          <button
            type="button"
            aria-label="Maximieren"
            onClick={() => void window.icloud.window.toggleMaximize()}
            className="h-[11px] w-[11px] rounded-full bg-[#28c840]"
          />
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex h-[22px] w-[22px] items-center justify-center rounded-md"
            style={{ background: 'conic-gradient(from 210deg at 50% 50%, #7c5cff, #22d3ee, #7c5cff)' }}
          >
            <div className="h-2 w-2 rounded-sm bg-nimbus-bg" />
          </div>
          <div className="text-[13.5px] font-extrabold tracking-tight text-nimbus-heading">
            Nimbus<span className="text-nimbus-purple">.</span>
          </div>
        </div>
      </div>

      <div className="no-drag flex min-w-[380px] items-center justify-self-center gap-1.5 rounded-[9px] border border-nimbus-border bg-black/25 px-2.5 py-1.5">
        <button
          type="button"
          aria-label="Zurück"
          disabled={!canGoBack}
          onClick={onBack}
          className="flex h-5 w-5 items-center justify-center text-nimbus-subtle enabled:hover:text-nimbus-text disabled:text-nimbus-disabled"
        >
          <ChevronLeftIcon width={12} height={12} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          aria-label="Vorwärts"
          disabled={!canGoForward}
          onClick={onForward}
          className="flex h-5 w-5 items-center justify-center text-nimbus-subtle enabled:hover:text-nimbus-text disabled:text-nimbus-disabled"
        >
          <ChevronRightIcon width={12} height={12} strokeWidth={2.2} />
        </button>
        <div className="mx-1 h-3.5 w-px bg-white/10" />
        <div className="flex items-center gap-1.5 truncate font-mono text-[11px]">
          {breadcrumb.map((segment, index) => (
            <span key={`${segment.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-nimbus-disabled">/</span>}
              <button
                type="button"
                disabled={!segment.onClick}
                onClick={segment.onClick}
                className={
                  index === breadcrumb.length - 1
                    ? 'font-semibold text-nimbus-text'
                    : 'text-nimbus-subtle enabled:hover:text-nimbus-text'
                }
              >
                {segment.label}
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="no-drag flex items-center justify-self-end gap-2">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute left-[9px] top-1/2 -translate-y-1/2 text-nimbus-faint"
            width={12}
            height={12}
          />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Suchen…"
            className="h-7 w-40 rounded-lg border border-nimbus-border bg-black/25 pl-7 pr-9 font-sans text-xs text-nimbus-text outline-none placeholder:text-nimbus-faint"
          />
          <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-white/5 px-1 py-0.5 font-mono text-[9.5px] text-nimbus-faint">
            ^K
          </div>
        </div>
        <button
          type="button"
          onClick={onAvatarClick}
          title="Einstellungen"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[10.5px] font-bold text-nimbus-bg"
          style={{ background: 'linear-gradient(135deg, #7c5cff, #22d3ee)' }}
        >
          {userInitials ?? '—'}
        </button>
      </div>
    </div>
  );
}
