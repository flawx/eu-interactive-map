export const COPERNICUS_GFM_WMS =
  "https://european-flood.emergency.copernicus.eu/api/wms/";
export const COPERNICUS_OBSERVED_FLOOD_LAYER =
  "mapserver:gfm_observed_flood_extent_group_layer";
export const COPERNICUS_GFM_MAX_ZOOM = 12;

export type GfmTimeDimension =
  | { kind: "values"; values: string[]; defaultValue: string | null }
  | {
      kind: "interval";
      start: string;
      end: string;
      period: string;
      defaultValue: string | null;
    };

export type GfmLayerCapability = {
  name: string;
  title: string;
  queryable: boolean;
  time: GfmTimeDimension | null;
};

export type GfmCapabilities = {
  layers: GfmLayerCapability[];
  mapFormats: string[];
  featureInfoFormats: string[];
  observedFloodExtent: GfmLayerCapability | null;
  fetchedAt: string;
};

const CAPABILITIES_URL =
  `${COPERNICUS_GFM_WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;
const CACHE_TTL_MS = 15 * 60 * 1000;

let cachedCapabilities:
  | { expiresAt: number; value: GfmCapabilities }
  | null = null;
let inFlightCapabilities: Promise<GfmCapabilities> | null = null;

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function capture(block: string, expression: RegExp): string | null {
  return expression.exec(block)?.[1]?.trim() ?? null;
}

function parseDurationMilliseconds(value: string): number | null {
  const match =
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
      value,
    );
  if (!match) return null;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  const milliseconds =
    (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
  return Number.isFinite(milliseconds) && milliseconds > 0
    ? milliseconds
    : null;
}

function isoSeconds(value: number): string {
  return new Date(value).toISOString().replace(".000Z", "Z");
}

export function parseGfmTimeDimension(
  contents: string,
  defaultValue: string | null,
): GfmTimeDimension | null {
  const tokens = contents
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (tokens.length === 1 && tokens[0].split("/").length === 3) {
    const [start, end, period] = tokens[0].split("/");
    if (
      Number.isFinite(Date.parse(start)) &&
      Number.isFinite(Date.parse(end)) &&
      parseDurationMilliseconds(period)
    ) {
      return { kind: "interval", start, end, period, defaultValue };
    }
  }
  const values = tokens.filter((value) => Number.isFinite(Date.parse(value)));
  return values.length ? { kind: "values", values, defaultValue } : null;
}

export function parseGfmCapabilities(
  xml: string,
  fetchedAt = new Date().toISOString(),
): GfmCapabilities {
  const mapFormats =
    capture(
      xml,
      /<GetMap>[\s\S]*?<Format>([\s\S]*?)<\/GetMap>/i,
    )
      ?.match(/<Format>([^<]+)<\/Format>/gi)
      ?.map((value) => value.replace(/<\/?Format>/gi, "").trim()) ?? [];
  const getMapBlock = /<GetMap>([\s\S]*?)<\/GetMap>/i.exec(xml)?.[1] ?? "";
  const getFeatureInfoBlock =
    /<GetFeatureInfo>([\s\S]*?)<\/GetFeatureInfo>/i.exec(xml)?.[1] ?? "";
  const formats = (block: string) =>
    [...block.matchAll(/<Format>([^<]+)<\/Format>/gi)].map((match) =>
      decodeXml(match[1].trim()),
    );

  const layers: GfmLayerCapability[] = [];
  for (const match of xml.matchAll(
    /<Layer\b([^>]*)>([\s\S]*?)<\/Layer>/gi,
  )) {
    const attributes = match[1];
    const block = match[2];
    const name = capture(block, /<Name>([^<]+)<\/Name>/i);
    if (!name || !name.includes("gfm_")) continue;
    const title = capture(block, /<Title>([^<]+)<\/Title>/i) ?? name;
    const dimensionMatch =
      /<Dimension\b([^>]*\bname=["']time["'][^>]*)>([^<]+)<\/Dimension>/i.exec(
        block,
      );
    const defaultValue = dimensionMatch
      ? capture(dimensionMatch[1], /\bdefault=["']([^"']+)["']/i)
      : null;
    layers.push({
      name: decodeXml(name),
      title: decodeXml(title),
      queryable: /\bqueryable=["']1["']/i.test(attributes),
      time: dimensionMatch
        ? parseGfmTimeDimension(dimensionMatch[2].trim(), defaultValue)
        : null,
    });
  }

  return {
    layers,
    mapFormats: formats(getMapBlock).length
      ? formats(getMapBlock)
      : mapFormats,
    featureInfoFormats: formats(getFeatureInfoBlock),
    observedFloodExtent:
      layers.find((layer) => layer.name === COPERNICUS_OBSERVED_FLOOD_LAYER) ??
      null,
    fetchedAt,
  };
}

export function resolveLatestAvailableGfmTime(
  capabilities: GfmCapabilities,
  now = new Date(),
): string | null {
  const dimension = capabilities.observedFloodExtent?.time;
  if (!dimension) return null;
  const nowMs = now.getTime();
  if (dimension.kind === "values") {
    return (
      dimension.values
        .filter((value) => Date.parse(value) <= nowMs)
        .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ??
      dimension.values.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ??
      null
    );
  }
  const start = Date.parse(dimension.start);
  const end = Date.parse(dimension.end);
  const period = parseDurationMilliseconds(dimension.period);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !period) return null;
  const ceiling = Math.min(nowMs, end);
  if (ceiling < start) return isoSeconds(start);
  const steps = Math.floor((ceiling - start) / period);
  return isoSeconds(start + steps * period);
}

export function isAvailableGfmTime(
  capabilities: GfmCapabilities,
  value: string,
): boolean {
  const target = Date.parse(value);
  const dimension = capabilities.observedFloodExtent?.time;
  if (!Number.isFinite(target) || !dimension) return false;
  if (dimension.kind === "values") {
    return dimension.values.some((item) => Date.parse(item) === target);
  }
  const start = Date.parse(dimension.start);
  const end = Date.parse(dimension.end);
  const period = parseDurationMilliseconds(dimension.period);
  return Boolean(
    period &&
      target >= start &&
      target <= end &&
      (target - start) % period === 0,
  );
}

export async function getGfmCapabilities(): Promise<GfmCapabilities> {
  const now = Date.now();
  if (cachedCapabilities && cachedCapabilities.expiresAt > now) {
    return cachedCapabilities.value;
  }
  if (inFlightCapabilities) return inFlightCapabilities;

  inFlightCapabilities = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(CAPABILITIES_URL, {
        headers: { Accept: "application/xml,text/xml" },
        signal: controller.signal,
        next: { revalidate: 900 },
      });
      if (!response.ok) throw new Error(`copernicus_http_${response.status}`);
      const value = parseGfmCapabilities(await response.text());
      cachedCapabilities = { value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    } finally {
      clearTimeout(timeout);
    }
  })();

  try {
    return await inFlightCapabilities;
  } finally {
    inFlightCapabilities = null;
  }
}
