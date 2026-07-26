"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EffisBurnedAreaPanel from "@/components/incidents/EffisBurnedAreaPanel";
import WildfireIncidentPanel from "@/components/incidents/WildfireIncidentPanel";
import CountryInfoPanel from "@/components/map/CountryInfoPanel";
import MapClient from "@/components/map/MapClient";
import MapLegend from "@/components/map/MapLegend";
import {
  defaultLocale,
  supportedLocales,
  type Locale,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  validateEffisBurnedAreaSnapshot,
  type EffisBurnedAreaSnapshot,
} from "@/lib/incidents/effisSnapshot";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
import type {
  EffisBurnedArea,
  WildfireIncident,
} from "@/lib/incidents/types";

const FIRMS_UNAVAILABLE_TIMEOUT_MS = 20_000;
const FIRMS_HISTORY_UNAVAILABLE_TIMEOUT_MS = 25_000;
const EFFIS_UNAVAILABLE_MESSAGE_MIN_MS = 6_000;

function isEffisServiceFailureStatus(status: number): boolean {
  return (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 408
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export default function MapInterface() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [showEurozone, setShowEurozone] = useState(true);
  const [showNonEurozone, setShowNonEurozone] = useState(true);
  const [showCandidates, setShowCandidates] = useState(true);
  const [showSchengenNonEU, setShowSchengenNonEU] = useState(true);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(
    null,
  );
  const [wildfireIncidents, setWildfireIncidents] = useState<
    WildfireIncident[]
  >([]);
  const [showWildfires, setShowWildfires] = useState(true);
  const [showSatelliteActiveFires, setShowSatelliteActiveFires] =
    useState(false);
  const [showSatelliteBurnedAreas, setShowSatelliteBurnedAreas] =
    useState(false);
  const [selectedWildfireId, setSelectedWildfireId] = useState<string | null>(
    null,
  );
  const [wildfiresLoading, setWildfiresLoading] = useState(true);
  const [selectedEffisBurnedArea, setSelectedEffisBurnedArea] =
    useState<EffisBurnedArea | null>(null);
  const [effisBurnedAreaLoading, setEffisBurnedAreaLoading] = useState(false);
  const [effisSnapshotsByIncidentId, setEffisSnapshotsByIncidentId] = useState<
    Record<string, EffisBurnedAreaSnapshot>
  >({});
  const refreshedSnapshotIdsRef = useRef<Set<string>>(new Set());
  const [firmsSnapshotsByIncidentId, setFirmsSnapshotsByIncidentId] =
    useState<Record<string, FirmsIncidentSnapshot>>({});
  const [firmsSnapshotStatus, setFirmsSnapshotStatus] = useState<
    "live" | "cached" | null
  >(null);
  const [firmsLoadingOverlay, setFirmsLoadingOverlay] = useState(false);
  const [firmsUnavailableMessage, setFirmsUnavailableMessage] =
    useState(false);
  const [firmsHistorySnapshotsByIncidentId, setFirmsHistorySnapshotsByIncidentId] =
    useState<Record<string, FirmsIncidentSnapshot>>({});
  const [firmsHistoryLoadingOverlay, setFirmsHistoryLoadingOverlay] =
    useState(false);
  const [firmsHistoryUnavailableMessage, setFirmsHistoryUnavailableMessage] =
    useState(false);
  const [effisUnavailable, setEffisUnavailable] = useState(false);
  const [showEffisUnavailableBanner, setShowEffisUnavailableBanner] =
    useState(false);
  const [showEffisUnavailableNasaShown, setShowEffisUnavailableNasaShown] =
    useState(false);
  const firmsRefreshStartedRef = useRef(false);
  const firmsHistoryRefreshStartedRef = useRef(false);
  const effisServiceFailedRef = useRef(false);
  const effisProbeStartedRef = useRef(false);
  const effisBannerHideTimeoutRef = useRef<number | null>(null);
  const effisBannerShownAtRef = useRef<number | null>(null);

  const t = getMessages(locale);

  const languageNames = useMemo(
    () => new Intl.DisplayNames(["en"], { type: "language" }),
    [],
  );

  const selectedWildfire = useMemo(
    () =>
      wildfireIncidents.find((incident) => incident.id === selectedWildfireId) ??
      null,
    [wildfireIncidents, selectedWildfireId],
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadWildfires = async () => {
      try {
        setWildfiresLoading(true);
        const response = await fetch("/api/incidents/wildfires", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load wildfires");
        }

        const data: unknown = await response.json();

        if (
          data &&
          typeof data === "object" &&
          "incidents" in data &&
          Array.isArray(data.incidents)
        ) {
          setWildfireIncidents(data.incidents as WildfireIncident[]);
        } else {
          setWildfireIncidents([]);
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          return;
        }

        setWildfireIncidents([]);
      } finally {
        if (!controller.signal.aborted) {
          setWildfiresLoading(false);
        }
      }
    };

    void loadWildfires();
    const intervalId = window.setInterval(() => {
      void loadWildfires();
    }, 6 * 60 * 1000);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (wildfireIncidents.length === 0) return;

    const controller = new AbortController();

    const loadCachedSnapshots = async () => {
      for (let index = 0; index < wildfireIncidents.length; index += 2) {
        if (controller.signal.aborted) return;

        const batch = wildfireIncidents.slice(index, index + 2);
        const results = await Promise.allSettled(
          batch.map(async (incident) => {
            const response = await fetch(
              `/api/incidents/effis/snapshots/${encodeURIComponent(incident.id)}`,
              { signal: controller.signal },
            );

            if (!response.ok) {
              return null;
            }

            const data: unknown = await response.json();
            if (
              !data ||
              typeof data !== "object" ||
              !("snapshot" in data) ||
              !data.snapshot
            ) {
              return null;
            }

            const snapshot = validateEffisBurnedAreaSnapshot(data.snapshot);
            if (!snapshot) return null;

            return { incidentId: incident.id, snapshot };
          }),
        );

        for (const result of results) {
          if (result.status !== "fulfilled" || !result.value) continue;

          const { incidentId, snapshot } = result.value;
          setEffisSnapshotsByIncidentId((currentSnapshots) => ({
            ...currentSnapshots,
            [incidentId]: snapshot,
          }));
        }
      }

      if (controller.signal.aborted) return;

      for (const incident of wildfireIncidents) {
        if (controller.signal.aborted) return;
        if (refreshedSnapshotIdsRef.current.has(incident.id)) continue;

        refreshedSnapshotIdsRef.current.add(incident.id);

        try {
          const response = await fetch(
            `/api/incidents/effis/snapshots/${encodeURIComponent(incident.id)}/refresh`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                longitude: incident.longitude,
                latitude: incident.latitude,
                countryCode: incident.countryCode,
              }),
              signal: controller.signal,
            },
          );

          if (isEffisServiceFailureStatus(response.status)) {
            effisServiceFailedRef.current = true;
            setEffisUnavailable(true);
          } else if (response.ok) {
            const data: unknown = await response.json();
            const preservedPrevious =
              data &&
              typeof data === "object" &&
              "preservedPrevious" in data &&
              data.preservedPrevious === true;
            const rawSnapshot =
              data &&
              typeof data === "object" &&
              "snapshot" in data &&
              data.snapshot
                ? data.snapshot
                : null;
            const snapshot = rawSnapshot
              ? validateEffisBurnedAreaSnapshot(rawSnapshot)
              : null;

            if (snapshot) {
              setEffisSnapshotsByIncidentId((currentSnapshots) => ({
                ...currentSnapshots,
                [incident.id]: snapshot,
              }));
              setEffisUnavailable(false);
            } else if (preservedPrevious) {
              effisServiceFailedRef.current = true;
              setEffisUnavailable(true);
            }
          }
        } catch (error: unknown) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          if (
            typeof error === "object" &&
            error !== null &&
            "name" in error &&
            error.name === "AbortError"
          ) {
            return;
          }

          // Network / timeout failures from the EFFIS refresh route.
          effisServiceFailedRef.current = true;
          setEffisUnavailable(true);
        }

        await sleep(1500);
      }
    };

    void loadCachedSnapshots();

    return () => {
      controller.abort();
    };
  }, [wildfireIncidents]);

  useEffect(() => {
    const controller = new AbortController();

    const applyFirmsSnapshots = (snapshots: FirmsIncidentSnapshot[]) => {
      if (snapshots.length === 0) return;

      setFirmsSnapshotsByIncidentId((previous) => {
        const next = { ...previous };
        for (const snapshot of snapshots) {
          const existing = next[snapshot.incidentId];
          if (
            !existing ||
            Date.parse(snapshot.fetchedAt) >= Date.parse(existing.fetchedAt)
          ) {
            next[snapshot.incidentId] = snapshot;
          }
        }
        return next;
      });
    };

    const loadFirmsSnapshots = async () => {
      try {
        const response = await fetch("/api/incidents/firms/snapshots", {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data: unknown = await response.json();
        if (
          data &&
          typeof data === "object" &&
          "snapshots" in data &&
          Array.isArray(data.snapshots)
        ) {
          const snapshots = data.snapshots as FirmsIncidentSnapshot[];
          applyFirmsSnapshots(snapshots);
          if (snapshots.length > 0) {
            setFirmsSnapshotStatus("cached");
          }
        }
      } catch (error: unknown) {
        if (isAbortError(error)) return;
      }
    };

    const refreshFirmsSnapshots = async () => {
      if (firmsRefreshStartedRef.current) return;
      firmsRefreshStartedRef.current = true;

      try {
        const response = await fetch(
          "/api/incidents/firms/snapshots/refresh",
          {
            method: "POST",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          firmsRefreshStartedRef.current = false;
          return;
        }

        const data: unknown = await response.json();
        if (
          data &&
          typeof data === "object" &&
          "snapshots" in data &&
          Array.isArray(data.snapshots)
        ) {
          const snapshots = data.snapshots as FirmsIncidentSnapshot[];
          applyFirmsSnapshots(snapshots);

          const updated =
            "updated" in data && data.updated === true;
          const preservedPrevious =
            "preservedPrevious" in data && data.preservedPrevious === true;

          if (updated) {
            setFirmsSnapshotStatus("live");
          } else if (preservedPrevious || snapshots.length > 0) {
            setFirmsSnapshotStatus("cached");
          }
        }
      } catch (error: unknown) {
        firmsRefreshStartedRef.current = false;
        if (isAbortError(error)) return;
      }
    };

    void (async () => {
      await loadFirmsSnapshots();
      if (controller.signal.aborted) return;
      await refreshFirmsSnapshots();
    })();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const applyFirmsHistorySnapshots = (snapshots: FirmsIncidentSnapshot[]) => {
      const hasHistory = snapshots.length > 0;
      if (!hasHistory) return;

      setFirmsHistorySnapshotsByIncidentId((previous) => {
        const next = { ...previous };
        for (const snapshot of snapshots) {
          const existing = next[snapshot.incidentId];
          if (
            !existing ||
            Date.parse(snapshot.fetchedAt) >= Date.parse(existing.fetchedAt)
          ) {
            next[snapshot.incidentId] = snapshot;
          }
        }
        return next;
      });

      // Cache hits (updated=false / preservedPrevious=true) still count as data.
      setFirmsHistoryLoadingOverlay(false);
      setFirmsHistoryUnavailableMessage(false);
    };

    const loadFirmsHistorySnapshots = async () => {
      try {
        const response = await fetch("/api/incidents/firms/history", {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data: unknown = await response.json();
        if (
          data &&
          typeof data === "object" &&
          "snapshots" in data &&
          Array.isArray(data.snapshots)
        ) {
          applyFirmsHistorySnapshots(data.snapshots as FirmsIncidentSnapshot[]);
        }
      } catch (error: unknown) {
        if (isAbortError(error)) return;
      }
    };

    const refreshFirmsHistorySnapshots = async () => {
      if (firmsHistoryRefreshStartedRef.current) return;
      firmsHistoryRefreshStartedRef.current = true;

      try {
        const response = await fetch(
          "/api/incidents/firms/history/refresh",
          {
            method: "POST",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          firmsHistoryRefreshStartedRef.current = false;
          return;
        }

        const data: unknown = await response.json();
        if (
          data &&
          typeof data === "object" &&
          "snapshots" in data &&
          Array.isArray(data.snapshots)
        ) {
          // Apply returned snapshots even when updated=false / preservedPrevious=true.
          applyFirmsHistorySnapshots(data.snapshots as FirmsIncidentSnapshot[]);
        }
      } catch (error: unknown) {
        firmsHistoryRefreshStartedRef.current = false;
        if (isAbortError(error)) return;
      }
    };

    void (async () => {
      await loadFirmsHistorySnapshots();
      if (controller.signal.aborted) return;
      await refreshFirmsHistorySnapshots();
    })();

    return () => {
      controller.abort();
    };
  }, []);

  const hasFirmsSnapshots = Object.keys(firmsSnapshotsByIncidentId).length > 0;
  const hasEffisSnapshots =
    Object.keys(effisSnapshotsByIncidentId).length > 0;
  const hasFirmsHistorySnapshots =
    Object.keys(firmsHistorySnapshotsByIncidentId).length > 0;
  const firmsDataAvailable = hasFirmsSnapshots;

  useEffect(() => {
    if (!showSatelliteActiveFires) {
      setFirmsLoadingOverlay(false);
      setFirmsUnavailableMessage(false);
      return;
    }

    setFirmsUnavailableMessage(false);

    if (firmsDataAvailable) {
      setFirmsLoadingOverlay(false);
      return;
    }

    setFirmsLoadingOverlay(true);
  }, [showSatelliteActiveFires, firmsDataAvailable]);

  useEffect(() => {
    if (!showSatelliteActiveFires || firmsDataAvailable) return;

    const timeoutId = window.setTimeout(() => {
      setFirmsLoadingOverlay(false);
      setFirmsUnavailableMessage(true);
    }, FIRMS_UNAVAILABLE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showSatelliteActiveFires, firmsDataAvailable]);

  useEffect(() => {
    if (!showSatelliteBurnedAreas) {
      setFirmsHistoryLoadingOverlay(false);
      setFirmsHistoryUnavailableMessage(false);
      return;
    }

    setFirmsHistoryUnavailableMessage(false);

    if (hasFirmsHistorySnapshots || hasEffisSnapshots) {
      setFirmsHistoryLoadingOverlay(false);
      return;
    }

    setFirmsHistoryLoadingOverlay(true);
  }, [showSatelliteBurnedAreas, hasFirmsHistorySnapshots, hasEffisSnapshots]);

  useEffect(() => {
    if (
      !showSatelliteBurnedAreas ||
      hasFirmsHistorySnapshots ||
      hasEffisSnapshots
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFirmsHistoryLoadingOverlay(false);
      setFirmsHistoryUnavailableMessage(true);
    }, FIRMS_HISTORY_UNAVAILABLE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showSatelliteBurnedAreas, hasFirmsHistorySnapshots, hasEffisSnapshots]);

  // EFFIS unavailable banner: driven by refresh HTTP status / body, not MapLibre.
  // Stays visible at least 6 seconds once shown.
  useEffect(() => {
    if (effisBannerHideTimeoutRef.current !== null) {
      window.clearTimeout(effisBannerHideTimeoutRef.current);
      effisBannerHideTimeoutRef.current = null;
    }

    const effisFailed = effisUnavailable || effisServiceFailedRef.current;

    const shouldShow =
      showSatelliteBurnedAreas &&
      !hasEffisSnapshots &&
      !hasFirmsHistorySnapshots &&
      effisFailed;

    setShowEffisUnavailableNasaShown(
      showSatelliteBurnedAreas &&
        !hasEffisSnapshots &&
        hasFirmsHistorySnapshots &&
        effisFailed,
    );

    if (shouldShow) {
      setShowEffisUnavailableBanner(true);
      if (effisBannerShownAtRef.current === null) {
        effisBannerShownAtRef.current = Date.now();
      }
      return;
    }

    if (hasEffisSnapshots) {
      setEffisUnavailable(false);
    }

    const shownAt = effisBannerShownAtRef.current;
    if (shownAt === null || !showEffisUnavailableBanner) {
      setShowEffisUnavailableBanner(false);
      effisBannerShownAtRef.current = null;
      return;
    }

    const remaining = Math.max(
      0,
      EFFIS_UNAVAILABLE_MESSAGE_MIN_MS - (Date.now() - shownAt),
    );

    if (remaining === 0) {
      setShowEffisUnavailableBanner(false);
      effisBannerShownAtRef.current = null;
      return;
    }

    effisBannerHideTimeoutRef.current = window.setTimeout(() => {
      setShowEffisUnavailableBanner(false);
      effisBannerShownAtRef.current = null;
      effisBannerHideTimeoutRef.current = null;
    }, remaining);

    return () => {
      if (effisBannerHideTimeoutRef.current !== null) {
        window.clearTimeout(effisBannerHideTimeoutRef.current);
        effisBannerHideTimeoutRef.current = null;
      }
    };
  }, [
    showSatelliteBurnedAreas,
    hasEffisSnapshots,
    hasFirmsHistorySnapshots,
    effisUnavailable,
    showEffisUnavailableBanner,
  ]);

  // When the brown checkbox is turned on with no cache, probe one refresh.
  useEffect(() => {
    if (!showSatelliteBurnedAreas) {
      effisProbeStartedRef.current = false;
      return;
    }
    if (hasEffisSnapshots) return;
    if (effisProbeStartedRef.current) return;
    if (wildfireIncidents.length === 0) return;

    effisProbeStartedRef.current = true;
    const controller = new AbortController();

    const probeEffisAvailability = async () => {
      const incident = wildfireIncidents[0];
      if (!incident) return;

      try {
        const response = await fetch(
          `/api/incidents/effis/snapshots/${encodeURIComponent(incident.id)}/refresh`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              longitude: incident.longitude,
              latitude: incident.latitude,
              countryCode: incident.countryCode,
            }),
            signal: controller.signal,
          },
        );

        if (controller.signal.aborted) return;

        if (isEffisServiceFailureStatus(response.status)) {
          effisServiceFailedRef.current = true;
          setEffisUnavailable(true);
          return;
        }

        if (!response.ok) {
          effisServiceFailedRef.current = true;
          setEffisUnavailable(true);
          return;
        }

        const data: unknown = await response.json();
        if (controller.signal.aborted) return;

        const preservedPrevious =
          data &&
          typeof data === "object" &&
          "preservedPrevious" in data &&
          data.preservedPrevious === true;
        const rawSnapshot =
          data &&
          typeof data === "object" &&
          "snapshot" in data &&
          data.snapshot
            ? data.snapshot
            : null;
        const snapshot = rawSnapshot
          ? validateEffisBurnedAreaSnapshot(rawSnapshot)
          : null;

        if (snapshot) {
          setEffisSnapshotsByIncidentId((currentSnapshots) => ({
            ...currentSnapshots,
            [incident.id]: snapshot,
          }));
          setEffisUnavailable(false);
          return;
        }

        if (preservedPrevious || !snapshot) {
          effisServiceFailedRef.current = true;
          setEffisUnavailable(true);
        }
      } catch (error: unknown) {
        if (isAbortError(error)) return;
        effisServiceFailedRef.current = true;
        setEffisUnavailable(true);
      }
    };

    void probeEffisAvailability();

    return () => {
      controller.abort();
    };
  }, [showSatelliteBurnedAreas, hasEffisSnapshots, wildfireIncidents]);

  void wildfiresLoading;

  const handleCountrySelect = (countryCode: string | null) => {
    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCountryCode(countryCode);
  };

  const handleWildfireSelect = (incidentId: string | null) => {
    setSelectedCountryCode(null);
    setSelectedEffisBurnedArea(null);
    setSelectedWildfireId(incidentId);
  };

  return (
    <>
      <MapClient
        showEurozone={showEurozone}
        showNonEurozone={showNonEurozone}
        showCandidates={showCandidates}
        showSchengenNonEU={showSchengenNonEU}
        selectedCountryCode={selectedCountryCode}
        onCountrySelect={handleCountrySelect}
        wildfireIncidents={wildfireIncidents}
        showWildfires={showWildfires}
        onWildfireSelect={handleWildfireSelect}
        showSatelliteActiveFires={showSatelliteActiveFires}
        showSatelliteBurnedAreas={showSatelliteBurnedAreas}
        onEffisBurnedAreaSelect={(burnedArea) => {
          setSelectedEffisBurnedArea(burnedArea);

          if (burnedArea) {
            setSelectedCountryCode(null);
            setSelectedWildfireId(null);
          }
        }}
        onEffisBurnedAreaLoadingChange={setEffisBurnedAreaLoading}
        effisSnapshotsByIncidentId={effisSnapshotsByIncidentId}
        selectedWildfireId={selectedWildfireId}
        locale={locale}
        firmsSnapshotsByIncidentId={firmsSnapshotsByIncidentId}
        firmsHistorySnapshotsByIncidentId={firmsHistorySnapshotsByIncidentId}
        onEffisBurnedAreasAvailabilityChange={(unavailable) => {
          if (unavailable) {
            effisServiceFailedRef.current = true;
            setEffisUnavailable(true);
          }
        }}
      />
      <MapLegend
        locale={locale}
        showEurozone={showEurozone}
        onToggleEurozone={setShowEurozone}
        showNonEurozone={showNonEurozone}
        onToggleNonEurozone={setShowNonEurozone}
        showCandidates={showCandidates}
        onToggleCandidates={setShowCandidates}
        showSchengenNonEU={showSchengenNonEU}
        onToggleSchengenNonEU={setShowSchengenNonEU}
        showWildfires={showWildfires}
        onToggleWildfires={setShowWildfires}
        showSatelliteActiveFires={showSatelliteActiveFires}
        onToggleSatelliteActiveFires={setShowSatelliteActiveFires}
        showSatelliteBurnedAreas={showSatelliteBurnedAreas}
        onToggleSatelliteBurnedAreas={setShowSatelliteBurnedAreas}
      />

      {effisBurnedAreaLoading && (
        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/90 px-3 py-1.5 text-[11px] text-slate-200 shadow-xl backdrop-blur-md">
          {t.incidents.satelliteLookupLoading}
        </div>
      )}

      {(firmsLoadingOverlay || firmsUnavailableMessage) && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-slate-950/90 px-4 py-2.5 text-center text-xs text-slate-200 shadow-xl backdrop-blur-md">
          {firmsLoadingOverlay
            ? t.incidents.firmsLoading
            : t.incidents.firmsTemporarilyUnavailable}
        </div>
      )}

      {(firmsHistoryLoadingOverlay || firmsHistoryUnavailableMessage) && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-slate-950/90 px-4 py-2.5 text-center text-xs text-slate-200 shadow-xl backdrop-blur-md">
          {firmsHistoryLoadingOverlay
            ? t.incidents.firmsHistoryLoading
            : t.incidents.firmsHistoryUnavailable}
        </div>
      )}

      {showEffisUnavailableBanner && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-md border border-white/10 bg-slate-950/90 px-4 py-2 text-center text-xs text-slate-200 shadow-xl backdrop-blur-md">
            {t.incidents.effisTemporarilyUnavailable}
          </div>
        )}

      {showEffisUnavailableNasaShown && !showEffisUnavailableBanner && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-md border border-white/10 bg-slate-950/70 px-3 py-1.5 text-center text-[10px] text-slate-300 shadow-lg backdrop-blur-md">
          {t.incidents.effisUnavailableNasaShown}
        </div>
      )}

      {selectedCountryCode && !selectedWildfire && !selectedEffisBurnedArea && (
        <CountryInfoPanel
          countryCode={selectedCountryCode}
          locale={locale}
          onClose={() => setSelectedCountryCode(null)}
        />
      )}

      {selectedWildfire && !selectedEffisBurnedArea && (
        <WildfireIncidentPanel
          incident={selectedWildfire}
          locale={locale}
          snapshot={
            selectedWildfireId
              ? effisSnapshotsByIncidentId[selectedWildfireId] ?? null
              : null
          }
          firmsSnapshot={
            selectedWildfireId
              ? firmsSnapshotsByIncidentId[selectedWildfireId] ?? null
              : null
          }
          firmsSnapshotStatus={firmsSnapshotStatus}
          firmsHistorySnapshot={
            selectedWildfireId
              ? firmsHistorySnapshotsByIncidentId[selectedWildfireId] ?? null
              : null
          }
          onClose={() => setSelectedWildfireId(null)}
        />
      )}

      {selectedEffisBurnedArea && (
        <EffisBurnedAreaPanel
          burnedArea={selectedEffisBurnedArea}
          locale={locale}
          onClose={() => setSelectedEffisBurnedArea(null)}
        />
      )}

      <div className="absolute right-4 top-4 z-10">
        <label className="sr-only" htmlFor="map-language">
          Language
        </label>
        <select
          id="map-language"
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
          className="rounded-md border border-white/10 bg-slate-950/80 px-2 py-1 text-xs text-white outline-none backdrop-blur-md focus-visible:ring-2 focus-visible:ring-sky-400/70"
        >
          {supportedLocales.map((supportedLocale) => (
            <option key={supportedLocale} value={supportedLocale}>
              {languageNames.of(supportedLocale) ?? supportedLocale}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
