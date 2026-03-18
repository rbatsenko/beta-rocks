/**
 * CragLocationPicker - Interactive map for selecting crag location
 * React Native equivalent of the web's CragLocationPicker (Leaflet-based)
 *
 * Features:
 * - Tap-to-select location on map
 * - Location search via Nominatim (OpenStreetMap)
 * - "Use my location" button via expo-location
 * - Nearby crags displayed as markers
 * - Coordinates display
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
} from "react-native";
import MapView, { Marker, Region, MapPressEvent } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

interface Coords {
  latitude: number;
  longitude: number;
}

interface NearbyCrag {
  id: string;
  name: string;
  lat: number;
  lon: number;
  slug: string;
  distance?: number;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

interface CragLocationPickerProps {
  position: Coords | null;
  onPositionChange: (coords: Coords) => void;
  loading?: boolean;
  nearbyCrags?: NearbyCrag[];
  isSecret?: boolean;
}

// Default to center of Europe (Switzerland)
const DEFAULT_REGION: Region = {
  latitude: 46.8182,
  longitude: 8.2275,
  latitudeDelta: 40,
  longitudeDelta: 40,
};

export function CragLocationPicker({
  position,
  onPositionChange,
  loading,
  nearbyCrags,
  isSecret,
}: CragLocationPickerProps) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation("common");
  const mapRef = useRef<MapView>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [locating, setLocating] = useState(false);

  // Debounced Nominatim search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery.trim())}&format=jsonv2&limit=5`;
        const response = await fetch(url, {
          headers: { "User-Agent": "beta-rocks-mobile/1.0" },
        });
        if (response.ok) {
          const data: NominatimResult[] = await response.json();
          setSearchResults(data);
          setShowResults(data.length > 0);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fly to position when it changes
  useEffect(() => {
    if (position && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: position.latitude,
          longitude: position.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500
      );
    }
  }, [position?.latitude, position?.longitude]);

  const handleMapPress = useCallback(
    (e: MapPressEvent) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      onPositionChange({ latitude, longitude });
    },
    [onPositionChange]
  );

  const handleSelectSearchResult = useCallback(
    (result: NominatimResult) => {
      const latitude = parseFloat(result.lat);
      const longitude = parseFloat(result.lon);
      onPositionChange({ latitude, longitude });
      setShowResults(false);
      setSearchQuery("");
      Keyboard.dismiss();
    },
    [onPositionChange]
  );

  const handleUseMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      onPositionChange({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch {
      // Location unavailable, silently fail
    } finally {
      setLocating(false);
    }
  }, [onPositionChange]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("cragLocationPicker.searchPlaceholder", "Search for a location...")}
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
          {searching && <ActivityIndicator size="small" color={colors.muted} style={styles.searchSpinner} />}
        </View>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <View style={[styles.resultsDropdown, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.place_id.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.resultItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectSearchResult(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
                    {item.display_name.split(",")[0]}
                  </Text>
                  <Text style={[styles.resultDetail, { color: colors.muted }]} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Map */}
      <View style={[styles.mapContainer, { borderColor: colors.border }]}>
        {loading && (
          <View style={styles.mapOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.mapOverlayText, { color: colors.muted }]}>
              {t("cragLocationPicker.loadingLocationData", "Loading location data...")}
            </Text>
          </View>
        )}

        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={position ? {
            latitude: position.latitude,
            longitude: position.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          } : DEFAULT_REGION}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton={false}
          mapType="standard"
        >
          {/* Selected position marker */}
          {position && (
            <Marker
              coordinate={position}
              draggable
              onDragEnd={(e) => onPositionChange(e.nativeEvent.coordinate)}
              pinColor={colors.primary}
            />
          )}

          {/* Nearby crags markers */}
          {nearbyCrags?.map((crag) => (
            <Marker
              key={crag.id}
              coordinate={{ latitude: crag.lat, longitude: crag.lon }}
              pinColor="#facc15"
              opacity={0.7}
              title={crag.name}
              description={crag.distance ? `${crag.distance}m away` : undefined}
            />
          ))}
        </MapView>

        {/* Use My Location button */}
        <TouchableOpacity
          style={[styles.myLocationButton, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          onPress={handleUseMyLocation}
          activeOpacity={0.7}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="locate" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>

        {/* Tap hint when no position selected */}
        {!position && (
          <View style={[styles.mapHint, { backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.95)" }]}>
            <Text style={[styles.mapHintText, { color: colors.muted }]}>
              {isSecret
                ? t("addCragModal.secretCrag.mapHelp", "Tap to select a nearby reference city")
                : t("cragLocationPicker.clickToSet", "Tap the map to set the crag location")}
            </Text>
          </View>
        )}

        {/* Nearby crags badge */}
        {nearbyCrags && nearbyCrags.length > 0 && (
          <View style={[styles.nearbyCragsBadge, { backgroundColor: isDark ? "rgba(113,63,18,0.9)" : "rgba(254,252,232,0.95)" }]}>
            <Text style={[styles.nearbyCragsBadgeText, { color: isDark ? "#fef9c3" : "#713f12" }]}>
              {t("cragLocationPicker.nearbyCragsFound", "{{count}} crag(s) nearby", { count: nearbyCrags.length })}
            </Text>
          </View>
        )}
      </View>

      {/* Coordinates display */}
      {position && (
        <Text style={[styles.coordsText, { color: colors.muted }]}>
          {t("addCragModal.coordinates", "Coordinates")}: {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },

  // Search
  searchContainer: { zIndex: 10 },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    height: 44,
    paddingHorizontal: Spacing.sm,
  },
  searchIcon: { marginRight: Spacing.xs },
  searchInput: { flex: 1, fontSize: FontSize.md, height: "100%" },
  searchSpinner: { marginLeft: Spacing.xs },

  resultsDropdown: {
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    maxHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  resultItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultName: { fontSize: FontSize.sm, fontWeight: "500" },
  resultDetail: { fontSize: FontSize.xs, marginTop: 2 },

  // Map
  mapContainer: {
    height: 300,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
  },
  map: { flex: 1 },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  mapOverlayText: { fontSize: FontSize.sm },

  myLocationButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },

  mapHint: {
    position: "absolute",
    bottom: Spacing.md,
    alignSelf: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  mapHintText: { fontSize: FontSize.sm },

  nearbyCragsBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  nearbyCragsBadgeText: { fontSize: FontSize.xs, fontWeight: "600" },

  coordsText: { fontSize: FontSize.xs },
});
