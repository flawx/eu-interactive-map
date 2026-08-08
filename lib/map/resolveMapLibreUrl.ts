/**
 * Resolve MapLibre resource URLs that begin with "/" to an absolute URL.
 * Relative paths break MapLibre's Request construction (workers / no base URL).
 *
 * Do not pass template strings containing `{z}` / `{x}` / `{y}` through
 * `new URL(...)` alone without a base — use string concatenation instead so
 * braces stay unsubstituted until MapLibre fills them.
 */
export function resolveMapLibreUrl(
  url: string,
  origin?: string | null,
): string {
  if (!url.startsWith("/")) {
    return url;
  }
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : null);
  if (!base) {
    return url;
  }
  return `${base.replace(/\/$/, "")}${url}`;
}

export function resolveMapLibreTileTemplate(
  template: string,
  origin?: string | null,
): string {
  return resolveMapLibreUrl(template, origin);
}
