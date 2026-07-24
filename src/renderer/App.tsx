import { useEffect, useState } from 'react';
import type { AppView, AuthStatus } from '@shared/ipc-types';
import { Onboarding } from './routes/Onboarding/Onboarding';
import { DriveExplorer } from './routes/DriveExplorer/DriveExplorer';
import { PhotosGallery } from './routes/PhotosGallery/PhotosGallery';
import { Settings } from './routes/Settings/Settings';
import { Spinner } from './components/Spinner';

export default function App() {
  const [view, setView] = useState<AppView | 'loading'>('loading');
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.icloud.auth
      .status()
      .then((status) => {
        if (cancelled) return;
        setAuthStatus(status);
        setView(status.isAuthenticated ? 'drive' : 'onboarding');
      })
      .catch(() => setView('onboarding'));
    return () => {
      cancelled = true;
    };
  }, []);

  if (view === 'loading') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <Spinner />
      </div>
    );
  }

  if (view === 'onboarding') {
    return <Onboarding onAuthenticated={() => setView('drive')} />;
  }

  return (
    <div className="flex h-full w-full bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <nav className="flex w-16 flex-col items-center gap-2 border-r border-neutral-200 py-4 dark:border-neutral-800">
        <NavButton label="Drive" active={view === 'drive'} onClick={() => setView('drive')} />
        <NavButton label="Fotos" active={view === 'photos'} onClick={() => setView('photos')} />
        <div className="flex-1" />
        <NavButton
          label="Einstellungen"
          active={view === 'settings'}
          onClick={() => setView('settings')}
          content={authStatus?.userInitials}
          rounded
        />
      </nav>
      <main className="flex-1 overflow-hidden">
        {view === 'drive' && <DriveExplorer />}
        {view === 'photos' && <PhotosGallery />}
        {view === 'settings' && <Settings onLoggedOut={() => setView('onboarding')} />}
      </main>
    </div>
  );
}

function NavButton({
  label,
  active,
  onClick,
  content,
  rounded,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  content?: string;
  rounded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex h-10 w-10 items-center justify-center text-xs font-medium transition-colors ${
        rounded ? 'rounded-full' : 'rounded-lg'
      } ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800'
      }`}
    >
      {content ?? label.slice(0, 2)}
    </button>
  );
}
