"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Landmark,
  MapPin,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type { EuInstitutionDetails } from "@/lib/europe/euInstitutionDetails";
import {
  getEuInstitutionById,
  type EuInstitutionId,
  type EuInstitutionSiteType,
} from "@/lib/europe/euInstitutions";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";

type EuInstitutionPanelProps = {
  institutionId: EuInstitutionId;
  locale: Locale;
  activeSiteId?: string | null;
  onClose: () => void;
  onFocusSite: (siteId: string) => void;
  onOpenInstitution: (institutionId: EuInstitutionId, siteId?: string) => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function siteTypeLabel(
  siteType: EuInstitutionSiteType,
  t: ReturnType<typeof getMessages>["institutionPanel"],
): string {
  switch (siteType) {
    case "headquarters":
      return t.headquarters;
    case "primary-seat":
      return t.primarySeat;
    case "working-place":
      return t.workingPlace;
    case "secretariat":
      return t.secretariat;
    case "meeting-place":
      return t.meetingPlace;
  }
}

function institutionTypeLabel(
  institutionType: string,
  t: ReturnType<typeof getMessages>["institutionPanel"],
): string {
  switch (institutionType) {
    case "executive":
      return t.typeExecutive;
    case "political-direction":
      return t.typePoliticalDirection;
    case "legislative-council":
      return t.typeLegislativeCouncil;
    case "legislative-assembly":
      return t.typeLegislativeAssembly;
    case "central-bank":
      return t.typeCentralBank;
    default:
      return institutionType;
  }
}

function shortNameFor(
  id: EuInstitutionId,
  t: ReturnType<typeof getMessages>["institutionPanel"],
): string {
  switch (id) {
    case "european-commission":
      return t.shortCommission;
    case "european-council":
      return t.shortEuropeanCouncil;
    case "council-of-the-eu":
      return t.shortCouncilOfTheEu;
    case "european-parliament":
      return t.shortParliament;
    case "european-central-bank":
      return t.shortEcb;
  }
}

function localNameFor(
  id: EuInstitutionId,
  t: ReturnType<typeof getMessages>["institutionPanel"],
): string {
  switch (id) {
    case "european-commission":
      return t.nameCommission;
    case "european-council":
      return t.nameEuropeanCouncil;
    case "council-of-the-eu":
      return t.nameCouncilOfTheEu;
    case "european-parliament":
      return t.nameParliament;
    case "european-central-bank":
      return t.nameEcb;
  }
}

function roleText(
  id: EuInstitutionId,
  t: ReturnType<typeof getMessages>["institutionPanel"],
): string {
  switch (id) {
    case "european-commission":
      return t.roleCommission;
    case "european-council":
      return t.roleEuropeanCouncil;
    case "council-of-the-eu":
      return t.roleCouncilOfTheEu;
    case "european-parliament":
      return t.roleParliament;
    case "european-central-bank":
      return t.roleEcb;
  }
}

function functioningText(
  id: EuInstitutionId,
  t: ReturnType<typeof getMessages>["institutionPanel"],
): string {
  switch (id) {
    case "european-commission":
      return t.functioningCommission;
    case "european-council":
      return t.functioningEuropeanCouncil;
    case "council-of-the-eu":
      return t.functioningCouncilOfTheEu;
    case "european-parliament":
      return t.functioningParliament;
    case "european-central-bank":
      return t.functioningEcb;
  }
}

export default function EuInstitutionPanel({
  institutionId,
  locale,
  activeSiteId = null,
  onClose,
  onFocusSite,
  onOpenInstitution,
  onRouteToPlace,
}: EuInstitutionPanelProps) {
  const t = getMessages(locale);
  const tp = t.institutionPanel;
  const institution = getEuInstitutionById(institutionId) ?? null;
  const [details, setDetails] = useState<EuInstitutionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    setPhotoIndex(0);
  }, [institutionId]);

  useEffect(() => {
    if (!institution) return;

    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setDetails(null);

    const load = async () => {
      try {
        const response = await fetch(
          `/api/europe/institutions/${encodeURIComponent(institution.id)}?locale=${locale}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (response.ok) {
          const data = (await response.json()) as EuInstitutionDetails;
          if (!controller.signal.aborted) {
            setDetails(data);
          }
        } else if (!controller.signal.aborted) {
          setError(true);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (
          typeof err === "object" &&
          err !== null &&
          "name" in err &&
          err.name === "AbortError"
        ) {
          return;
        }
        if (!controller.signal.aborted) {
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [institution, locale]);

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  if (!institution) return null;

  const displayName = details?.name ?? localNameFor(institution.id, tp);
  const shortName = details?.shortName ?? shortNameFor(institution.id, tp);
  const photos = details?.images ?? [];
  const currentPhoto = photos[photoIndex] ?? null;
  const sites = details?.sites?.length
    ? details.sites
    : institution.sites.map((site) => ({
        siteId: site.id,
        name: site.name,
        city: site.city,
        countryCode: site.countryCode,
        siteType: site.siteType,
        address: site.address,
        officialUrl: site.officialUrl,
        sharedSite: site.sharedSite,
        institutionIds: [...site.institutionIds],
        longitude: site.longitude,
        latitude: site.latitude,
      }));

  const showDoNotConfuse =
    institution.id === "european-council" ||
    institution.id === "council-of-the-eu";

  const wikipediaSource = details?.sources.find((source) =>
    source.url.includes("wikipedia.org"),
  );

  const routeSite =
    sites.find((site) => site.siteId === activeSiteId) ?? sites[0] ?? null;
  const placeHasCoords =
    routeSite != null &&
    Number.isFinite(routeSite.latitude) &&
    Number.isFinite(routeSite.longitude);

  return (
    <aside
      className="absolute left-4 z-10 flex w-80 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950/85 text-white shadow-xl backdrop-blur-md"
      style={{
        top: "var(--map-panel-top-offset)",
        maxHeight:
          "calc(100dvh - var(--map-panel-top-offset) - max(16px, env(safe-area-inset-bottom, 0px)))",
      }}
    >
      <header className="sticky top-0 z-[5] shrink-0 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#facc15]/40 bg-[#003399] text-[#facc15] shadow-sm">
            <Landmark className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{displayName}</p>
            <p className="text-[11px] text-slate-300">{shortName}</p>
            <p className="text-[11px] text-slate-400">
              {institutionTypeLabel(institution.institutionType, tp)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.countryPanel.close}
            title={t.countryPanel.close}
            className="inline-flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-slate-300 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            <X aria-hidden="true" size={22} strokeWidth={2} />
          </button>
        </div>
        <p className="mt-2 inline-flex rounded-full border border-[#003399]/40 bg-[#003399]/25 px-2 py-0.5 text-[10px] font-medium text-[#facc15]">
          {tp.badge}
        </p>
        {onRouteToPlace && placeHasCoords && routeSite ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={routeSite.name}
              latitude={routeSite.latitude}
              longitude={routeSite.longitude}
              countryCode={routeSite.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        <section className="mb-4">
          {currentPhoto ? (
            <div className="overflow-hidden rounded-lg border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentPhoto.thumbnailUrl ?? currentPhoto.url}
                alt={currentPhoto.title ?? displayName}
                className="h-40 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 bg-black/40 px-2 py-1.5">
                <button
                  type="button"
                  disabled={photos.length < 2}
                  onClick={() =>
                    setPhotoIndex(
                      (index) => (index - 1 + photos.length) % photos.length,
                    )
                  }
                  aria-label={tp.previousPhoto}
                  className="rounded p-1 text-slate-200 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="min-w-0 flex-1 text-center text-[10px] leading-snug text-slate-300">
                  {tp.photoCredit}
                  {": "}
                  {[currentPhoto.author, currentPhoto.license]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                <button
                  type="button"
                  disabled={photos.length < 2}
                  onClick={() =>
                    setPhotoIndex((index) => (index + 1) % photos.length)
                  }
                  aria-label={tp.nextPhoto}
                  className="rounded p-1 text-slate-200 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="h-40 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/5 text-slate-400">
              <Building2 className="h-8 w-8" aria-hidden="true" />
            </div>
          )}
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.role}
          </h2>
          <p className="text-sm leading-relaxed text-slate-200">
            {details?.roleSummary ?? roleText(institution.id, tp)}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.presentation}
          </h2>
          {loading && !details?.description ? (
            <div className="space-y-2">
              <div className="h-3 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-white/10" />
            </div>
          ) : error && !details?.description ? (
            <p className="text-sm text-amber-200/90">{tp.detailsUnavailable}</p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-slate-200">
                {details?.historySummary ??
                  details?.description ??
                  tp.detailsUnavailable}
              </p>
              {(details?.establishedYear ?? institution.establishedYear) !=
              null ? (
                <p className="mt-2 text-[11px] text-slate-400">
                  {tp.establishedYear}
                  {": "}
                  {details?.establishedYear ?? institution.establishedYear}
                </p>
              ) : null}
            </>
          )}
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.sites}
          </h2>
          {institution.id === "european-parliament" ? (
            <p className="mb-2 text-[11px] leading-relaxed text-slate-300">
              {tp.parliamentSitesNote}
            </p>
          ) : null}
          <ul className="space-y-2">
            {sites.map((site) => {
              const countryLabel =
                regionNames?.of(
                  site.countryCode === "EL" ? "GR" : site.countryCode,
                ) ?? site.countryCode;
              const isActive = activeSiteId === site.siteId;
              return (
                <li
                  key={site.siteId}
                  className={`rounded-lg border px-3 py-2 ${
                    isActive
                      ? "border-sky-400/60 bg-sky-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#facc15]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{site.name}</p>
                      <p className="text-[11px] text-slate-300">
                        {site.city}
                        {" · "}
                        {countryLabel}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {siteTypeLabel(site.siteType, tp)}
                        {site.sharedSite ? ` · ${tp.sharedSite}` : ""}
                      </p>
                      {site.address ? (
                        <p className="mt-1 text-[11px] leading-snug text-slate-400">
                          {site.address}
                        </p>
                      ) : null}
                      {site.sharedSite ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {site.institutionIds.map((otherId) => (
                            <button
                              key={otherId}
                              type="button"
                              onClick={() =>
                                onOpenInstitution(otherId, site.siteId)
                              }
                              className="rounded-md border border-white/15 px-2 py-1 text-[10px] text-sky-300 hover:bg-white/10"
                            >
                              {localNameFor(otherId, tp)}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onFocusSite(site.siteId)}
                        className="mt-2 inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[11px] text-sky-300 hover:bg-white/10"
                      >
                        {tp.viewOnMap}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.functioning}
          </h2>
          <p className="text-sm leading-relaxed text-slate-200">
            {functioningText(institution.id, tp)}
          </p>
        </section>

        {showDoNotConfuse ? (
          <section className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
              {tp.doNotConfuse}
            </h2>
            <p className="text-[12px] leading-relaxed text-amber-50/95">
              {tp.doNotConfuseCouncils}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-amber-100/80">
              {tp.councilOfEuropeNote}
            </p>
          </section>
        ) : null}

        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.officialLinks}
          </h2>
          <ul className="space-y-1.5 text-sm">
            <li>
              <a
                href={institution.officialWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-400 hover:underline"
              >
                {tp.officialWebsite}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </li>
            <li>
              <a
                href={institution.officialInformationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-400 hover:underline"
              >
                {tp.euPortal}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </li>
            {sites
              .filter((site) => site.officialUrl)
              .slice(0, 2)
              .map((site) => (
                <li key={`visit-${site.siteId}`}>
                  <a
                    href={site.officialUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                  >
                    {tp.visitPage}
                    {" · "}
                    {site.city}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            {wikipediaSource ? (
              <li>
                <a
                  href={wikipediaSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                >
                  {tp.wikipedia}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="mb-2">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.sources}
          </h2>
          <ul className="space-y-1 text-[11px] text-slate-400">
            {(details?.sources ?? []).map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-300 hover:underline"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
