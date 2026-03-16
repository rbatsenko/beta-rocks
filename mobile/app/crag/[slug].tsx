/**
 * Crag detail screen - full-featured, matching web's CragPageContent
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Image,
  FlatList,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCragBySlug } from "@/api/client";
import { API_URL } from "@/constants/config";
import type { CragDetailResponse, CragData, SectorData, Report } from "@/types/api";
import { FRICTION_RATINGS, RATING_COLORS, CATEGORY_COLORS } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";

function fmt(val: number | undefined | null, decimals = 1): string {
  return val != null ? val.toFixed(decimals) : "\u2014";
}

function getRatingLabel(score: number | null | undefined): string | null {
  if (score == null) return null;
  const key = Math.round(score) as keyof typeof FRICTION_RATINGS;
  return FRICTION_RATINGS[key]?.label ?? null;
}

function getRatingColors(label: string | null) {
  if (!label) return null;
  return RATING_COLORS[label as keyof typeof RATING_COLORS] ?? null;
}

function getCountryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  const OFFSET = 0x1f1e6 - 0x41;
  return String.fromCodePoint(upper.charCodeAt(0) + OFFSET, upper.charCodeAt(1) + OFFSET);
}

function extractTime(iso: string): string {
  const m = iso.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : iso;
}

function fmtTimeRange(start: string, end: string): string {
  try {
    const pad = (d: Date) => `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    return `${pad(new Date(start))} \u2013 ${pad(new Date(end))}`;
  } catch { return `${start} \u2013 ${end}`; }
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtRelative(s: string): string {
  const ms = Date.now() - new Date(s).getTime();
  const m = Math.floor(ms / 60000), h = Math.floor(ms / 3600000), d = Math.floor(ms / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return fmtDate(s);
}

interface Webcam {
  title: string;
  webcamId: number;
  status: string;
  images?: { current?: { preview?: string; thumbnail?: string } };
}

export default function CragDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const [crag, setCrag] = useState<CragData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [conditions, setConditions] = useState<any | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [webcams, setWebcams] = useState<Webcam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"conditions" | "forecast">("conditions");

  useEffect(() => { if (slug) loadCragData(); }, [slug]);

  async function loadCragData() {
    setIsLoading(true);
    setError(null);
    try {
      const data: CragDetailResponse = await getCragBySlug(slug!);
      setCrag(data.crag);
      setConditions(data.conditions);
      setReports(data.reports);
      setSectors(data.sectors);
      // Fetch webcams in parallel
      if (data.crag.lat && data.crag.lon) {
        fetch(`${API_URL}/api/webcams?lat=${data.crag.lat}&lon=${data.crag.lon}`)
          .then(r => r.json())
          .then(d => setWebcams(d.webcams?.slice(0, 4) || []))
          .catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load crag");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !crag) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.text }]}>{error || "Crag not found"}</Text>
      </View>
    );
  }

  const frictionScore = conditions?.frictionScore ?? null;
  const ratingLabel = getRatingLabel(frictionScore);
  const ratingColors = getRatingColors(ratingLabel);
  const reasons: string[] = conditions?.reasons || [];
  const warnings: string[] = conditions?.warnings || [];
  const isDry: boolean | null = conditions?.isDry ?? null;
  const astro = conditions?.astro;
  const dailyForecast: any[] = conditions?.dailyForecast || [];
  const flag = getCountryFlag(crag.country);

  const locationParts = [crag.village, crag.municipality, crag.state].filter(Boolean);
  const locationStr = locationParts.join(", ");

  const reportPhotos = reports.filter(r => r.photo_url).map(r => r.photo_url!);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.cragName, { color: colors.text }]}>
            {flag ? `${flag} ` : ""}{crag.name}
          </Text>
          <Text style={[styles.location, { color: colors.textSecondary }]}>{locationStr}</Text>
          <View style={styles.badgeRow}>
            {crag.rock_type && crag.rock_type !== "unknown" && (
              <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {crag.rock_type.charAt(0).toUpperCase() + crag.rock_type.slice(1)}
                </Text>
              </View>
            )}
            {isDry !== null && (
              <View style={[styles.badge, {
                backgroundColor: isDry ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                borderColor: isDry ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)",
              }]}>
                <Ionicons name={isDry ? "checkmark-circle" : "water"} size={12} color={isDry ? "#22c55e" : "#ef4444"} />
                <Text style={[styles.badgeText, { color: isDry ? "#22c55e" : "#ef4444" }]}>{isDry ? "Dry" : "Wet"}</Text>
              </View>
            )}
          </View>
        </View>
        {ratingColors && frictionScore && (
          <View style={[styles.ratingCard, { backgroundColor: ratingColors.bg, borderColor: ratingColors.solid, borderWidth: 1 }]}>
            <Text style={[styles.ratingLabel, { color: ratingColors.text }]}>{ratingLabel}</Text>
            <Text style={[styles.ratingScore, { color: ratingColors.text }]}>{fmt(frictionScore)}</Text>
            <Text style={[styles.ratingSubtext, { color: ratingColors.text, opacity: 0.7 }]}>/ 5</Text>
          </View>
        )}
      </View>

      {/* Reasons */}
      {reasons.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {reasons.map((r, i) => (
            <View key={i} style={styles.infoRow}>
              <Ionicons name="checkmark" size={16} color="#22c55e" />
              <Text style={[styles.infoText, { color: colors.text }]}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <View style={[styles.card, { backgroundColor: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }]}>
          {warnings.map((w, i) => (
            <View key={i} style={styles.infoRow}>
              <Ionicons name="warning" size={16} color="#ef4444" />
              <Text style={[styles.infoText, { color: colors.text }]}>{w}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Weather tabs */}
      <View style={[styles.tabRow, { borderColor: colors.border }]}>
        {(["conditions", "forecast"] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.muted }]}>
              {tab === "conditions" ? "Current" : "Forecast"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "conditions" && conditions?.current && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.conditionsGrid}>
            <ConditionItem icon="thermometer-outline" label="Temp" value={`${fmt(conditions.current.temperature_c)}°C`} colors={colors} />
            <ConditionItem icon="water-outline" label="Humidity" value={`${conditions.current.humidity ?? "\u2014"}%`} colors={colors} />
            <ConditionItem icon="flag-outline" label="Wind" value={`${fmt(conditions.current.windSpeed_kph)} km/h`} colors={colors} />
            <ConditionItem icon="rainy-outline" label="Precip" value={`${fmt(conditions.current.precipitation_mm)} mm`} colors={colors} />
          </View>
          {astro && (
            <View style={[styles.astroRow, { borderTopColor: colors.border }]}>
              <View style={styles.astroItem}>
                <Ionicons name="sunny-outline" size={16} color="#f97316" />
                <Text style={[styles.astroText, { color: colors.textSecondary }]}>{extractTime(astro.sunrise)}</Text>
              </View>
              <View style={styles.astroItem}>
                <Ionicons name="moon-outline" size={16} color="#6366f1" />
                <Text style={[styles.astroText, { color: colors.textSecondary }]}>{extractTime(astro.sunset)}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {activeTab === "forecast" && dailyForecast.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {dailyForecast.slice(0, 7).map((day: any, i: number) => (
            <View key={i} style={[styles.forecastRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={[styles.forecastDay, { color: colors.text }]}>
                {new Date(day.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </Text>
              <View style={styles.forecastDetails}>
                <Text style={[styles.forecastTemp, { color: colors.text }]}>
                  {Math.round(day.tempMin)}° / {Math.round(day.tempMax)}°
                </Text>
                <Ionicons name="rainy-outline" size={12} color={colors.muted} />
                <Text style={[styles.forecastPrecip, { color: colors.muted }]}>{fmt(day.precipitation, 0)}mm</Text>
                <Ionicons name="flag-outline" size={12} color={colors.muted} />
                <Text style={[styles.forecastWind, { color: colors.muted }]}>{Math.round(day.windSpeedMax)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Optimal windows */}
      {conditions?.optimalWindows?.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Best Times to Climb</Text>
          {conditions.optimalWindows.slice(0, 5).map((w: any, i: number) => {
            const wl = getRatingLabel(w.avgFrictionScore);
            const wc = getRatingColors(wl);
            return (
              <View key={i} style={styles.windowRow}>
                <View style={[styles.windowDot, { backgroundColor: wc?.solid || colors.muted }]} />
                <Text style={[styles.windowTime, { color: colors.text }]}>{fmtTimeRange(w.startTime, w.endTime)}</Text>
                {wc && wl && (
                  <View style={[styles.smallBadge, { backgroundColor: wc.bg }]}>
                    <Text style={[styles.smallBadgeText, { color: wc.text }]}>{wl} {fmt(w.avgFrictionScore)}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Report photos */}
      {reportPhotos.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Photos ({reportPhotos.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {reportPhotos.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.photo} resizeMode="cover" />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Webcams */}
      {webcams.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Nearby Webcams</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {webcams.map((cam) => (
              <View key={cam.webcamId} style={styles.webcamItem}>
                {cam.images?.current?.preview && (
                  <Image source={{ uri: cam.images.current.preview }} style={styles.webcamImage} resizeMode="cover" />
                )}
                <Text style={[styles.webcamTitle, { color: colors.textSecondary }]} numberOfLines={2}>{cam.title}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* External links */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Links</Text>
        <LinkRow icon="map-outline" label="Google Maps" color={colors} onPress={() => Linking.openURL(`https://www.google.com/maps?q=${crag.lat},${crag.lon}&z=15`)} />
        <LinkRow icon="sunny-outline" label="SunCalc" color={colors} onPress={() => {
          const d = new Date().toISOString().split("T")[0].replace(/-/g, ".");
          Linking.openURL(`https://www.suncalc.org/#/${crag.lat},${crag.lon},17/${d}/12:00/1/1`);
        }} />
        <LinkRow icon="navigate-outline" label="OpenStreetMap" color={colors} onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${crag.lat}&mlon=${crag.lon}#map=15/${crag.lat}/${crag.lon}`)} />
      </View>

      {/* Sectors */}
      {sectors.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Sectors ({sectors.length})</Text>
          {sectors.map((s) => (
            <View key={s.id} style={styles.sectorRow}>
              <Ionicons name="layers-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectorName, { color: colors.text }]}>{s.name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Reports */}
      {reports.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Community Reports ({reports.length})</Text>
          {reports.slice(0, 10).map((report) => {
            const cc = CATEGORY_COLORS[report.category] || CATEGORY_COLORS.other;
            return (
              <View key={report.id} style={[styles.reportItem, { borderTopColor: colors.border }]}>
                <View style={styles.reportHeader}>
                  <View style={[styles.smallBadge, { backgroundColor: cc.bg }]}>
                    <Text style={[styles.smallBadgeText, { color: cc.text }]}>{report.category}</Text>
                  </View>
                  <Text style={[styles.metaText, { color: colors.muted }]}>{fmtRelative(report.created_at)}</Text>
                </View>
                {report.text && <Text style={[styles.reportText, { color: colors.text }]}>{report.text}</Text>}
                {report.photo_url && (
                  <Image source={{ uri: report.photo_url }} style={styles.reportPhoto} resizeMode="cover" />
                )}
                <View style={styles.reportFooter}>
                  <Ionicons name="thumbs-up-outline" size={14} color={colors.muted} />
                  <Text style={[styles.metaText, { color: colors.muted }]}>{report.confirmations?.[0]?.count ?? 0}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function ConditionItem({ icon, label, value, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; colors: (typeof Colors)["light"] }) {
  return (
    <View style={styles.conditionItem}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.conditionLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.conditionValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function LinkRow({ icon, label, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: (typeof Colors)["light"]; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={18} color={color.primary} />
      <Text style={[styles.linkText, { color: color.primary }]}>{label}</Text>
      <Ionicons name="open-outline" size={14} color={color.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.md },
  errorText: { fontSize: FontSize.md },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: Spacing.md },
  headerText: { flex: 1, gap: Spacing.xs },
  cragName: { fontSize: FontSize.xl, fontWeight: "700" },
  location: { fontSize: FontSize.sm },
  badgeRow: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xs, flexWrap: "wrap" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm, borderWidth: 1 },
  badgeText: { fontSize: FontSize.xs, fontWeight: "500" },
  ratingCard: { alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, minWidth: 70 },
  ratingLabel: { fontSize: FontSize.sm, fontWeight: "700" },
  ratingScore: { fontSize: FontSize.xl, fontWeight: "800" },
  ratingSubtext: { fontSize: FontSize.xs },

  card: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  cardTitle: { fontSize: FontSize.lg, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  infoText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },

  // Tabs
  tabRow: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: Spacing.sm + 2 },
  tabText: { fontSize: FontSize.md, fontWeight: "600" },

  conditionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  conditionItem: { width: "45%", gap: 2 },
  conditionLabel: { fontSize: FontSize.xs },
  conditionValue: { fontSize: FontSize.md, fontWeight: "600" },
  astroRow: { flexDirection: "row", gap: Spacing.xl, borderTopWidth: 1, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  astroItem: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  astroText: { fontSize: FontSize.sm },

  // Forecast
  forecastRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: Spacing.sm },
  forecastDay: { fontSize: FontSize.sm, fontWeight: "500", flex: 1 },
  forecastDetails: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  forecastTemp: { fontSize: FontSize.sm, fontWeight: "600", minWidth: 65 },
  forecastPrecip: { fontSize: FontSize.xs, minWidth: 30 },
  forecastWind: { fontSize: FontSize.xs },

  windowRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.xs },
  windowDot: { width: 8, height: 8, borderRadius: 4 },
  windowTime: { fontSize: FontSize.sm, fontWeight: "500", flex: 1 },
  smallBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm },
  smallBadgeText: { fontSize: FontSize.xs, fontWeight: "600", textTransform: "capitalize" },

  // Photos & webcams
  photoScroll: { marginHorizontal: -Spacing.xs },
  photo: { width: 200, height: 150, borderRadius: BorderRadius.md, marginRight: Spacing.sm },
  webcamItem: { width: 200, marginRight: Spacing.sm, gap: Spacing.xs },
  webcamImage: { width: 200, height: 120, borderRadius: BorderRadius.md },
  webcamTitle: { fontSize: FontSize.xs },

  // Links
  linkRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.xs },
  linkText: { flex: 1, fontSize: FontSize.sm, fontWeight: "500" },

  sectorRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.xs },
  sectorName: { flex: 1, fontSize: FontSize.sm, fontWeight: "500" },

  reportItem: { borderTopWidth: 1, paddingTop: Spacing.sm, gap: Spacing.xs },
  reportHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reportText: { fontSize: FontSize.sm, lineHeight: 20 },
  reportPhoto: { width: "100%", height: 200, borderRadius: BorderRadius.md, marginTop: Spacing.xs },
  reportFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs },
});
