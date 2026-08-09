"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  forwardRef,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Box,
  ChevronDown,
  ChevronUp,
  Compass,
  Layers,
  LoaderCircle,
  LocateFixed,
  Minus,
  Plus,
} from "lucide-react";
import type { Messages } from "@/lib/i18n/messages/types";
import type { MapCameraCommands } from "@/lib/map/mapCameraCommands";
import type {
  MapBaseMode,
  MapDimensionMode,
} from "@/lib/map/mapViewPreferences";
import { getEnabledBasemaps } from "@/lib/map/basemapRegistry";
import {
  formatAccuracyLabel,
  type UserLocationStatus,
} from "@/lib/map/userLocation";
import { useAnchoredPortalRect } from "@/lib/ui/useAnchoredPortalRect";

type MapControlDockProps = {
  t: Messages;
  commandsRef: MutableRefObject<MapCameraCommands | null>;
  baseMode: MapBaseMode;
  dimensionMode: MapDimensionMode;
  pitch: number;
  bearing: number;
  terrainReady: boolean;
  onBaseModeChange: (mode: MapBaseMode) => void;
  onDimensionModeChange: (mode: MapDimensionMode) => void;
  basemapId?: string;
  onBasemapIdChange?: (id: string) => void;
  locationStatus: UserLocationStatus;
  locationAccuracyMeters: number | null;
  consentOpen: boolean;
  infoOpen: boolean;
  locationError: string | null;
  onLocationButtonClick: () => void;
  onAllowLocation: () => void;
  onDismissConsent: () => void;
  onStopLocation: () => void;
  onDismissError: () => void;
  onCloseInfo: () => void;
};

const cardStyle = {
  background: "var(--map-ui-surface)",
  borderColor: "var(--map-ui-border)",
  boxShadow: "var(--map-ui-shadow)",
} as const;

export default function MapControlDock({
  t,
  commandsRef,
  baseMode,
  dimensionMode,
  pitch,
  bearing,
  terrainReady,
  onBaseModeChange,
  onDimensionModeChange,
  basemapId = "standard",
  onBasemapIdChange,
  locationStatus,
  locationAccuracyMeters,
  consentOpen,
  infoOpen,
  locationError,
  onLocationButtonClick,
  onAllowLocation,
  onDismissConsent,
  onStopLocation,
  onDismissError,
  onCloseInfo,
}: MapControlDockProps) {
  const [layersOpen, setLayersOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const layersButtonRef = useRef<HTMLButtonElement | null>(null);
  const layersPanelRef = useRef<HTMLDivElement | null>(null);
  const locateButtonRef = useRef<HTMLButtonElement | null>(null);
  const locationPanelRef = useRef<HTMLDivElement | null>(null);
  const layersPanelId = useId();
  const locationPanelId = useId();
  const layersAnchor = useAnchoredPortalRect(layersButtonRef, layersOpen);
  const locationAnchor = useAnchoredPortalRect(
    locateButtonRef,
    consentOpen || infoOpen || Boolean(locationError),
  );

  const is3d = dimensionMode === "3d" || pitch > 0;
  const canPitchUp = pitch < 70;
  const canPitchDown = pitch > 0;
  const locationActive =
    locationStatus === "following" || locationStatus === "passive";
  const locationPressed = locationStatus === "following";
  const locationDisabled =
    locationStatus === "unavailable" || locationStatus === "requesting";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!layersOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        layersButtonRef.current?.contains(target) ||
        layersPanelRef.current?.contains(target)
      ) {
        return;
      }
      setLayersOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setLayersOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [layersOpen]);

  useEffect(() => {
    if (!consentOpen && !infoOpen && !locationError) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        locateButtonRef.current?.contains(target) ||
        locationPanelRef.current?.contains(target)
      ) {
        return;
      }
      if (consentOpen) onDismissConsent();
      if (infoOpen) onCloseInfo();
      if (locationError) onDismissError();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (consentOpen) onDismissConsent();
        if (infoOpen) onCloseInfo();
        if (locationError) onDismissError();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [
    consentOpen,
    infoOpen,
    locationError,
    onDismissConsent,
    onCloseInfo,
    onDismissError,
  ]);

  const run = (action: Exclude<keyof MapCameraCommands, "isReady">) => {
    const commands = commandsRef.current;
    if (!commands?.isReady()) return;
    commands[action]();
  };

  const panelWidth = Math.min(
    272,
    typeof window !== "undefined" ? window.innerWidth - 32 : 272,
  );

  const placePanel = (
    anchor: { top: number; right: number; bottom: number; left: number } | null,
  ) => {
    const preferredRight = anchor
      ? Math.max(16, window.innerWidth - anchor.right)
      : 18;
    const preferredBottom = anchor
      ? Math.max(16, window.innerHeight - anchor.top + 8)
      : 110;
    const maxRight = Math.max(
      16,
      (typeof window !== "undefined" ? window.innerWidth : 400) - panelWidth - 16,
    );
    return {
      right: Math.min(preferredRight, maxRight),
      bottom: Math.min(
        preferredBottom,
        typeof window !== "undefined"
          ? Math.max(16, window.innerHeight - 260)
          : preferredBottom,
      ),
    };
  };

  const layersPanelPos = placePanel(layersAnchor);
  const locationPanelPos = placePanel(locationAnchor);

  const locateLabel =
    locationStatus === "requesting"
      ? t.location.locating
      : locationStatus === "passive"
        ? t.location.recenter
        : locationStatus === "following"
          ? t.location.following
          : t.location.myLocation;

  const locateIconColor =
    locationStatus === "denied" || locationStatus === "error"
      ? "#ea580c"
      : locationStatus === "following"
        ? "#1a73e8"
        : "var(--map-ui-text)";

  return (
    <>
      <div
        className="pointer-events-none absolute"
        style={{
          zIndex: 920,
          right: 18,
          bottom: "calc(30px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className="pointer-events-auto"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, auto)",
            gap: "clamp(6px, 1.5vw, 8px)",
            alignItems: "end",
          }}
        >
          <div
            className="flex flex-col overflow-hidden rounded-[18px] border"
            style={cardStyle}
          >
            <DockButton
              ref={layersButtonRef}
              label={t.mapControls.layers}
              pressed={layersOpen}
              onClick={() => setLayersOpen((value) => !value)}
              ariaControls={layersPanelId}
            >
              <Layers className="h-5 w-5" aria-hidden="true" />
            </DockButton>

            <Divider />

            <DockButton
              label={is3d ? t.mapControls.disable3d : t.mapControls.enable3d}
              pressed={is3d}
              disabled={!terrainReady && !is3d}
              onClick={() => onDimensionModeChange(is3d ? "2d" : "3d")}
            >
              <span className="flex flex-col items-center leading-none">
                <Box className="h-4 w-4" aria-hidden="true" />
                <span className="mt-0.5 text-[9px] font-semibold">
                  {is3d ? t.mapControls.view3d : t.mapControls.view2d}
                </span>
              </span>
            </DockButton>

            <Divider />

            <DockButton
              label={t.mapControls.tiltUp}
              disabled={!canPitchUp}
              onClick={() => run("pitchUp")}
            >
              <ChevronUp className="h-5 w-5" aria-hidden="true" />
            </DockButton>

            <DockButton
              label={t.mapControls.tiltDown}
              disabled={!canPitchDown}
              onClick={() => run("pitchDown")}
            >
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            </DockButton>
          </div>

          <div
            className="flex flex-col overflow-hidden rounded-[18px] border"
            style={cardStyle}
          >
            <DockButton
              label={t.mapControls.resetNorth}
              onClick={() => run("resetNorth")}
            >
              <Compass
                className="h-5 w-5 transition-transform duration-200"
                style={{ transform: `rotate(${-bearing}deg)` }}
                aria-hidden="true"
              />
            </DockButton>

            <Divider />

            <DockButton
              ref={locateButtonRef}
              label={locateLabel}
              pressed={locationPressed}
              disabled={locationDisabled}
              onClick={onLocationButtonClick}
              ariaControls={locationPanelId}
              style={
                locationStatus === "following"
                  ? { background: "rgba(26,115,232,0.12)" }
                  : undefined
              }
            >
              <span className="relative inline-flex">
                {locationStatus === "requesting" ? (
                  <LoaderCircle
                    className="h-5 w-5 animate-spin"
                    style={{ color: "#1a73e8" }}
                    aria-hidden="true"
                  />
                ) : (
                  <LocateFixed
                    className="h-5 w-5"
                    style={{ color: locateIconColor }}
                    aria-hidden="true"
                  />
                )}
                {locationStatus === "passive" ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full"
                    style={{ background: "#1a73e8" }}
                    aria-hidden="true"
                  />
                ) : null}
              </span>
            </DockButton>

            <Divider />

            <DockButton label={t.mapControls.zoomIn} onClick={() => run("zoomIn")}>
              <Plus className="h-5 w-5" aria-hidden="true" />
            </DockButton>

            <DockButton
              label={t.mapControls.zoomOut}
              onClick={() => run("zoomOut")}
            >
              <Minus className="h-5 w-5" aria-hidden="true" />
            </DockButton>
          </div>
        </div>
      </div>

      {mounted &&
        layersOpen &&
        createPortal(
          <div
            ref={layersPanelRef}
            id={layersPanelId}
            role="dialog"
            aria-label={t.mapControls.layers}
            className="fixed rounded-[18px] border p-3"
            style={{
              width: panelWidth,
              bottom: layersPanelPos.bottom,
              right: layersPanelPos.right,
              zIndex: 1260,
              background: "var(--map-ui-surface)",
              borderColor: "var(--map-ui-border)",
              boxShadow: "var(--map-ui-shadow)",
              color: "var(--map-ui-text)",
            }}
          >
            <p
              className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--map-ui-muted)" }}
            >
              {t.mapControls.layers}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <BaseModeCard
                title={t.mapControls.baseMap}
                active={baseMode === "map"}
                previewClassName="bg-[linear-gradient(135deg,#dbeafe_0%,#f8fafc_45%,#bbf7d0_100%)]"
                onClick={() => {
                  onBaseModeChange("map");
                  setLayersOpen(false);
                }}
              />
              <BaseModeCard
                title={t.mapControls.baseRelief}
                active={baseMode === "relief"}
                previewClassName="bg-[linear-gradient(135deg,#d6d3d1_0%,#a8a29e_40%,#78716c_100%)]"
                onClick={() => {
                  onBaseModeChange("relief");
                  setLayersOpen(false);
                }}
              />
              <BaseModeCard
                title={t.mapControls.baseSatellite}
                active={false}
                disabled
                previewClassName="bg-[linear-gradient(135deg,#1e293b_0%,#334155_50%,#0f172a_100%)]"
                caption={t.mapControls.satellitePending}
              />
            </div>
            <p className="mt-3 text-xs font-semibold text-[var(--map-ui-muted)]">
              Base map
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {getEnabledBasemaps().map((basemap) => (
                <BaseModeCard
                  key={basemap.id}
                  title={basemap.id}
                  active={basemapId === basemap.id}
                  previewClassName={basemap.previewClassName}
                  onClick={() => {
                    onBasemapIdChange?.(basemap.id);
                    setLayersOpen(false);
                  }}
                />
              ))}
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        consentOpen &&
        createPortal(
          <div
            ref={locationPanelRef}
            id={locationPanelId}
            role="dialog"
            aria-labelledby={`${locationPanelId}-title`}
            className="fixed rounded-[18px] border p-3"
            style={{
              width: panelWidth,
              bottom: locationPanelPos.bottom,
              right: locationPanelPos.right,
              zIndex: 1260,
              background: "var(--map-ui-surface)",
              borderColor: "var(--map-ui-border)",
              boxShadow: "var(--map-ui-shadow)",
              color: "var(--map-ui-text)",
            }}
          >
            <p
              id={`${locationPanelId}-title`}
              className="px-1 text-sm font-semibold"
            >
              {t.location.promptTitle}
            </p>
            <p
              className="mt-1.5 px-1 text-xs leading-relaxed"
              style={{ color: "var(--map-ui-muted)" }}
            >
              {t.location.promptBody}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={onAllowLocation}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
                style={{ background: "#1a73e8" }}
              >
                {t.location.allow}
              </button>
              <button
                type="button"
                onClick={onDismissConsent}
                className="rounded-xl px-3 py-2.5 text-sm font-medium outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
                style={{ color: "var(--map-ui-text)" }}
              >
                {t.location.later}
              </button>
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        !consentOpen &&
        (infoOpen || locationError) &&
        createPortal(
          <div
            ref={locationPanelRef}
            id={locationPanelId}
            role="status"
            aria-live="polite"
            className="fixed rounded-[18px] border p-3"
            style={{
              width: panelWidth,
              bottom: locationPanelPos.bottom,
              right: locationPanelPos.right,
              zIndex: 1260,
              background: "var(--map-ui-surface)",
              borderColor: "var(--map-ui-border)",
              boxShadow: "var(--map-ui-shadow)",
              color: "var(--map-ui-text)",
            }}
          >
            {locationError ? (
              <p className="px-1 text-xs leading-relaxed">{locationError}</p>
            ) : (
              <>
                <p className="px-1 text-sm font-semibold">{t.location.found}</p>
                {locationAccuracyMeters != null ? (
                  <p
                    className="mt-1 px-1 text-xs"
                    style={{ color: "var(--map-ui-muted)" }}
                  >
                    {t.location.approximateAccuracy}
                    {": "}
                    {formatAccuracyLabel(locationAccuracyMeters)}
                  </p>
                ) : null}
                <p
                  className="mt-1 px-1 text-xs"
                  style={{ color: "var(--map-ui-muted)" }}
                >
                  {locationStatus === "passive"
                    ? t.location.passiveHint
                    : t.location.following}
                </p>
              </>
            )}
            {locationActive ? (
              <button
                type="button"
                onClick={onStopLocation}
                className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
                style={{ color: "#b91c1c" }}
              >
                {t.location.stop}
              </button>
            ) : null}
          </div>,
          document.body,
        )}
    </>
  );
}

function Divider() {
  return (
    <div
      className="mx-2 h-px"
      style={{ background: "var(--map-ui-border)" }}
      aria-hidden="true"
    />
  );
}

const DockButton = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    children: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    pressed?: boolean;
    ariaControls?: string;
    style?: CSSProperties;
  }
>(function DockButton(
  { label, children, onClick, disabled, pressed, ariaControls, style },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      aria-controls={ariaControls}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center outline-none transition hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1a73e8]/60 disabled:cursor-not-allowed disabled:opacity-40"
      style={{ color: "var(--map-ui-text)", ...style }}
    >
      {children}
    </button>
  );
});

function BaseModeCard({
  title,
  previewClassName,
  active,
  disabled,
  caption,
  onClick,
}: {
  title: string;
  previewClassName: string;
  active: boolean;
  disabled?: boolean;
  caption?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl border p-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60 disabled:cursor-not-allowed disabled:opacity-70"
      style={{
        borderColor: active ? "#1a73e8" : "var(--map-ui-border)",
        background: active ? "rgba(26,115,232,0.06)" : "transparent",
      }}
      aria-pressed={active}
      aria-label={title}
    >
      <div className={`mb-1.5 h-12 rounded-lg ${previewClassName}`} />
      <p className="px-0.5 text-[11px] font-semibold">{title}</p>
      {caption ? (
        <p
          className="mt-0.5 px-0.5 text-[9px] leading-snug"
          style={{ color: "var(--map-ui-muted)" }}
        >
          {caption}
        </p>
      ) : null}
    </button>
  );
}
