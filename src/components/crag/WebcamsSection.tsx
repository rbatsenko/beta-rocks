"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Video, MapPin, ExternalLink, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import type { Webcam } from "@/lib/external-apis/windy-webcams";

interface WebcamWithDistance extends Webcam {
  distanceKm: number;
}

interface WebcamsResponse {
  location: { lat: number; lon: number };
  total: number;
  webcams: WebcamWithDistance[];
  updatedAt: string;
}

interface WebcamsSectionProps {
  latitude: number;
  longitude: number;
}

async function fetchWebcams(lat: number, lon: number): Promise<WebcamsResponse> {
  const response = await fetch(`/api/webcams?lat=${lat}&lon=${lon}&radius=50&limit=6`);
  if (!response.ok) {
    throw new Error("Failed to fetch webcams");
  }
  return response.json();
}

function WebcamCard({ webcam }: { webcam: WebcamWithDistance }) {
  const { t } = useClientTranslation("common");
  const [showPlayer, setShowPlayer] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Use daylight image if available, fall back to current
  const imageUrl = webcam.images.daylight?.preview || webcam.images.current.preview;

  // Get the best available player embed URL
  const getPlayerUrl = () => {
    if (webcam.player.live?.available) return webcam.player.live.embed;
    if (webcam.player.day?.available) return webcam.player.day.embed;
    return null;
  };

  const playerUrl = getPlayerUrl();

  return (
    <Card className="overflow-hidden group">
      <div className="relative aspect-video bg-muted">
        {showPlayer && playerUrl ? (
          <iframe
            src={playerUrl}
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
            title={webcam.title}
          />
        ) : (
          <>
            {!imageError ? (
              <img
                src={imageUrl}
                alt={webcam.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}
            {playerUrl && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setShowPlayer(true)}
              >
                <Video className="h-4 w-4 mr-1" />
                {t("webcams.playTimelapse")}
              </Button>
            )}
          </>
        )}
        {showPlayer && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => setShowPlayer(false)}
          >
            {t("webcams.showImage")}
          </Button>
        )}
      </div>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm truncate" title={webcam.title}>
              {webcam.title}
            </h4>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {webcam.location.city || webcam.location.region}, {webcam.location.country}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {webcam.distanceKm.toFixed(1)} km
            </Badge>
            <a
              href={webcam.urls.detail}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={t("webcams.openOnWindy")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function WebcamsSection({ latitude, longitude }: WebcamsSectionProps) {
  const { t } = useClientTranslation("common");
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    data: webcamsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["webcams", latitude, longitude],
    queryFn: () => fetchWebcams(latitude, longitude),
    staleTime: 3 * 60 * 1000, // 3 minutes (Windy tokens expire after 10 min)
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  // Don't render anything if no webcams found
  if (!isLoading && (!webcamsData?.webcams?.length || error)) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5" />
            {t("webcams.title")}
          </CardTitle>
          <div className="flex items-center gap-2">
            {webcamsData && (
              <span className="text-sm text-muted-foreground">
                {t("webcams.nearbyCount", { count: webcamsData.webcams.length })}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : webcamsData?.webcams?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {webcamsData.webcams.map((webcam) => (
                <WebcamCard key={webcam.id} webcam={webcam} />
              ))}
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground mt-4 text-center">
            {t("webcams.poweredBy")}{" "}
            <a
              href="https://www.windy.com/webcams"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              Windy.com
            </a>
          </p>
        </CardContent>
      )}
    </Card>
  );
}
