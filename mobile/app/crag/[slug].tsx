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
  Alert,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCragBySlug, confirmReport as apiConfirmReport, removeConfirmation } from "@/api/client";
import { API_URL, SUPABASE_URL } from "@/constants/config";

const PHOTO_BASE_URL = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/report-photos/` : "";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getFavorites, saveFavorites } from "@/lib/storage";
import { supabase, isSupabaseConfigured } from "@/api/supabase";
import type { CragDetailResponse, CragData, SectorData, Report } from "@/types/api";
import { FRICTION_RATINGS, RATING_COLORS, CATEGORY_COLORS } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { useTranslation } from "react-i18next";

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
  const router = useRouter();
  const navigation = useNavigation();

  const [crag, setCrag] = useState<CragData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [conditions, setConditions] = useState<any | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [webcams, setWebcams] = useState<Webcam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"conditions" | "forecast">("conditions");
  const { t } = useTranslation("common");
  const [isFavorited, setIsFavorited] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [parentCrag, setParentCrag] = useState<{ name: string; slug: string } | null>(null);
  const [confirmedReportIds, setConfirmedReportIds] = useState<Set<string>>(new Set());
  const { hasProfile, profileId, syncKeyHash, profile } = useUserProfile();

  function openLightbox(photos: string[], index: number) {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setLightboxVisible(true);
  }

  useEffect(() => { if (slug) loadCragData(); }, [slug]);

  // Update header title to crag name, hide back label
  useEffect(() => {
    if (crag) {
      navigation.setOptions({ title: crag.name, headerBackTitle: " " });
    }
  }, [crag, navigation]);

  // Check if this crag is favorited
  useEffect(() => {
    if (crag) {
      const favs = getFavorites() as any[];
      setIsFavorited(favs.some(f => f.cragId === crag.id || f.areaSlug === slug));
    }
  }, [crag, slug]);

  async function toggleFavorite() {
    if (!hasProfile || !crag) {
      Alert.alert(t("mobile.profileRequired", "Profile Required"), t("favorites.loginToFavorite", "Please set up your profile to favorite locations"));
      return;
    }
    if (!isSupabaseConfigured || !supabase || !syncKeyHash) return;

    try {
      const { data: dbProfile } = await supabase
        .from("user_profiles").select("id").eq("sync_key_hash", syncKeyHash).single();
      if (!dbProfile) return;

      if (isFavorited) {
        // Remove
        await supabase.from("user_favorites").delete()
          .eq("user_profile_id", dbProfile.id).eq("crag_id", crag.id);
        const favs = (getFavorites() as any[]).filter(f => f.cragId !== crag.id);
        saveFavorites(favs);
        setIsFavorited(false);
      } else {
        // Add
        const location = [crag.village, crag.municipality, crag.state, crag.country].filter(Boolean).join(", ");
        await supabase.from("user_favorites").insert({
          user_profile_id: dbProfile.id,
          crag_id: crag.id,
          area_name: crag.name,
          area_slug: crag.slug,
          location,
          latitude: crag.lat,
          longitude: crag.lon,
          rock_type: crag.rock_type,
          last_friction_score: conditions?.frictionScore,
          last_rating: conditions?.rating,
          last_checked_at: new Date().toISOString(),
        });
        const favs = getFavorites() as any[];
        favs.push({
          id: crag.id,
          userProfileId: dbProfile.id,
          cragId: crag.id,
          areaName: crag.name,
          areaSlug: crag.slug,
          location,
          latitude: crag.lat,
          longitude: crag.lon,
          rockType: crag.rock_type,
          lastFrictionScore: conditions?.frictionScore,
          lastRating: conditions?.rating,
          lastCheckedAt: new Date().toISOString(),
          displayOrder: 0,
          addedAt: new Date().toISOString(),
        });
        saveFavorites(favs);
        setIsFavorited(true);
      }
    } catch (err) {
      console.warn("Toggle favorite failed:", err);
    }
  }

  async function loadCragData() {
    setIsLoading(true);
    setError(null);
    try {
      const data: CragDetailResponse = await getCragBySlug(slug!);
      setCrag(data.crag);
      setConditions(data.conditions);
      setReports(data.reports);
      setSectors(data.sectors);
      // Fetch parent crag if this is a sector
      if (data.crag.parent_crag_id && isSupabaseConfigured && supabase) {
        supabase.from("crags").select("name, slug").eq("id", data.crag.parent_crag_id).single()
          .then(({ data: parent }) => { if (parent) setParentCrag(parent); })
          .catch(() => {});
      }
      // Fetch user's confirmations for these reports
      if (syncKeyHash && isSupabaseConfigured && supabase && data.reports.length > 0) {
        const reportIds = data.reports.map(r => r.id);
        supabase.from("confirmations").select("report_id")
          .eq("user_key_hash", syncKeyHash)
          .in("report_id", reportIds)
          .then(({ data: confirmations }) => {
            if (confirmations) {
              setConfirmedReportIds(new Set(confirmations.map(c => c.report_id)));
            }
          })
          .catch(() => {});
      }
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
        <Text style={[styles.errorText, { color: colors.text }]}>{error || t("errors.failedToLoadConditions", "Failed to load conditions. Please try again.")}</Text>
      </View>
    );
  }

  const frictionScore = conditions?.frictionScore ?? null;
  const ratingLabelKey = getRatingLabel(frictionScore);
  const ratingLabel = ratingLabelKey ? t(`ratings.${ratingLabelKey.toLowerCase()}`, ratingLabelKey) : null;
  const ratingColors = getRatingColors(ratingLabelKey);
  const reasons: string[] = conditions?.reasons || [];
  const warnings: string[] = conditions?.warnings || [];
  const isDry: boolean | null = conditions?.isDry ?? null;
  const astro = conditions?.astro;
  const dailyForecast: any[] = conditions?.dailyForecast || [];
  const flag = getCountryFlag(crag.country);

  const locationParts = [crag.village, crag.municipality, crag.state].filter(Boolean);
  const locationStr = locationParts.join(", ");

  const PHOTO_BASE_URL = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/report-photos/` : "";
  const reportPhotos = reports.flatMap(r => (r.photos || []).map(p => `${PHOTO_BASE_URL}${p}`));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.cragName, { color: colors.text }]}>
            {flag ? `${flag} ` : ""}{crag.name}
          </Text>
          <Text style={[styles.location, { color: colors.textSecondary }]}>{locationStr}</Text>
          {parentCrag && (
            <TouchableOpacity onPress={() => router.push(`/crag/${parentCrag.slug}`)} style={styles.parentLink}>
              <Ionicons name="arrow-up-outline" size={14} color={colors.primary} />
              <Text style={[styles.parentLinkText, { color: colors.primary }]}>{parentCrag.name}</Text>
            </TouchableOpacity>
          )}
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
                <Text style={[styles.badgeText, { color: isDry ? "#22c55e" : "#ef4444" }]}>{isDry ? t("cragPage.dry") : t("cragPage.wet")}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleFavorite} style={styles.heartButton}>
            <Ionicons
              name={isFavorited ? "heart" : "heart-outline"}
              size={26}
              color={isFavorited ? "#ef4444" : colors.muted}
            />
          </TouchableOpacity>
          {ratingColors && frictionScore && (
            <View style={[styles.ratingCard, { backgroundColor: ratingColors.bg, borderColor: ratingColors.solid, borderWidth: 1 }]}>
              <Text style={[styles.ratingLabel, { color: ratingColors.text }]}>{ratingLabel}</Text>
              <Text style={[styles.ratingScore, { color: ratingColors.text }]}>{fmt(frictionScore)}</Text>
              <Text style={[styles.ratingSubtext, { color: ratingColors.text, opacity: 0.7 }]}>/ 5</Text>
            </View>
          )}
        </View>
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
              {tab === "conditions" ? t("cragPage.currentConditions") : t("cragPage.forecast")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "conditions" && conditions?.current && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.conditionsGrid}>
            <ConditionItem icon="thermometer-outline" label={t("dialog.temperature", "Temperature")} value={`${fmt(conditions.current.temperature_c)}°C`} colors={colors} />
            <ConditionItem icon="water-outline" label={t("dialog.humidity", "Humidity")} value={`${conditions.current.humidity ?? "\u2014"}%`} colors={colors} />
            <ConditionItem icon="flag-outline" label={t("dialog.wind", "Wind")} value={`${fmt(conditions.current.windSpeed_kph)} km/h`} colors={colors} />
            <ConditionItem icon="rainy-outline" label={t("dialog.precipitation", "Precipitation")} value={`${fmt(conditions.current.precipitation_mm)} mm`} colors={colors} />
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
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t("cragPage.bestTimes")}</Text>
          {conditions.optimalWindows.slice(0, 5).map((w: any, i: number) => {
            const wl = getRatingLabel(w.avgFrictionScore);
            const wc = getRatingColors(wl);
            return (
              <View key={i} style={styles.windowRow}>
                <View style={[styles.windowDot, { backgroundColor: wc?.solid || colors.muted }]} />
                <Text style={[styles.windowTime, { color: colors.text }]}>{fmtTimeRange(w.startTime, w.endTime)}</Text>
                {wc && wl && (
                  <View style={[styles.smallBadge, { backgroundColor: wc.bg }]}>
                    <Text style={[styles.smallBadgeText, { color: wc.text }]}>{t(`ratings.${wl!.toLowerCase()}`, wl)} {fmt(w.avgFrictionScore)}</Text>
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
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t("cragPage.photos")} ({reportPhotos.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {reportPhotos.map((url, i) => (
              <TouchableOpacity key={i} onPress={() => openLightbox(reportPhotos, i)} activeOpacity={0.9}>
                <Image source={{ uri: url }} style={styles.photo} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Webcams */}
      {webcams.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t("cragPage.webcams")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {webcams.map((cam) => (
              <TouchableOpacity
                key={cam.webcamId}
                style={styles.webcamItem}
                onPress={() => Linking.openURL(`https://www.windy.com/webcams/${cam.webcamId}`)}
                activeOpacity={0.7}
              >
                {cam.images?.current?.preview && (
                  <Image source={{ uri: cam.images.current.preview }} style={styles.webcamImage} resizeMode="cover" />
                )}
                <Text style={[styles.webcamTitle, { color: colors.textSecondary }]} numberOfLines={2}>{cam.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.poweredBy, { color: colors.muted }]}>{t("webcams.poweredBy", "Powered by")} Windy</Text>
        </View>
      )}

      {/* External links */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t("cragPage.links")}</Text>
        <LinkRow icon="map-outline" label={t("cragPage.viewOnGoogleMaps", "View on Google Maps")} color={colors} onPress={() => Linking.openURL(`https://www.google.com/maps?q=${crag.lat},${crag.lon}&z=15`)} />
        <LinkRow icon="sunny-outline" label={t("cragPage.viewOnSunCalc", "View sun/moon times")} color={colors} onPress={() => {
          const d = new Date().toISOString().split("T")[0].replace(/-/g, ".");
          Linking.openURL(`https://www.suncalc.org/#/${crag.lat},${crag.lon},17/${d}/12:00/1/1`);
        }} />
        <LinkRow icon="navigate-outline" label={t("cragPage.viewOnMap", "View on map")} color={colors} onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${crag.lat}&mlon=${crag.lon}#map=15/${crag.lat}/${crag.lon}`)} />
      </View>

      {/* Sectors */}
      {/* Sectors */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.sectorHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t("cragPage.sectors")} {sectors.length > 0 ? `(${sectors.length})` : ""}
          </Text>
          {hasProfile && !crag.parent_crag_id && (
            <TouchableOpacity
              style={[styles.addSectorButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push({ pathname: "/add-sector", params: { cragId: crag.id, cragName: crag.name, parentRockType: crag.rock_type || "" } })}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color={colors.primaryForeground} />
              <Text style={[styles.addSectorText, { color: colors.primaryForeground }]}>{t("mobile.addSector", "Add Sector")}</Text>
            </TouchableOpacity>
          )}
        </View>
        {sectors.map((s) => (
          <TouchableOpacity key={s.id} style={styles.sectorRow} onPress={() => s.slug && router.push(`/crag/${s.slug}`)} activeOpacity={0.7}>
            <Ionicons name="layers-outline" size={16} color={colors.primary} />
            <Text style={[styles.sectorName, { color: colors.text }]}>{s.name}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </TouchableOpacity>
        ))}
        {sectors.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t("mobile.noSectors", "No sectors yet")}</Text>
        )}
      </View>

      {/* Reports */}
      {reports.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t("cragPage.communityReports")} ({reports.length})</Text>
          {reports.slice(0, 10).map((report) => {
            const cc = CATEGORY_COLORS[report.category] || CATEGORY_COLORS.other;
            return (
              <View key={report.id} style={[styles.reportItem, { borderTopColor: colors.border }]}>
                <View style={styles.reportHeader}>
                  <View style={[styles.smallBadge, { backgroundColor: cc.bg }]}>
                    <Text style={[styles.smallBadgeText, { color: cc.text }]}>{t(`reports.categories.${report.category}`, report.category)}</Text>
                  </View>
                  <Text style={[styles.metaText, { color: colors.muted }]}>{fmtRelative(report.created_at)}</Text>
                </View>
                {report.text && <Text style={[styles.reportText, { color: colors.text }]}>{report.text}</Text>}
                {report.photos?.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.sm }}>
                    {report.photos.map((p, pi) => {
                      const urls = report.photos.map(ph => `${PHOTO_BASE_URL}${ph}`);
                      return (
                        <TouchableOpacity key={pi} onPress={() => openLightbox(urls, pi)} activeOpacity={0.9}>
                          <Image source={{ uri: `${PHOTO_BASE_URL}${p}` }} style={styles.reportPhoto} resizeMode="cover" />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
                <View style={styles.reportActions}>
                  <HelpfulButton
                    report={report}
                    profileId={profileId}
                    hasProfile={hasProfile}
                    syncKeyHash={syncKeyHash}
                    initialConfirmed={confirmedReportIds.has(report.id)}
                    colors={colors}
                    t={t}
                  />
                  {profileId && report.author_id === profileId && (
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        router.push({
                          pathname: "/report",
                          params: {
                            cragId: crag!.id,
                            cragName: crag!.name,
                            reportId: report.id,
                            editCategory: report.category,
                            editText: report.text || "",
                            editRatingDry: report.rating_dry?.toString() || "0",
                            editRatingWind: report.rating_wind?.toString() || "0",
                            editRatingCrowds: report.rating_crowds?.toString() || "0",
                            editPhotos: JSON.stringify(report.photos || []),
                            editLostFoundType: report.lost_found_type || "",
                          },
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                      <Text style={[styles.metaText, { color: colors.primary }]}>{t("common.edit", "Edit")}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>

    {/* Floating action button - Add Report */}
    {crag && (
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          if (!hasProfile) {
            Alert.alert(t("mobile.profileRequired", "Profile Required"), t("reports.loginToConfirm", "Please set up your profile to confirm reports"));
            return;
          }
          router.push({ pathname: "/report", params: { cragId: crag.id, cragName: crag.name } });
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color={colors.primaryForeground} />
        <Text style={[styles.fabText, { color: colors.primaryForeground }]}>{t("fab.addReport", "Add Report")}</Text>
      </TouchableOpacity>
    )}

    <PhotoLightbox
      visible={lightboxVisible}
      photos={lightboxPhotos}
      initialIndex={lightboxIndex}
      onClose={() => setLightboxVisible(false)}
    />
  </View>
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

function HelpfulButton({ report, profileId, hasProfile, syncKeyHash, initialConfirmed, colors, t }: {
  report: Report; profileId: string | null; hasProfile: boolean; syncKeyHash: string | null;
  initialConfirmed: boolean;
  colors: (typeof Colors)["light"]; t: (key: string, fallback?: string) => string;
}) {
  const isOwnReport = profileId != null && report.author_id === profileId;
  const initialCount = (report as any).confirmationCount ?? report.confirmations?.[0]?.count ?? 0;
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [count, setCount] = useState<number>(initialCount);
  const [loading, setLoading] = useState(false);

  // Sync when async confirmation check resolves
  useEffect(() => { setConfirmed(initialConfirmed); }, [initialConfirmed]);

  if (isOwnReport) {
    return (
      <View style={[styles.reportFooter, { marginTop: Spacing.sm }]}>
        <Ionicons name="thumbs-up-outline" size={14} color={colors.muted} />
        <Text style={[styles.metaText, { color: colors.muted }]}>{t("cragPage.helpful")} ({count})</Text>
      </View>
    );
  }

  if (confirmed) {
    return (
      <View style={[styles.reportFooter, { marginTop: Spacing.sm }]}>
        <Ionicons name="thumbs-up" size={14} color="#22c55e" />
        <Text style={[styles.metaText, { color: "#22c55e" }]}>{t("cragPage.helpful")} ({count})</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.reportFooter, { marginTop: Spacing.sm }]}
      disabled={loading}
      onPress={async () => {
        if (!hasProfile || !syncKeyHash) {
          Alert.alert(t("mobile.profileRequired", "Profile Required"), t("reports.loginToConfirm", "Please set up your profile to confirm reports"));
          return;
        }
        setLoading(true);
        try {
          await apiConfirmReport(report.id, syncKeyHash);
          setConfirmed(true);
          setCount(c => c + 1);
        } catch (err) {
          if (err && (err as any).status === 409) {
            setConfirmed(true);
          }
        } finally {
          setLoading(false);
        }
      }}
    >
      <Ionicons name="thumbs-up-outline" size={14} color={colors.primary} />
      <Text style={[styles.metaText, { color: colors.primary }]}>{t("cragPage.helpful")} ({count})</Text>
    </TouchableOpacity>
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
  scrollView: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl + 60 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.md },
  errorText: { fontSize: FontSize.md },
  fab: {
    position: "absolute",
    bottom: Spacing.lg,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: { fontSize: FontSize.sm, fontWeight: "600" },
  poweredBy: { fontSize: FontSize.xs, marginTop: Spacing.xs },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: Spacing.md },
  headerText: { flex: 1, gap: Spacing.xs },
  cragName: { fontSize: FontSize.xl, fontWeight: "700" },
  location: { fontSize: FontSize.sm },
  parentLink: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginTop: 2 },
  parentLinkText: { fontSize: FontSize.sm, fontWeight: "500" },
  badgeRow: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xs, flexWrap: "wrap" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm, borderWidth: 1 },
  badgeText: { fontSize: FontSize.xs, fontWeight: "500" },
  headerActions: { alignItems: "flex-end", gap: Spacing.sm },
  heartButton: { padding: Spacing.xs },
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

  sectorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addSectorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
  },
  addSectorText: { fontSize: FontSize.xs, fontWeight: "600" },
  emptyText: { fontSize: FontSize.sm, fontStyle: "italic" },

  sectorRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.xs },
  sectorName: { flex: 1, fontSize: FontSize.sm, fontWeight: "500" },

  reportItem: { borderTopWidth: 1, paddingTop: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  reportHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reportText: { fontSize: FontSize.sm, lineHeight: 20 },
  reportPhoto: { width: 250, height: 180, borderRadius: BorderRadius.md, marginRight: Spacing.sm },
  reportActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  editButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  reportFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.xs },
});
