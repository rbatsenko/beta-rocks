/**
 * CragMapView - Static map displaying a crag's location with a pin marker
 * Used on the crag details screen to show crag location inline
 */

import { View, Text, StyleSheet, Platform } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRef } from "react";
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

  return (
    <View style={[styles.container, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        toolbarEnabled={false}
        mapType="standard"
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title={locationName}
          pinColor={colors.primary}
        />
      </MapView>
      <View style={[styles.footer, { borderTopColor: colors.cardBorder }]}>
        <Text style={[styles.coords, { color: colors.muted }]}>
          📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  map: {
    height: 200,
    width: "100%",
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
});
