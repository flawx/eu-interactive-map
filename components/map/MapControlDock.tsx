"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  forwardRef,
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
  Minus,
  Plus,
} from "lucide-react";
import type { Messages } from "@/lib/i18n/messages/types";
import type { MapCameraCommands } from "@/lib/map/mapCameraCommands";
import type {
  MapBaseMode,
  MapDimensionMode,
} from "@/lib/map/mapViewPreferences";
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
}: MapControlDockProps) {
  const [layersOpen, setLayersOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const layersButtonRef = useRef<HTMLButtonElement | null>(null);
  const layersPanelRef = useRef<HTMLDivElement | null>(null);
  const layersPanelId = useId();
  const anchor = useAnchoredPortalRect(layersButtonRef, layersOpen);

  const is3d = dimensionMode === "3d" || pitch > 0;
  const canPitchUp = pitch < 70;
  const canPitchDown = pitch > 0;

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

  const run = (action: Exclude<keyof MapCameraCommands, "isReady">) => {
    const commands = commandsRef.current;
    if (!commands?.isReady()) return;
    commands[action]();
  };

  const panelWidth = Math.min(272, typeof window !== "undefined" ? window.innerWidth - 32 : 272);
  const preferredRight = anchor
    ? Math.max(16, window.innerWidth - anchor.right)
    : 18;
  const preferredBottom = anchor
    ? Math.max(16, window.innerHeight - anchor.top + 8)
    : 110;
  const maxRight = Math.max(16, (typeof window !== "undefined" ? window.innerWidth : 400) - panelWidth - 16);
  const panelRight = Math.min(preferredRight, maxRight);
  const panelBottom = Math.min(
    preferredBottom,
    typeof window !== "undefined" ? Math.max(16, window.innerHeight - 220) : preferredBottom,
  );

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
              bottom: panelBottom,
              right: panelRight,
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
  }
>(function DockButton(
  { label, children, onClick, disabled, pressed, ariaControls },
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
      style={{ color: "var(--map-ui-text)" }}
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
