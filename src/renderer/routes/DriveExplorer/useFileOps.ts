import { useMutation, useQueryClient } from '@tanstack/react-query';
import { directoryQueryKey } from './useDirectory';

export function useFileOps(currentPath: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: directoryQueryKey(currentPath) });

  const mkdir = useMutation({
    mutationFn: (name: string) => window.icloud.fs.mkdir(joinPath(currentPath, name)),
    onSuccess: invalidate,
  });

  const rename = useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) => window.icloud.fs.rename(from, to),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: ({ path, recursive }: { path: string; recursive: boolean }) =>
      window.icloud.fs.remove(path, recursive),
    onSuccess: invalidate,
  });

  return { mkdir, rename, remove };
}

export function joinPath(dir: string, name: string): string {
  return dir === '/' || dir === '' ? `/${name}` : `${dir}/${name}`;
}
