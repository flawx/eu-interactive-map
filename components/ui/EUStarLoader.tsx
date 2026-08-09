"use client";

type EUStarLoaderProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

const SIZE_PX: Record<NonNullable<EUStarLoaderProps["size"]>, number> = {
  sm: 18,
  md: 32,
  lg: 56,
};

/** Minimal EU emblem: 12 stars on a circle — reusable async indicator. */
export function EUStarLoader({
  size = "md",
  className = "",
  label = "Loading",
}: EUStarLoaderProps) {
  const px = SIZE_PX[size];
  const stars = Array.from({ length: 12 }, (_, index) => {
    const angle = (index * 30 - 90) * (Math.PI / 180);
    const radius = 38;
    const cx = 50 + radius * Math.cos(angle);
    const cy = 50 + radius * Math.sin(angle);
    return { cx, cy, key: index };
  });

  return (
    <span
      className={`eu-star-loader inline-flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        aria-hidden="true"
        className="eu-star-loader__svg"
      >
        {stars.map((star) => (
          <polygon
            key={star.key}
            points="0,-4.2 1.2,-1.3 4.2,-1.3 1.8,0.5 2.6,3.5 0,1.7 -2.6,3.5 -1.8,0.5 -4.2,-1.3 -1.2,-1.3"
            transform={`translate(${star.cx} ${star.cy})`}
            fill="var(--eu-star-fill, #fc0)"
            stroke="var(--eu-star-stroke, #039)"
            strokeWidth="0.35"
          />
        ))}
      </svg>
    </span>
  );
}

export default EUStarLoader;
