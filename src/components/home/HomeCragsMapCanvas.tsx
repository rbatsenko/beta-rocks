"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, AttributionControl, useMap } from "react-leaflet";
import { useTheme } from "next-themes";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import "leaflet/dist/leaflet.css";
import type { ConditionsLabel, MapCrag } from "./home-map-types";

const LABEL_FILL: Record<ConditionsLabel, string> = {
  good: "#22c55e", // green-500
  fair: "#f59e0b", // amber-500
  poor: "#ef4444", // red-500
};
const UNKNOWN_FILL = "#94a3b8"; // slate-400

function fillFor(label: ConditionsLabel | null): string {
  return label ? LABEL_FILL[label] : UNKNOWN_FILL;
}

/** Filter key for a crag: its conditions label, or "unrated" when conditions weren't computed. */
export function labelKey(crag: MapCrag): string {
  return crag.label ?? "unrated";
}

const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const INITIAL_ZOOM = 10;
const MOVE_DEBOUNCE_MS = 700;

interface ViewControllerProps {
  /** User's geolocation, or null. The view flies here when it changes — never on crag updates. */
  userPosition: [number, number] | null;
  /** Called (debounced) after the user pans/zooms, with the new map centre. */
  onMapMove: (lat: number, lon: number) => void;
}

function ViewController({ userPosition, onMapMove }: ViewControllerProps) {
  const map = useMap();

  // When the welcome card occupies the left of the screen, treat the *uncovered* (right) area
  // as the focus: fly there and search crags around its centre, not the geometric viewport centre.
  // Returns the pixel offset from the viewport centre to that focus point (0 when nothing's covered).
  const focusOffset = useCallback((): { x: number; y: number } => {
    if (!userPosition) return { x: 0, y: 0 };
    const size = map.getSize();
    if (size.x < 640) return { x: 0, y: 0 }; // mobile: card is at the top, not the side
    // Card is `max-w-lg` (≈512px) pinned to the navbar container's left edge (px-4 = 16px,
    // container capped at 1400px).
    const containerLeft = Math.max(16, (size.x - 1400) / 2 + 16);
    const cardRight = containerLeft + 512;
    const visibleCenterX = (cardRight + size.x) / 2;
    return { x: Math.round(visibleCenterX - size.x / 2), y: 0 };
  }, [map, userPosition]);

  const lastFlownRef = useRef<string | null>(null);
  useEffect(() => {
    if (!userPosition) return;
    const key = `${userPosition[0].toFixed(4)},${userPosition[1].toFixed(4)}`;
    if (lastFlownRef.current === key) return;
    lastFlownRef.current = key;

    const offset = focusOffset();
    if (offset.x === 0 && offset.y === 0) {
      map.flyTo(userPosition, INITIAL_ZOOM, { duration: 0.7 });
    } else {
      // Centre on a point such that `userPosition` lands at viewportCentre + offset.
      const centerPx = map.project(userPosition, INITIAL_ZOOM).subtract([offset.x, offset.y]);
      map.flyTo(map.unproject(centerPx, INITIAL_ZOOM), INITIAL_ZOOM, { duration: 0.7 });
    }
  }, [map, userPosition, focusOffset]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handleMoveEnd = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const offset = focusOffset();
        const size = map.getSize();
        const focus = map.containerPointToLatLng([size.x / 2 + offset.x, size.y / 2 + offset.y]);
        onMapMove(focus.lat, focus.lng);
      }, MOVE_DEBOUNCE_MS);
    };
    map.on("moveend", handleMoveEnd);
    return () => {
      map.off("moveend", handleMoveEnd);
      if (timer) clearTimeout(timer);
    };
  }, [map, onMapMove, focusOffset]);

  return null;
}

interface HomeCragsMapCanvasProps {
  userPosition: [number, number] | null;
  crags: MapCrag[];
  /** Conditions labels (incl. "unrated") currently shown; markers with other labels are hidden. */
  visibleLabels: ReadonlySet<string>;
  onSelectCrag: (crag: MapCrag) => void;
  onMapMove: (lat: number, lon: number) => void;
}

export default function HomeCragsMapCanvas({
  userPosition,
  crags,
  visibleLabels,
  onSelectCrag,
  onMapMove,
}: HomeCragsMapCanvasProps) {
  const { resolvedTheme } = useTheme();
  const { t } = useClientTranslation("common");
  const isDark = resolvedTheme === "dark";

  const shownCrags = useMemo(
    () => crags.filter((crag) => visibleLabels.has(labelKey(crag))),
    [crags, visibleLabels]
  );

  // `center`/`zoom` on MapContainer are only the *initial* view; ViewController handles updates.
  const initialCenter: [number, number] = userPosition ?? [46, 8];
  const initialZoom = userPosition ? INITIAL_ZOOM : 4;

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      minZoom={2}
      maxZoom={18}
      style={{ height: "100%", width: "100%" }}
      zoomControl
      scrollWheelZoom
      worldCopyJump
      attributionControl={false}
    >
      <AttributionControl position="topright" prefix={false} />
      <TileLayer
        key={isDark ? "dark" : "light"}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={isDark ? DARK_TILES : LIGHT_TILES}
      />

      <ViewController userPosition={userPosition} onMapMove={onMapMove} />

      {userPosition && (
        <CircleMarker
          center={userPosition}
          radius={6}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#3b82f6", fillOpacity: 1 }}
        >
          <Tooltip direction="top">{t("welcome.map.youAreHere")}</Tooltip>
        </CircleMarker>
      )}

      {shownCrags.map((crag) => (
        <CircleMarker
          key={crag.id}
          center={[crag.lat, crag.lon]}
          radius={crag.label ? 8 : 5}
          pathOptions={{
            color: "#ffffff",
            weight: crag.label ? 2 : 1.5,
            fillColor: fillFor(crag.label),
            fillOpacity: crag.label ? 0.95 : 0.65,
          }}
          eventHandlers={{ click: () => onSelectCrag(crag) }}
        >
          <Tooltip direction="top">{crag.name}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
