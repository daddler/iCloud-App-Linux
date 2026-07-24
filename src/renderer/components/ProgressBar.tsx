export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
      <div
        className="h-full rounded-full bg-blue-600 transition-all"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
