import { useQuery } from '@tanstack/react-query';
import type { DirEntry } from '@shared/ipc-types';

export function directoryQueryKey(path: string) {
  return ['directory', path] as const;
}

export function useDirectory(path: string) {
  return useQuery<DirEntry[]>({
    queryKey: directoryQueryKey(path),
    queryFn: () => window.icloud.fs.readdir(path),
  });
}
