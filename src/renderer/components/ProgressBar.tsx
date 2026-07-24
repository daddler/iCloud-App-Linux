export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-nimbus-purple transition-all"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
