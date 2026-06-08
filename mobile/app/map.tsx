/**
 * Map browse screen — ports the web /map experience to mobile.
 * Shows nearby crags as colored markers (by conditions label), refetches as the
 * map moves, lets the user recenter on their location, and opens a quick-view
 * sheet when a marker is tapped.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CragQuickViewSheet } from "@/components/CragQuickViewSheet";
import { useNearbyConditions } from "@/hooks/queries";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { LABEL_COLORS } from "@/constants/config";
import { useTheme } from "@/contexts/ThemeContext";
import type { MapCrag, MapLabelKey } from "@/types/api";

// Default view: roughly centered on the Alps, zoomed out (matches web fallback).
const DEFAULT_REGION: Region = {
  latitude: 46,
  longitude: 8,
  latitudeDelta: 24,
  longitudeDelta: 24,
};

// Snap the query center to a ~4km grid so small pans don't trigger refetches.
const COORD_GRID = 0.04;
const snapCoord = (v: number) => Math.round(v / COORD_GRID) * COORD_GRID;

// Derive a request radius from the visible span, snapped to 10km steps and
// clamped to the API's accepted range.
function radiusFromRegion(region: Region): number {
  const spanMeters = (region.latitudeDelta * 111_000) / 2;
  const snapped = Math.round(spanMeters / 10_000) * 10_000;
  return Math.min(100_000, Math.max(10_000, snapped));
}

const LABEL_DOT: Record<MapLabelKey, string> = {
  good: LABEL_COLORS.good.solid,
  fair: LABEL_COLORS.fair.solid,
  poor: LABEL_COLORS.poor.solid,
  unrated: "#94a3b8",
};

export default function MapScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation("common");
  const mapRef = useRef<MapView>(null);

  // The grid-snapped center + radius that drives the data query.
  const [queryCenter, setQueryCenter] = useState<{
    lat: number;
    lon: number;
    radius: number;
  }>({
    lat: snapCoord(DEFAULT_REGION.latitude),
    lon: snapCoord(DEFAULT_REGION.longitude),
    radius: radiusFromRegion(DEFAULT_REGION),
  });
  const [selected, setSelected] = useState<MapCrag | null>(null);
  const [locating, setLocating] = useState(false);

  const { data, isFetching, isError } = useNearbyConditions(
    queryCenter.lat,
    queryCenter.lon,
    queryCenter.radius
  );

  const crags = useMemo(() => data?.data ?? [], [data]);
  const count = data?.query.count ?? 0;

  const handleRegionChange = useCallback((region: Region) => {
    const nextLat = snapCoord(region.latitude);
    const nextLon = snapCoord(region.longitude);
    const nextRadius = radiusFromRegion(region);
    setQueryCenter((prev) =>
      prev.lat === nextLat && prev.lon === nextLon && prev.radius === nextRadius
        ? prev
        : { lat: nextLat, lon: nextLon, radius: nextRadius }
    );
  }, []);

  const handleLocate = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const region: Region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.6,
        longitudeDelta: 0.6,
      };
      mapRef.current?.animateToRegion(region, 600);
      // Query updates via onRegionChangeComplete once the animation settles.
    } catch {
      // Ignore — user can still browse manually.
    } finally {
      setLocating(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        mapType="standard"
      >
        {crags.map((crag) => {
          const key: MapLabelKey = crag.label ?? "unrated";
          const rated = crag.label !== null;
          return (
            <Marker
              key={crag.id}
              coordinate={{ latitude: crag.lat, longitude: crag.lon }}
              onPress={() => setSelected(crag)}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={[
                  styles.marker,
                  {
                    backgroundColor: LABEL_DOT[key],
                    width: rated ? 18 : 13,
                    height: rated ? 18 : 13,
                    borderRadius: rated ? 9 : 6.5,
                  },
                ]}
              />
            </Marker>
          );
        })}
      </MapView>

      {/* Top pill: count / status */}
      <View style={styles.topBar} pointerEvents="box-none">
        <View style={[styles.statusPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.cardBorder }]}>
          {isFetching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="location" size={16} color={colors.primary} />
          )}
          <Text style={[styles.statusText, { color: colors.text }]}>
            {isError
              ? t("welcome.map.loadCragsError", "Couldn't load nearby crags")
              : isFetching && crags.length === 0
                ? t("welcome.map.loadingCrags", "Loading nearby crags…")
                : t("welcome.map.cragsInView", "{{count}} crags in view", { count })}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: colors.surfaceElevated, borderColor: colors.cardBorder }]}>
        {(["good", "fair", "poor", "unrated"] as MapLabelKey[]).map((key) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: LABEL_DOT[key] }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              {key === "unrated" ? t("welcome.map.unrated", "Unrated") : t(`labels.${key}`)}
            </Text>
          </View>
        ))}
      </View>

      {/* Locate button */}
      <TouchableOpacity
        style={[styles.locateButton, { backgroundColor: colors.primary }]}
        onPress={handleLocate}
        activeOpacity={0.85}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator size="small" color={colors.primaryForeground} />
        ) : (
          <Ionicons name="navigate" size={20} color={colors.primaryForeground} />
        )}
      </TouchableOpacity>

      <CragQuickViewSheet crag={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  marker: {
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  topBar: {
    position: "absolute",
    top: Spacing.md,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  legend: {
    position: "absolute",
    left: Spacing.md,
    bottom: Spacing.xl,
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: FontSize.xs,
  },
  locateButton: {
    position: "absolute",
    right: Spacing.md,
    bottom: Spacing.xl,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
