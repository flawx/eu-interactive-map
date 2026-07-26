"use client";

import { APP_DISPLAY_NAME } from "@/lib/branding/appName";

export { APP_DISPLAY_NAME };

type EuLogoProps = {
  onClick?: () => void;
  showName?: boolean;
  className?: string;
};

/**
 * Static star polygons (3-decimal coords).
 * Avoids SSR/client hydration drift from Math.sin / Math.cos.
 */
const EU_STAR_POINTS = [
  "18.000,2.700 18.500,4.112 19.997,4.151 18.808,5.063 19.234,6.499 18.000,5.650 16.766,6.499 17.192,5.063 16.003,4.151 17.500,4.112",
  "21.600,3.665 22.100,5.077 23.597,5.116 22.408,6.027 22.834,7.464 21.600,6.615 20.366,7.464 20.792,6.027 19.603,5.116 21.100,5.077",
  "24.235,6.300 24.735,7.712 26.233,7.751 25.044,8.663 25.470,10.099 24.235,9.250 23.001,10.099 23.427,8.663 22.238,7.751 23.736,7.712",
  "25.200,9.900 25.700,11.312 27.197,11.351 26.008,12.263 26.434,13.699 25.200,12.850 23.966,13.699 24.392,12.263 23.203,11.351 24.700,11.312",
  "24.235,13.500 24.735,14.912 26.233,14.951 25.044,15.863 25.470,17.299 24.235,16.450 23.001,17.299 23.427,15.863 22.238,14.951 23.736,14.912",
  "21.600,16.135 22.100,17.548 23.597,17.586 22.408,18.498 22.834,19.934 21.600,19.085 20.366,19.934 20.792,18.498 19.603,17.586 21.100,17.548",
  "18.000,17.100 18.500,18.512 19.997,18.551 18.808,19.463 19.234,20.899 18.000,20.050 16.766,20.899 17.192,19.463 16.003,18.551 17.500,18.512",
  "14.400,16.135 14.900,17.548 16.397,17.586 15.208,18.498 15.634,19.934 14.400,19.085 13.166,19.934 13.592,18.498 12.403,17.586 13.900,17.548",
  "11.765,13.500 12.264,14.912 13.762,14.951 12.573,15.863 12.999,17.299 11.765,16.450 10.530,17.299 10.956,15.863 9.767,14.951 11.265,14.912",
  "10.800,9.900 11.300,11.312 12.797,11.351 11.608,12.263 12.034,13.699 10.800,12.850 9.566,13.699 9.992,12.263 8.803,11.351 10.300,11.312",
  "11.765,6.300 12.264,7.712 13.762,7.751 12.573,8.663 12.999,10.099 11.765,9.250 10.530,10.099 10.956,8.663 9.767,7.751 11.265,7.712",
  "14.400,3.665 14.900,5.077 16.397,5.116 15.208,6.027 15.634,7.464 14.400,6.615 13.166,7.464 13.592,6.027 12.403,5.116 13.900,5.077",
] as const;

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
        {EU_STAR_POINTS.map((points, index) => (
          <polygon key={index} fill="#FFCC00" points={points} />
        ))}
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
