import { useAppVersion } from '../hooks/useAppVersion';
import { useStorageUsage } from '../hooks/useStorageUsage';
import { useMountStatus } from '../hooks/useMountStatus';
import { formatBytes } from '../lib/format';

export function StatusBar({ itemCount, path }: { itemCount: number; path: string }) {
  const { data: usage } = useStorageUsage();
  const { data: mountStatus } = useMountStatus();
  const { data: version } = useAppVersion();
  const online = Boolean(mountStatus?.driveMounted);

  return (
    <div className="flex h-[30px] flex-shrink-0 items-center justify-between border-t border-nimbus-border bg-nimbus-sunken px-5 font-mono text-[10.5px] text-nimbus-faint">
      <div className="flex items-center gap-3.5">
        <span>{itemCount} Objekte</span>
        {usage && <span>{formatBytes(usage.totalBytes)}</span>}
        <span className={online ? 'text-nimbus-green' : 'text-nimbus-faint'}>
          ● {online ? 'online' : 'offline'}
        </span>
      </div>
      <div className="flex items-center gap-3.5">
        {version && <span>appimage v{version}</span>}
        <span className="text-nimbus-purple">nimbus://drive{path === '/' ? '' : path}</span>
      </div>
    </div>
  );
}
