"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import { LatLng, Icon } from "leaflet";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { searchLocation, type NominatimResponse } from "@/lib/external-apis/nominatim";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in Next.js
const defaultIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface CragLocationPickerProps {
  position: LatLng | null;
  onPositionChange: (position: LatLng) => void;
  loading?: boolean;
  nearbyCrags?: Array<{
    name: string;
    lat: number;
    lon: number;
    slug: string;
  }>;
}

// Map event handler component
function LocationMarker({
  position,
  onPositionChange,
}: {
  position: LatLng | null;
  onPositionChange: (position: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng);
    },
  });

  return position ? (
    <Marker position={position} icon={defaultIcon} draggable>
      <Popup>
        <div className="text-sm">
          <div className="font-medium">Selected Location</div>
          <div className="text-muted-foreground">
            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </div>
          <div className="text-xs mt-1">Drag to adjust</div>
        </div>
      </Popup>
    </Marker>
  ) : null;
}

// Nearby crags markers
function NearbyCragsMarkers({ crags }: { crags: CragLocationPickerProps["nearbyCrags"] }) {
  if (!crags || crags.length === 0) return null;

  const nearbyIcon = new Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [20, 33],
    iconAnchor: [10, 33],
    popupAnchor: [0, -28],
    shadowSize: [33, 33],
  });

  return (
    <>
      {crags.map((crag, index) => (
        <Marker key={index} position={[crag.lat, crag.lon]} icon={nearbyIcon} opacity={0.6}>
          <Popup>
            <div className="text-sm">
              <div className="font-medium text-red-600">Existing Crag</div>
              <div className="mt-1">{crag.name}</div>
              <a
                href={`/location/${crag.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-1 inline-block"
              >
                View crag →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// Component to fly map to location
function FlyToLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([lat, lng], 13, { duration: 1 });
  }, [lat, lng, map]);

  return null;
}

export function CragLocationPicker({
  position,
  onPositionChange,
  loading,
  nearbyCrags,
}: CragLocationPickerProps) {
  const { t } = useClientTranslation("common");
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResponse[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [flyToCoords, setFlyToCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Fix for SSR - only render map on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchLocation(query);
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleSelectLocation = (result: NominatimResponse) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setFlyToCoords({ lat, lng });
    setShowResults(false);
    setSearchQuery("");
  };

  if (!mounted) {
    return (
      <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <div className="text-muted-foreground">{t("cragLocationPicker.loadingMap")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Location Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t("cragLocationPicker.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          className="pl-9 pr-4"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-[1001] w-full mt-1 bg-background border rounded-lg shadow-lg">
            <Command>
              <CommandList>
                <CommandGroup>
                  {searchResults.map((result) => (
                    <CommandItem
                      key={result.place_id}
                      onSelect={() => handleSelectLocation(result)}
                      className="cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {result.display_name.split(",")[0]}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {result.display_name}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}

        {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
          <div className="absolute z-[1001] w-full mt-1 bg-background border rounded-lg shadow-lg p-3">
            <p className="text-sm text-muted-foreground">
              {t("cragLocationPicker.noLocationsFound")}
            </p>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative w-full h-[400px] rounded-lg overflow-hidden border">
        {loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[1000] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              <div className="text-sm text-muted-foreground">
                {t("cragLocationPicker.loadingLocationData")}
              </div>
            </div>
          </div>
        )}

        <MapContainer
          center={position || [46.8182, 8.2275]} // Default to center of Europe (Switzerland)
          zoom={position ? 15 : 3}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} onPositionChange={onPositionChange} />
          <NearbyCragsMarkers crags={nearbyCrags} />
          {flyToCoords && <FlyToLocation lat={flyToCoords.lat} lng={flyToCoords.lng} />}
        </MapContainer>

        {!position && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border">
            <p className="text-sm text-muted-foreground">{t("cragLocationPicker.clickToSet")}</p>
          </div>
        )}

        {nearbyCrags && nearbyCrags.length > 0 && (
          <div className="absolute top-4 right-4 z-[1000] bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg shadow-lg max-w-[200px]">
            <p className="text-xs font-medium text-yellow-900">
              {t("cragLocationPicker.nearbyCragsFound", { count: nearbyCrags.length })}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              {t("cragLocationPicker.clickMarkersToView")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
