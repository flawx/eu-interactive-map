"use client";

import { APP_DISPLAY_NAME } from "@/lib/branding/appName";

export { APP_DISPLAY_NAME };

type EuLogoProps = {
  onClick?: () => void;
  showName?: boolean;
  className?: string;
};

export default function EuLogo({
  onClick,
  showName = true,
  className = "",
}: EuLogoProps) {
  const content = (
    <>
      <svg
        width="36"
        height="24"
        viewBox="0 0 36 24"
        role="img"
        aria-hidden={showName ? true : undefined}
        aria-label={showName ? undefined : APP_DISPLAY_NAME}
        className="shrink-0"
      >
        <rect width="36" height="24" rx="2" fill="#002395" />
        {Array.from({ length: 12 }, (_, index) => {
          const angle = (index * 30 - 90) * (Math.PI / 180);
          const cx = 18 + Math.cos(angle) * 7.2;
          const cy = 12 + Math.sin(angle) * 7.2;
          return (
            <polygon
              key={index}
              fill="#FFCC00"
              points={starPoints(cx, cy, 2.1, 0.85)}
            />
          );
        })}
      </svg>
      {showName ? (
        <span
          className="hidden truncate text-sm font-semibold tracking-tight lg:inline"
          style={{ color: "var(--map-ui-text)" }}
        >
          {APP_DISPLAY_NAME}
        </span>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex max-w-[12rem] items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60 ${className}`}
        aria-label={`${APP_DISPLAY_NAME} — Europe`}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {content}
    </span>
  );
}

function starPoints(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i * 36 - 90) * (Math.PI / 180);
    points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
  }
  return points.join(" ");
}
