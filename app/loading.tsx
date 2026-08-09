import { EUStarLoader } from "@/components/ui/EUStarLoader";

export default function Loading() {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[var(--background)] text-[var(--foreground)]"
      role="status"
      aria-live="polite"
    >
      <EUStarLoader size="lg" label="Loading" />
      <span className="text-sm text-[var(--map-ui-muted)]">Loading…</span>
    </div>
  );
}
