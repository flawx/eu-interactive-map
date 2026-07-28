"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Factory, Mountain, X } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { NormalizedAlert } from "@/lib/alerts/types";

type Product = {
  id: string;
  aoiId: string;
  kind: string;
  feasible: boolean;
  latestVersion: string | null;
  deliveredAt: string | null;
  geometry: GeoJSON.Geometry | null;
  layers: Array<{ format: string; url: string; attribution: string }>;
  downloadUrl: string | null;
};

type Aoi = {
  id: string;
  name: string;
  geometry: GeoJSON.Geometry | null;
  products: Product[];
};

type Props = {
  alert: NormalizedAlert;
  locale: Locale;
  onClose: () => void;
};

function date(value: unknown, locale: Locale): string | null {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function labels(locale: Locale) {
  if (locale === "fr") {
    return {
      activation: "Activation de cartographie d’urgence Copernicus",
      reason: "Raison de l’activation",
      timeline: "Chronologie",
      event: "Événement",
      activated: "Activation",
      updated: "Dernière mise à jour",
      aoi: "Zones d’intérêt",
      results: "Résultats cartographiques",
      stats: "Statistiques disponibles",
      products: "Produits",
      sources: "Sources et attribution",
      open: "Ouvert",
      closed: "Fermé",
      area: "Étendue observée",
      buildings: "Bâtiments affectés",
      population: "Population potentiellement affectée",
      unavailable: "Information indisponible",
      report: "Rapport public",
      viewer: "Viewer Copernicus",
      download: "Téléchargement public",
      limitation:
        "Une activation représente une demande de cartographie d’urgence. Elle n’est ni un inventaire exhaustif ni, à elle seule, la confirmation officielle d’un incident en cours.",
      aoiWarning:
        "Une zone d’intérêt est une zone d’analyse ; elle ne représente pas nécessairement l’étendue de l’événement.",
      detailsUnavailable:
        "Les détails distants sont temporairement indisponibles ; les données locales fiables restent affichées.",
    };
  }
  return {
    activation: "Copernicus emergency mapping activation",
    reason: "Activation reason",
    timeline: "Timeline",
    event: "Event",
    activated: "Activation",
    updated: "Last update",
    aoi: "Areas of interest",
    results: "Mapping results",
    stats: "Available statistics",
    products: "Products",
    sources: "Sources and attribution",
    open: "Open",
    closed: "Closed",
    area: "Observed extent",
    buildings: "Affected buildings",
    population: "Potentially affected population",
    unavailable: "Information unavailable",
    report: "Public report",
    viewer: "Copernicus viewer",
    download: "Public download",
    limitation:
      "An activation represents an emergency mapping request. It is neither an exhaustive inventory nor, by itself, official confirmation of an ongoing incident.",
    aoiWarning:
      "An area of interest is an analysis area; it does not necessarily represent the event extent.",
    detailsUnavailable:
      "Remote details are temporarily unavailable; reliable local data remains visible.",
  };
}

export default function CopernicusActivationPanel({
  alert,
  locale,
  onClose,
}: Props) {
  const t = labels(locale);
  const [details, setDetails] = useState<NormalizedAlert>(alert);
  const [partial, setPartial] = useState(false);
  const [selectedProductKind, setSelectedProductKind] = useState<
    "aoi" | "delineation" | "grading"
  >("aoi");

  useEffect(() => {
    setDetails(alert);
    setPartial(false);
    const code = String(alert.metadata.cemsActivationCode ?? alert.sourceEventId);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    void fetch(`/api/alerts/emergency-mapping/${encodeURIComponent(code)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("cems_detail_unavailable");
        const payload = (await response.json()) as { alert?: NormalizedAlert };
        if (payload.alert) setDetails(payload.alert);
      })
      .catch(() => setPartial(true))
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [alert]);

  const aois = useMemo(
    () => (Array.isArray(details.metadata.aois) ? details.metadata.aois as Aoi[] : []),
    [details],
  );
  const products = useMemo(
    () =>
      (Array.isArray(details.metadata.products)
        ? details.metadata.products as Product[]
        : aois.flatMap((aoi) => aoi.products ?? [])
      ).filter((product) => product.feasible !== false),
    [aois, details],
  );
  const hasDelineation = products.some((product) => product.kind === "delineation");
  const hasGrading = products.some((product) => product.kind === "grading");
  const closed = Boolean(details.metadata.closed) || details.status === "ended";
  const area =
    typeof details.metadata.observedAreaSquareKilometers === "number"
      ? details.metadata.observedAreaSquareKilometers
      : null;
  const buildings =
    typeof details.metadata.affectedBuildings === "number"
      ? details.metadata.affectedBuildings
      : null;
  const population =
    typeof details.metadata.affectedPopulation === "number"
      ? details.metadata.affectedPopulation
      : null;
  const reportUrl =
    typeof details.metadata.reportUrl === "string" ? details.metadata.reportUrl : null;
  const viewerUrl =
    typeof details.metadata.viewerUrl === "string" ? details.metadata.viewerUrl : null;

  return (
    <aside className="absolute inset-y-0 left-0 z-40 flex w-full max-w-[430px] flex-col border-r border-white/10 bg-slate-950/96 pt-[var(--app-header-height,56px)] text-xs text-slate-200 shadow-2xl backdrop-blur-md">
      <header className="flex shrink-0 items-start gap-3 border-b border-white/10 p-4">
        <span className="mt-0.5 rounded-lg border border-white/15 bg-amber-500/15 p-2 text-amber-200">
          {details.category === "landslide" ? (
            <Mountain className="h-5 w-5" />
          ) : (
            <Factory className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            {t.activation}
          </p>
          <h2 className="mt-1 text-base font-semibold text-white">{details.title}</h2>
          <p className="mt-1 text-slate-400">
            {String(details.metadata.cemsActivationCode ?? details.sourceEventId)} ·{" "}
            {closed ? t.closed : t.open} · {details.countryCodes.join(", ")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 hover:bg-white/5"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {partial && (
          <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-amber-100">
            {t.detailsUnavailable}
          </p>
        )}
        <section>
          <h3 className="font-semibold uppercase tracking-wide text-slate-400">{t.reason}</h3>
          <p className="mt-1.5 leading-relaxed">{details.description ?? t.unavailable}</p>
        </section>
        <section>
          <h3 className="font-semibold uppercase tracking-wide text-slate-400">{t.timeline}</h3>
          <dl className="mt-1.5 space-y-1">
            <div><dt className="inline text-slate-400">{t.event}: </dt><dd className="inline">{date(details.metadata.eventTime ?? details.onsetAt, locale) ?? t.unavailable}</dd></div>
            <div><dt className="inline text-slate-400">{t.activated}: </dt><dd className="inline">{date(details.metadata.activationTime ?? details.effectiveAt, locale) ?? t.unavailable}</dd></div>
            <div><dt className="inline text-slate-400">{t.updated}: </dt><dd className="inline">{date(details.updatedAt, locale) ?? t.unavailable} UTC</dd></div>
          </dl>
        </section>
        <section>
          <h3 className="font-semibold uppercase tracking-wide text-slate-400">{t.aoi}</h3>
          <p className="mt-1.5">{aois.length || Number(details.metadata.aoiCount ?? 0)}</p>
          <ul className="mt-1 list-inside list-disc text-slate-300">
            {aois.map((aoi) => <li key={aoi.id}>{aoi.name}</li>)}
          </ul>
          <p className="mt-2 text-[10px] text-amber-100">{t.aoiWarning}</p>
        </section>
        {(hasDelineation || hasGrading) && (
          <section>
            <h3 className="font-semibold uppercase tracking-wide text-slate-400">{t.results}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setSelectedProductKind("aoi")} className={`rounded-md border px-2 py-1 ${selectedProductKind === "aoi" ? "border-amber-300 bg-amber-300/15" : "border-white/10"}`}>{t.aoi}</button>
              {hasDelineation && <button type="button" onClick={() => setSelectedProductKind("delineation")} className={`rounded-md border px-2 py-1 ${selectedProductKind === "delineation" ? "border-cyan-300 bg-cyan-300/15" : "border-white/10"}`}>{t.area}</button>}
              {hasGrading && <button type="button" onClick={() => setSelectedProductKind("grading")} className={`rounded-md border px-2 py-1 ${selectedProductKind === "grading" ? "border-cyan-300 bg-cyan-300/15" : "border-white/10"}`}>Damage assessment</button>}
            </div>
          </section>
        )}
        <section>
          <h3 className="font-semibold uppercase tracking-wide text-slate-400">{t.stats}</h3>
          <dl className="mt-1.5 space-y-1">
            <div><dt className="inline text-slate-400">{t.area}: </dt><dd className="inline">{area == null ? t.unavailable : `${area.toLocaleString(locale)} km²`}</dd></div>
            {buildings != null && <div><dt className="inline text-slate-400">{t.buildings}: </dt><dd className="inline">{buildings.toLocaleString(locale)}</dd></div>}
            {population != null && <div><dt className="inline text-slate-400">{t.population}: </dt><dd className="inline">{population.toLocaleString(locale)}</dd></div>}
          </dl>
        </section>
        <section>
          <h3 className="font-semibold uppercase tracking-wide text-slate-400">{t.products}</h3>
          <div className="mt-1.5 space-y-2">
            {products.length === 0 && <p>{t.unavailable}</p>}
            {products.map((product) => (
              <article key={product.id} className="rounded-lg border border-white/10 p-2.5">
                <p className="font-medium">{product.kind} · v{product.latestVersion ?? "?"}</p>
                <p className="text-[10px] text-slate-400">{date(product.deliveredAt, locale) ?? t.unavailable}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {product.layers.map((layer) => (
                    <a key={layer.url} href={layer.url} target="_blank" rel="noreferrer" className="rounded border border-white/10 px-2 py-1 text-sky-300">
                      {layer.format} <ExternalLink className="inline h-3 w-3" />
                    </a>
                  ))}
                  {product.downloadUrl && (
                    <a href={product.downloadUrl} target="_blank" rel="noreferrer" className="rounded border border-white/10 px-2 py-1 text-sky-300">
                      {t.download} <ExternalLink className="inline h-3 w-3" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
        <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-amber-100">{t.limitation}</p>
        <section>
          <h3 className="font-semibold uppercase tracking-wide text-slate-400">{t.sources}</h3>
          <p className="mt-1.5">European Union, Copernicus Emergency Management Service</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {reportUrl && <a href={reportUrl} target="_blank" rel="noreferrer" className="text-sky-300">{t.report} <ExternalLink className="inline h-3 w-3" /></a>}
            {viewerUrl && <a href={viewerUrl} target="_blank" rel="noreferrer" className="text-sky-300">{t.viewer} <ExternalLink className="inline h-3 w-3" /></a>}
            {typeof details.metadata.emarsReportUrl === "string" && (
              <a href={details.metadata.emarsReportUrl} target="_blank" rel="noreferrer" className="text-sky-300">eMARS <ExternalLink className="inline h-3 w-3" /></a>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
