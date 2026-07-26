import "server-only";

import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { isTrustedOfficialHostname } from "@/lib/incidents/officialSources/franceWildfireSources";

export type OfficialFetchedDocument = {
  url: string;
  finalUrl: string;
  title: string;
  publishedAt: string | null;
  bodyText: string;
  fetchedAt: string;
  contentHash: string;
};

const USER_AGENT =
  "EU-Interactive-Map/1.0 (+official-source-ingest; research map; contact: local-dev)";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 2;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function hostnameOf(url: string): string {
  return new URL(url).hostname.toLowerCase();
}

function assertTrustedUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new Error(`Refused non-HTTPS official URL: ${url}`);
  }
  if (!isTrustedOfficialHostname(parsed.hostname)) {
    throw new Error(`Refused untrusted official domain: ${parsed.hostname}`);
  }
}

function parseFrenchDate(value: string): string | null {
  const match = value.match(
    /(?:mis à jour le|publié le|le)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
  );
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!day || !month || !year) return null;
  const iso = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(iso.getTime())) return null;
  return iso.toISOString();
}

function extractPublishedAt($: cheerio.CheerioAPI, bodyText: string): string | null {
  const timeAttr = $("time[datetime]").first().attr("datetime");
  if (timeAttr) {
    const parsed = Date.parse(timeAttr);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }

  const meta =
    $('meta[property="article:published_time"]').attr("content") ||
    $('meta[name="date"]').attr("content") ||
    $('meta[name="DC.date"]').attr("content");
  if (meta) {
    const parsed = Date.parse(meta);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }

  return parseFrenchDate(bodyText);
}

function extractMainText(html: string): { title: string; bodyText: string } {
  const $ = cheerio.load(html);

  $(
    "script, style, noscript, iframe, svg, canvas, form, button, input, select, textarea",
  ).remove();
  $(
    "nav, footer, header, aside, .cookie, .cookies, #cookie, #cookies, .share, .social, .breadcrumb, .menu, .navigation, .newsletter, .recommand, .recommend, .related, .tags",
  ).remove();

  const title = normalizeWhitespace(
    $("h1").first().text() || $("title").first().text() || "",
  );

  const candidates = [
    "main article",
    "article",
    "main .ezxmltext-field",
    ".ezxmltext-field",
    "main .content",
    "#content",
    "main",
    "[role='main']",
  ];

  let bodyText = "";
  for (const selector of candidates) {
    const node = $(selector).first();
    if (node.length && normalizeWhitespace(node.text()).length > 200) {
      node
        .find(
          "nav, footer, aside, .share, .social, .breadcrumb, .menu, .navigation, .cookie, .Partager, .documents-associes",
        )
        .remove();
      bodyText = normalizeWhitespace(node.text());
      break;
    }
  }

  if (!bodyText) {
    const body = $("body");
    body
      .find(
        "nav, footer, aside, .share, .social, .breadcrumb, .menu, .navigation, .cookie",
      )
      .remove();
    bodyText = normalizeWhitespace(body.text());
  }

  // Drop trailing share / document chrome when still present as plain text.
  bodyText = bodyText
    .replace(/Partager la page.*$/i, "")
    .replace(/Documents associés.*$/i, "")
    .replace(/Documents listés dans l’article.*$/i, "")
    .replace(/Documents listés dans l'article.*$/i, "")
    .trim();

  return { title, bodyText };
}

async function readLimitedBody(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (text.length > MAX_BYTES) {
      throw new Error("Official document exceeds size limit");
    }
    return text;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      reader.cancel().catch(() => undefined);
      throw new Error("Official document exceeds size limit");
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Downloads an official HTML document from a trusted French authority domain.
 * Never executes page JavaScript. Refuses untrusted hosts after redirects.
 */
export async function fetchOfficialDocument(
  url: string,
): Promise<OfficialFetchedDocument> {
  assertTrustedUrl(url);

  let currentUrl = url;
  let response: Response | null = null;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    assertTrustedUrl(currentUrl);

    response = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`Redirect without Location from ${currentUrl}`);
      }
      if (redirectCount === MAX_REDIRECTS) {
        throw new Error(`Too many redirects for ${url}`);
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    break;
  }

  if (!response) {
    throw new Error(`Failed to fetch official document: ${url}`);
  }

  if (!response.ok) {
    throw new Error(
      `Official source HTTP ${response.status} for ${hostnameOf(currentUrl)}`,
    );
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("text/html")) {
    throw new Error(`Refused non-HTML content-type: ${contentType || "unknown"}`);
  }

  const html = await readLimitedBody(response);
  if (/cloudflare|attention required|enable cookies/i.test(html) && html.length < 4000) {
    throw new Error(`Official source blocked by bot protection: ${hostnameOf(currentUrl)}`);
  }

  const { title, bodyText } = extractMainText(html);
  if (bodyText.length < 80) {
    throw new Error(`Official document body too short: ${currentUrl}`);
  }

  const $ = cheerio.load(html);
  const publishedAt = extractPublishedAt($, bodyText);
  const fetchedAt = new Date().toISOString();
  const contentHash = createHash("sha256")
    .update(`${currentUrl}\n${title}\n${bodyText}`)
    .digest("hex");

  return {
    url,
    finalUrl: currentUrl,
    title: title || currentUrl,
    publishedAt,
    bodyText,
    fetchedAt,
    contentHash,
  };
}
