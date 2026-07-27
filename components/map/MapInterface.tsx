"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EffisBurnedAreaPanel from "@/components/incidents/EffisBurnedAreaPanel";
import WildfireIncidentPanel from "@/components/incidents/WildfireIncidentPanel";
import AppHeader from "@/components/layout/AppHeader";
import TemporaryPlaceCard from "@/components/layout/TemporaryPlaceCard";
import CapitalCityPanel from "@/components/europe/CapitalCityPanel";
import EuInstitutionPanel from "@/components/europe/EuInstitutionPanel";
import CountryInfoPanel from "@/components/map/CountryInfoPanel";
import MapClient from "@/components/map/MapClient";
import MapControlDock from "@/components/map/MapControlDock";
import MapLegend from "@/components/map/MapLegend";
import { getEuCapitalById } from "@/lib/europe/euCapitals";
import {
  getEuInstitutionById,
  getEuInstitutionSiteById,
  type EuInstitutionId,
} from "@/lib/europe/euInstitutions";
import {
  defaultLocale,
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
import type { MapCameraCommands } from "@/lib/map/mapCameraCommands";
import type { MapFocusRequest } from "@/lib/map/focusRequest";
import {
  DEFAULT_MAP_LAYER_PREFERENCES,
  defaultLegendCollapsedForViewport,
  loadLegendCollapsed,
  loadMapLayerPreferences,
  saveLegendCollapsed,
  saveMapLayerPreferences,
} from "@/lib/map/mapLayerPreferences";
import {
  readMapViewPreferences,
  writeMapBaseMode,
  writeMapDimensionMode,
  type MapBaseMode,
  type MapDimensionMode,
} from "@/lib/map/mapViewPreferences";
import {
  hasSeenLocationPrompt,
  isGeolocationSecureContext,
  isGeolocationSupported,
  markLocationPromptSeen,
  queryGeolocationPermission,
  type UserLocation,
  type UserLocationStatus,
} from "@/lib/map/userLocation";
import type { MapSearchResult } from "@/lib/search/mapSearch";

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
  const [showEurozone, setShowEurozone] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.euroArea,
  );
  const [showNonEurozone, setShowNonEurozone] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.euOutsideEuroArea,
  );
  const [showCandidates, setShowCandidates] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.euCandidates,
  );
  const [showSchengenNonEU, setShowSchengenNonEU] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.schengenOutsideEu,
  );
  const [showEuCapitals, setShowEuCapitals] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.euCapitals,
  );
  const [selectedCapitalId, setSelectedCapitalId] = useState<string | null>(
    null,
  );
  const [showEuMainInstitutions, setShowEuMainInstitutions] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.euMainInstitutions,
  );
  const [selectedInstitutionId, setSelectedInstitutionId] =
    useState<EuInstitutionId | null>(null);
  const [selectedInstitutionSiteId, setSelectedInstitutionSiteId] = useState<
    string | null
  >(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(
    null,
  );
  const [wildfireIncidents, setWildfireIncidents] = useState<
    WildfireIncident[]
  >([]);
  const [showWildfires, setShowWildfires] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.majorWildfires,
  );
  const [showSatelliteActiveFires, setShowSatelliteActiveFires] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.satelliteActiveFires,
  );
  const [showSatelliteBurnedAreas, setShowSatelliteBurnedAreas] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.recentSatelliteHistory,
  );
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
  const [focusRequest, setFocusRequest] = useState<MapFocusRequest | null>(
    null,
  );
  const [temporaryPlace, setTemporaryPlace] = useState<MapSearchResult | null>(
    null,
  );
  const [legendHighlight, setLegendHighlight] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(true);
  const [layerPrefsHydrated, setLayerPrefsHydrated] = useState(false);
  const [legendCollapsedHydrated, setLegendCollapsedHydrated] = useState(false);
  const [baseMode, setBaseMode] = useState<MapBaseMode>("map");
  const [dimensionMode, setDimensionMode] = useState<MapDimensionMode>("2d");
  const [mapPitch, setMapPitch] = useState(0);
  const [mapBearing, setMapBearing] = useState(0);
  const [terrainReady, setTerrainReady] = useState(false);
  const [locationStatus, setLocationStatus] =
    useState<UserLocationStatus>("idle");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationConsentOpen, setLocationConsentOpen] = useState(false);
  const [locationInfoOpen, setLocationInfoOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapCommandsRef = useRef<MapCameraCommands | null>(null);
  const focusNonceRef = useRef(0);
  const locationWatchIdRef = useRef<number | null>(null);
  const locationStatusRef = useRef<UserLocationStatus>("idle");
  locationStatusRef.current = locationStatus;
  const locationFocusedOnceRef = useRef(false);
  const focusUserLocationRef = useRef<((mode?: "fit" | "soft") => void) | null>(
    null,
  );
  const firmsRefreshStartedRef = useRef(false);
  const firmsHistoryRefreshStartedRef = useRef(false);
  const effisServiceFailedRef = useRef(false);
  const effisProbeStartedRef = useRef(false);
  const effisBannerHideTimeoutRef = useRef<number | null>(null);
  const effisBannerShownAtRef = useRef<number | null>(null);
  const focusGeometryRef = useRef<((geometry: GeoJSON.Geometry) => void) | null>(
    null,
  );

  const t = getMessages(locale);

  const selectedWildfire = useMemo(
    () =>
      wildfireIncidents.find((incident) => incident.id === selectedWildfireId) ??
      null,
    [wildfireIncidents, selectedWildfireId],
  );

  useEffect(() => {
    const prefs = readMapViewPreferences();
    setBaseMode(prefs.baseMode);
    setDimensionMode(prefs.dimensionMode);
  }, []);

  useEffect(() => {
    const prefs = loadMapLayerPreferences();
    setShowEurozone(prefs.euroArea);
    setShowNonEurozone(prefs.euOutsideEuroArea);
    setShowSchengenNonEU(prefs.schengenOutsideEu);
    setShowCandidates(prefs.euCandidates);
    setShowEuCapitals(prefs.euCapitals);
    setShowEuMainInstitutions(prefs.euMainInstitutions);
    setShowWildfires(prefs.majorWildfires);
    setShowSatelliteActiveFires(prefs.satelliteActiveFires);
    setShowSatelliteBurnedAreas(prefs.recentSatelliteHistory);
    setLayerPrefsHydrated(true);
  }, []);

  useEffect(() => {
    const stored = loadLegendCollapsed();
    setLegendCollapsed(
      stored === null ? defaultLegendCollapsedForViewport() : stored,
    );
    setLegendCollapsedHydrated(true);
  }, []);

  useEffect(() => {
    if (!layerPrefsHydrated) return;
    saveMapLayerPreferences({
      euroArea: showEurozone,
      euOutsideEuroArea: showNonEurozone,
      schengenOutsideEu: showSchengenNonEU,
      euCandidates: showCandidates,
      euCapitals: showEuCapitals,
      euMainInstitutions: showEuMainInstitutions,
      majorWildfires: showWildfires,
      satelliteActiveFires: showSatelliteActiveFires,
      recentSatelliteHistory: showSatelliteBurnedAreas,
    });
  }, [
    layerPrefsHydrated,
    showEurozone,
    showNonEurozone,
    showSchengenNonEU,
    showCandidates,
    showEuCapitals,
    showEuMainInstitutions,
    showWildfires,
    showSatelliteActiveFires,
    showSatelliteBurnedAreas,
  ]);

  useEffect(() => {
    if (!legendCollapsedHydrated) return;
    saveLegendCollapsed(legendCollapsed);
  }, [legendCollapsed, legendCollapsedHydrated]);

  useEffect(() => {
    if (!isGeolocationSupported()) {
      setLocationStatus("unavailable");
      return;
    }

    if (!isGeolocationSecureContext()) {
      setLocationStatus("unavailable");
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled || hasSeenLocationPrompt()) return;

        const permission = await queryGeolocationPermission();
        if (cancelled) return;
        if (permission === "denied") return;

        markLocationPromptSeen();
        setLocationConsentOpen(true);
      })();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (locationWatchIdRef.current != null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, []);

  const stopUserLocation = () => {
    if (locationWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }
    locationFocusedOnceRef.current = false;
    setUserLocation(null);
    setLocationStatus("idle");
    setLocationInfoOpen(false);
    setLocationError(null);
  };

  const startUserLocationWatch = () => {
    if (!isGeolocationSupported()) {
      setLocationStatus("unavailable");
      setLocationError(t.location.unsupported);
      return;
    }

    if (!isGeolocationSecureContext()) {
      setLocationStatus("unavailable");
      setLocationError(t.location.insecure);
      return;
    }

    if (locationWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }

    setLocationConsentOpen(false);
    setLocationError(null);
    setLocationStatus("requesting");
    markLocationPromptSeen();

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const next: UserLocation = {
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
          accuracyMeters: position.coords.accuracy,
          heading: Number.isFinite(position.coords.heading)
            ? position.coords.heading
            : null,
          speedMetersPerSecond: Number.isFinite(position.coords.speed)
            ? position.coords.speed
            : null,
          timestamp: position.timestamp,
        };

        setUserLocation(next);
        setLocationError(null);

        const currentStatus = locationStatusRef.current;
        const isFirstFix = !locationFocusedOnceRef.current;

        if (isFirstFix || currentStatus === "requesting") {
          locationFocusedOnceRef.current = true;
          setLocationStatus("following");
          setLocationInfoOpen(true);
          window.requestAnimationFrame(() => {
            focusUserLocationRef.current?.("fit");
          });
          return;
        }

        if (currentStatus === "following") {
          focusUserLocationRef.current?.("soft");
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          stopUserLocation();
          setLocationStatus("denied");
          setLocationError(t.location.denied);
          return;
        }

        if (error.code === error.TIMEOUT) {
          setLocationStatus((status) =>
            status === "following" || status === "passive" ? status : "error",
          );
          setLocationError(t.location.timeout);
          return;
        }

        setLocationStatus((status) =>
          status === "following" || status === "passive" ? status : "error",
        );
        setLocationError(t.location.unavailable);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      },
    );
  };

  const handleLocationButtonClick = async () => {
    setLocationError(null);

    if (locationStatus === "unavailable") {
      setLocationError(
        isGeolocationSecureContext()
          ? t.location.unsupported
          : t.location.insecure,
      );
      return;
    }

    if (locationStatus === "denied") {
      setLocationError(t.location.denied);
      return;
    }

    if (locationStatus === "following" || locationStatus === "passive") {
      setLocationStatus("following");
      setLocationInfoOpen(true);
      focusUserLocationRef.current?.("fit");
      return;
    }

    if (locationStatus === "requesting") return;

    const permission = await queryGeolocationPermission();
    if (permission === "denied") {
      setLocationStatus("denied");
      setLocationError(t.location.denied);
      return;
    }

    if (permission === "granted") {
      startUserLocationWatch();
      return;
    }

    setLocationConsentOpen(true);
    markLocationPromptSeen();
  };

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

  const clearInstitutionSelection = () => {
    setSelectedInstitutionId(null);
    setSelectedInstitutionSiteId(null);
  };

  const handleCountrySelect = (countryCode: string | null) => {
    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    clearInstitutionSelection();
    setSelectedCountryCode(countryCode);
  };

  const handleCapitalSelect = (capitalId: string | null) => {
    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCountryCode(null);
    clearInstitutionSelection();
    clearTemporaryPlace();
    setSelectedCapitalId(capitalId);

    if (capitalId) {
      setShowEuCapitals(true);
      const capital = getEuCapitalById(capitalId);
      if (capital) {
        requestFocus({
          kind: "point",
          longitude: capital.longitude,
          latitude: capital.latitude,
          zoom: 10,
        });
      }
    }
  };

  const handleWildfireSelect = (incidentId: string | null) => {
    setSelectedCountryCode(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    clearInstitutionSelection();
    setSelectedWildfireId(incidentId);
  };

  const requestFocus = (
    request:
      | { kind: "europe" }
      | { kind: "country"; countryCode: string }
      | {
          kind: "point";
          longitude: number;
          latitude: number;
          zoom: number;
        }
      | {
          kind: "bounds";
          west: number;
          south: number;
          east: number;
          north: number;
          padding?: number;
          maxZoom?: number;
        },
  ) => {
    focusNonceRef.current += 1;
    setFocusRequest({ ...request, nonce: focusNonceRef.current });
  };

  const clearTemporaryPlace = () => {
    setTemporaryPlace(null);
  };

  const handleGoEurope = () => {
    setSelectedCountryCode(null);
    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    clearInstitutionSelection();
    clearTemporaryPlace();
    requestFocus({ kind: "europe" });
  };

  const handleFocusLegend = () => {
    setLegendCollapsed(false);
    setLegendHighlight(true);
    window.setTimeout(() => setLegendHighlight(false), 1600);
  };

  const handleInstitutionSelect = (
    institutionId: EuInstitutionId | null,
    siteId?: string,
  ) => {
    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    setSelectedCountryCode(null);
    clearTemporaryPlace();
    setSelectedInstitutionId(institutionId);
    setSelectedInstitutionSiteId(siteId ?? null);

    if (!institutionId) return;

    setShowEuMainInstitutions(true);

    const institution = getEuInstitutionById(institutionId);
    if (!institution) return;

    if (siteId) {
      const site = getEuInstitutionSiteById(siteId);
      if (site) {
        requestFocus({
          kind: "point",
          longitude: site.longitude,
          latitude: site.latitude,
          zoom: 12,
        });
        return;
      }
    }

    const sites = institution.sites;
    if (sites.length === 1) {
      setSelectedInstitutionSiteId(sites[0].id);
      requestFocus({
        kind: "point",
        longitude: sites[0].longitude,
        latitude: sites[0].latitude,
        zoom: 12,
      });
      return;
    }

    if (sites.length > 1) {
      let west = Infinity;
      let south = Infinity;
      let east = -Infinity;
      let north = -Infinity;
      for (const site of sites) {
        west = Math.min(west, site.longitude);
        east = Math.max(east, site.longitude);
        south = Math.min(south, site.latitude);
        north = Math.max(north, site.latitude);
      }
      requestFocus({
        kind: "bounds",
        west,
        south,
        east,
        north,
        padding: 90,
        maxZoom: 8,
      });
    }
  };

  const handleInstitutionSiteSelect = (siteId: string | null) => {
    if (!siteId) {
      setSelectedInstitutionSiteId(null);
      return;
    }

    const site = getEuInstitutionSiteById(siteId);
    if (!site) return;

    const keepCurrentInstitution =
      selectedInstitutionId !== null &&
      site.institutionIds.includes(selectedInstitutionId);

    const institutionId = keepCurrentInstitution
      ? selectedInstitutionId!
      : site.institutionIds[0];

    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    setSelectedCountryCode(null);
    clearTemporaryPlace();
    setShowEuMainInstitutions(true);
    setSelectedInstitutionId(institutionId);
    setSelectedInstitutionSiteId(siteId);

    requestFocus({
      kind: "point",
      longitude: site.longitude,
      latitude: site.latitude,
      zoom: 12,
    });
  };

  const handleSelectSearchResult = (result: MapSearchResult) => {
    if (result.type === "external_place") {
      setSelectedCountryCode(null);
      setSelectedWildfireId(null);
      setSelectedEffisBurnedArea(null);
      setSelectedCapitalId(null);
      clearInstitutionSelection();
      setTemporaryPlace(result);
      requestFocus({
        kind: "point",
        longitude: result.longitude,
        latitude: result.latitude,
        zoom: 10,
      });
      return;
    }

    clearTemporaryPlace();

    if (result.type === "country") {
      if (result.countryCode) {
        handleCountrySelect(result.countryCode);
        requestFocus({
          kind: "country",
          countryCode: result.countryCode,
        });
      }
      return;
    }

    if (result.type === "capital" && result.capitalId) {
      handleCapitalSelect(result.capitalId);
      return;
    }

    if (result.type === "eu_institution") {
      if (result.institutionId) {
        handleInstitutionSelect(result.institutionId, result.siteId);
      } else {
        setSelectedWildfireId(null);
        setSelectedEffisBurnedArea(null);
        setSelectedCountryCode(null);
        setSelectedCapitalId(null);
        clearInstitutionSelection();
        requestFocus({
          kind: "point",
          longitude: result.longitude,
          latitude: result.latitude,
          zoom: 12,
        });
      }
      return;
    }

    if (result.type === "capital") {
      if (result.countryCode) {
        handleCountrySelect(result.countryCode);
      } else {
        setSelectedWildfireId(null);
        setSelectedEffisBurnedArea(null);
        setSelectedCountryCode(null);
        setSelectedCapitalId(null);
        clearInstitutionSelection();
      }
      requestFocus({
        kind: "point",
        longitude: result.longitude,
        latitude: result.latitude,
        zoom: 8,
      });
      return;
    }

    if (result.type === "wildfire" && result.incidentId) {
      handleWildfireSelect(result.incidentId);
      requestFocus({
        kind: "point",
        longitude: result.longitude,
        latitude: result.latitude,
        zoom: 7,
      });
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AppHeader
        locale={locale}
        onLocaleChange={setLocale}
        t={t}
        wildfires={wildfireIncidents}
        onSelectSearchResult={handleSelectSearchResult}
        onGoEurope={handleGoEurope}
        onFocusLegend={handleFocusLegend}
      />

      <div className="absolute inset-0">
        <MapClient
          showEurozone={showEurozone}
          showNonEurozone={showNonEurozone}
          showCandidates={showCandidates}
          showSchengenNonEU={showSchengenNonEU}
          selectedCountryCode={selectedCountryCode}
          onCountrySelect={handleCountrySelect}
          showEuCapitals={showEuCapitals}
          selectedCapitalId={selectedCapitalId}
          onCapitalSelect={handleCapitalSelect}
          showEuMainInstitutions={showEuMainInstitutions}
          selectedInstitutionSiteId={selectedInstitutionSiteId}
          onInstitutionSiteSelect={handleInstitutionSiteSelect}
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
              clearInstitutionSelection();
              clearTemporaryPlace();
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
          focusRequest={focusRequest}
          temporaryMarker={
            temporaryPlace
              ? {
                  longitude: temporaryPlace.longitude,
                  latitude: temporaryPlace.latitude,
                }
              : null
          }
          focusGeometryRef={focusGeometryRef}
          mapCommandsRef={mapCommandsRef}
          baseMode={baseMode}
          dimensionMode={dimensionMode}
          onCameraChange={(snapshot) => {
            setMapPitch(snapshot.pitch);
            setMapBearing(snapshot.bearing);
          }}
          onTerrainReadyChange={setTerrainReady}
          userLocation={userLocation}
          focusUserLocationRef={focusUserLocationRef}
          onUserMapGesture={() => {
            if (
              locationStatusRef.current === "following" ||
              locationStatusRef.current === "requesting"
            ) {
              setLocationStatus("passive");
            }
          }}
        />
        <MapControlDock
          t={t}
          commandsRef={mapCommandsRef}
          baseMode={baseMode}
          dimensionMode={dimensionMode}
          pitch={mapPitch}
          bearing={mapBearing}
          terrainReady={terrainReady}
          onBaseModeChange={(mode) => {
            setBaseMode(mode);
            writeMapBaseMode(mode);
          }}
          onDimensionModeChange={(mode) => {
            setDimensionMode(mode);
            writeMapDimensionMode(mode);
          }}
          locationStatus={locationStatus}
          locationAccuracyMeters={userLocation?.accuracyMeters ?? null}
          consentOpen={locationConsentOpen}
          infoOpen={locationInfoOpen}
          locationError={locationError}
          onLocationButtonClick={() => {
            void handleLocationButtonClick();
          }}
          onAllowLocation={startUserLocationWatch}
          onDismissConsent={() => {
            markLocationPromptSeen();
            setLocationConsentOpen(false);
          }}
          onStopLocation={stopUserLocation}
          onDismissError={() => setLocationError(null)}
          onCloseInfo={() => setLocationInfoOpen(false)}
        />
        <MapLegend
          locale={locale}
          highlight={legendHighlight}
          collapsed={legendCollapsed}
          onCollapsedChange={setLegendCollapsed}
          showEurozone={showEurozone}
          onToggleEurozone={setShowEurozone}
          showNonEurozone={showNonEurozone}
          onToggleNonEurozone={setShowNonEurozone}
          showCandidates={showCandidates}
          onToggleCandidates={setShowCandidates}
          showSchengenNonEU={showSchengenNonEU}
          onToggleSchengenNonEU={setShowSchengenNonEU}
          showEuCapitals={showEuCapitals}
          onToggleEuCapitals={setShowEuCapitals}
          showEuMainInstitutions={showEuMainInstitutions}
          onToggleEuMainInstitutions={setShowEuMainInstitutions}
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

        {selectedCapitalId &&
          !selectedInstitutionId &&
          !selectedWildfire &&
          !selectedEffisBurnedArea &&
          !selectedCountryCode && (
            <CapitalCityPanel
              capitalId={selectedCapitalId}
              locale={locale}
              onClose={() => setSelectedCapitalId(null)}
              onOpenCountry={(countryCode) => {
                setSelectedCapitalId(null);
                handleCountrySelect(countryCode);
              }}
            />
          )}

        {selectedInstitutionId &&
          !selectedCapitalId &&
          !selectedWildfire &&
          !selectedEffisBurnedArea &&
          !selectedCountryCode && (
            <EuInstitutionPanel
              institutionId={selectedInstitutionId}
              locale={locale}
              activeSiteId={selectedInstitutionSiteId}
              onClose={clearInstitutionSelection}
              onFocusSite={(siteId) => handleInstitutionSiteSelect(siteId)}
              onOpenInstitution={(institutionId, siteId) =>
                handleInstitutionSelect(institutionId, siteId)
              }
            />
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
            onFocusGeometry={(geometry) => {
              focusGeometryRef.current?.(geometry);
            }}
          />
        )}

        {selectedEffisBurnedArea && (
          <EffisBurnedAreaPanel
            burnedArea={selectedEffisBurnedArea}
            locale={locale}
            onClose={() => setSelectedEffisBurnedArea(null)}
          />
        )}

        {temporaryPlace ? (
          <TemporaryPlaceCard
            place={temporaryPlace}
            t={t}
            onClose={clearTemporaryPlace}
          />
        ) : null}
      </div>
    </div>
  );
}
