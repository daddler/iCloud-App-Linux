import { useEffect, useMemo, useState } from 'react';
import type { AppView, AuthStatus } from '@shared/ipc-types';
import { Onboarding } from './routes/Onboarding/Onboarding';
import { DriveExplorer } from './routes/DriveExplorer/DriveExplorer';
import { PhotosGallery } from './routes/PhotosGallery/PhotosGallery';
import { Settings } from './routes/Settings/Settings';
import { Contacts } from './routes/Contacts/Contacts';
import { Calendar } from './routes/Calendar/Calendar';
import { Recents } from './routes/Recents/Recents';
import { Spinner } from './components/Spinner';
import { TitleBar, type BreadcrumbSegment } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';

const VIEW_LABEL: Record<Exclude<AppView, 'drive'>, string> = {
  onboarding: 'iCloud Explorer',
  photos: 'Fotos',
  settings: 'Einstellungen',
  contacts: 'Kontakte',
  calendar: 'Kalender',
  recents: 'Zuletzt',
};

export default function App() {
  const [view, setView] = useState<AppView | 'loading'>('loading');
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [search, setSearch] = useState('');

  // Drive path history, for the titlebar's back/forward navigation.
  const [driveHistory, setDriveHistory] = useState<string[]>(['/']);
  const [driveHistoryIndex, setDriveHistoryIndex] = useState(0);
  const drivePath = driveHistory[driveHistoryIndex];

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

  function navigateView(next: AppView) {
    setView(next);
    setSearch('');
  }

  function navigateDrivePath(path: string) {
    if (path === drivePath) return;
    setDriveHistory((prev) => [...prev.slice(0, driveHistoryIndex + 1), path]);
    setDriveHistoryIndex((i) => i + 1);
    setView('drive');
  }

  const breadcrumb: BreadcrumbSegment[] = useMemo(() => {
    if (view === 'drive') {
      const segments = drivePath.split('/').filter(Boolean);
      return [
        { label: 'iCloud Drive', onClick: segments.length > 0 ? () => navigateDrivePath('/') : undefined },
        ...segments.map((segment, index) => ({
          label: segment,
          onClick:
            index < segments.length - 1
              ? () => navigateDrivePath(`/${segments.slice(0, index + 1).join('/')}`)
              : undefined,
        })),
      ];
    }
    if (view === 'loading' || view === 'onboarding') return [{ label: 'iCloud Explorer' }];
    return [{ label: VIEW_LABEL[view] }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, drivePath, driveHistoryIndex]);

  if (view === 'loading') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-nimbus-bg">
        <Spinner />
      </div>
    );
  }

  if (view === 'onboarding') {
    return <Onboarding onAuthenticated={() => navigateView('drive')} />;
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-nimbus-bg text-nimbus-text">
      <TitleBar
        breadcrumb={breadcrumb}
        canGoBack={view === 'drive' && driveHistoryIndex > 0}
        canGoForward={view === 'drive' && driveHistoryIndex < driveHistory.length - 1}
        onBack={() => setDriveHistoryIndex((i) => Math.max(0, i - 1))}
        onForward={() => setDriveHistoryIndex((i) => Math.min(driveHistory.length - 1, i + 1))}
        search={search}
        onSearchChange={setSearch}
        userInitials={authStatus?.userInitials}
        onAvatarClick={() => navigateView('settings')}
      />
      <div className="grid min-h-0 flex-1 grid-cols-[250px_1fr]">
        <Sidebar view={view} onNavigate={navigateView} authStatus={authStatus} />
        <section className="flex min-h-0 min-w-0 flex-col">
          {view === 'drive' && <DriveExplorer path={drivePath} onNavigate={navigateDrivePath} search={search} />}
          {view === 'photos' && <PhotosGallery />}
          {view === 'contacts' && <Contacts search={search} onOpenSettings={() => navigateView('settings')} />}
          {view === 'calendar' && <Calendar search={search} onOpenSettings={() => navigateView('settings')} />}
          {view === 'recents' && <Recents search={search} />}
          {view === 'settings' && <Settings onLoggedOut={() => navigateView('onboarding')} />}
        </section>
      </div>
    </div>
  );
}
