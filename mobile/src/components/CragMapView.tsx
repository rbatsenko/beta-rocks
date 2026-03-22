/**
 * CragMapView - Interactive map with expand-to-fullscreen support
 * Used on the crag details screen to show crag location inline
 */

import { View, Text, StyleSheet, Platform, Modal, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";

interface CragMapViewProps {
  latitude: number;
  longitude: number;
  locationName: string;
}

export function CragMapView({ latitude, longitude, locationName }: CragMapViewProps) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const mapRef = useRef<MapView>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const insets = useSafeAreaInsets();

  const region = {
    latitude,
    longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <>
      <View style={[styles.container, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            toolbarEnabled={false}
            mapType="standard"
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            liteMode={Platform.OS === "android"}
          >
            <Marker
              coordinate={{ latitude, longitude }}
              title={locationName}
              pinColor={colors.primary}
            />
          </MapView>
          <TouchableOpacity
            style={[styles.expandButton, { backgroundColor: colors.card }]}
            onPress={() => setFullscreen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="expand-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={[styles.footer, { borderTopColor: colors.cardBorder }]}>
          <Text style={[styles.coords, { color: colors.muted }]}>
            📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </Text>
        </View>
      </View>

      <Modal
        visible={fullscreen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setFullscreen(false)}
      >
        <View style={styles.fullscreenContainer}>
          <MapView
            style={styles.fullscreenMap}
            initialRegion={region}
            mapType="standard"
            showsUserLocation
            showsCompass
            showsScale
          >
            <Marker
              coordinate={{ latitude, longitude }}
              title={locationName}
              pinColor={colors.primary}
            />
          </MapView>
          <TouchableOpacity
            style={[styles.closeButton, { top: insets.top + Spacing.sm, backgroundColor: colors.card }]}
            onPress={() => setFullscreen(false)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={[styles.fullscreenFooter, { bottom: insets.bottom + Spacing.sm, backgroundColor: colors.card }]}>
            <Text style={[styles.fullscreenLabel, { color: colors.text }]}>{locationName}</Text>
            <Text style={[styles.coords, { color: colors.muted }]}>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Platform.select({
      ios: { overflow: "hidden" as const },
      android: {},
    }),
  },
  mapWrapper: {
    position: "relative",
    ...Platform.select({
      android: {
        borderTopLeftRadius: BorderRadius.lg,
        borderTopRightRadius: BorderRadius.lg,
        overflow: "hidden" as const,
      },
    }),
  },
  map: {
    height: 200,
    width: "100%",
  },
  expandButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  footer: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  coords: {
    fontSize: FontSize.xs,
    ...Platform.select({
      ios: { fontFamily: "Menlo" },
      android: { fontFamily: "monospace" },
    }),
  },
  fullscreenContainer: {
    flex: 1,
  },
  fullscreenMap: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fullscreenFooter: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fullscreenLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
    marginBottom: 2,
  },
});
