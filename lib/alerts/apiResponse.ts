import { createHash } from "node:crypto";

export function jsonWithAlertCache(
  body: unknown,
  maxAgeSeconds: number,
): Response {
  const json = JSON.stringify(body);
  const etag = `"${createHash("sha256").update(json).digest("base64url")}"`;
  return new Response(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=60, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`,
      ETag: etag,
    },
  });
}
