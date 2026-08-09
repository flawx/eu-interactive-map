import Link from "next/link";
import type { ReactNode } from "react";

/** Scrollable shell for documentary pages (About / Sources / Settings). */
export default function ProjectPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <header
        className="sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <Link
          href="/"
          className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          ← EU Interactive Map
        </Link>
        <h1 className="text-sm font-semibold">{title}</h1>
        <span className="w-28" aria-hidden="true" />
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-16">{children}</main>
    </div>
  );
}
