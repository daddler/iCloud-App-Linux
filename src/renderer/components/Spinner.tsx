export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      role="status"
      aria-label="Lädt..."
      className="animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600"
      style={{ width: size, height: size }}
    />
  );
}
