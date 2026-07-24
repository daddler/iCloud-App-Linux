import type { TransferProgress } from '@shared/ipc-types';
import { ProgressBar } from './ProgressBar';

const PHASE_LABEL: Record<TransferProgress['phase'], string> = {
  copying: 'Kopieren...',
  uploading: 'Upload zu iCloud...',
  done: 'Fertig',
  error: 'Fehler',
};

export function TransferToast({ progress }: { progress: TransferProgress }) {
  const ratio = progress.bytesTotal > 0 ? progress.bytesDone / progress.bytesTotal : 0;
  return (
    <div className="w-72 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{PHASE_LABEL[progress.phase]}</span>
        {progress.currentFile && (
          <span className="truncate text-neutral-500 dark:text-neutral-400">{progress.currentFile}</span>
        )}
      </div>
      {progress.phase === 'error' ? (
        <p className="text-sm text-red-600">{progress.error}</p>
      ) : (
        <ProgressBar value={progress.phase === 'done' ? 1 : ratio} />
      )}
    </div>
  );
}
