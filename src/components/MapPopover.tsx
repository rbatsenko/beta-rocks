"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import "leaflet/dist/leaflet.css";

// Dynamically import the map component with no SSR
const DynamicMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[300px] w-full text-sm text-muted-foreground">
      Loading map...
    </div>
  ),
});

interface MapPopoverProps {
  latitude: number;
  longitude: number;
  locationName: string;
}

export function MapPopover({ latitude, longitude, locationName }: MapPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useClientTranslation("common");

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full" title={t("dialog.showMap")}>
          <MapPin className="w-4 h-4" />
          <span className="hidden sm:inline">{t("dialog.showMap")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0" side="bottom" align="end">
        <div className="rounded-md overflow-hidden">
          {isOpen && (
            <DynamicMap latitude={latitude} longitude={longitude} locationName={locationName} />
          )}
        </div>
        <div className="p-2 text-xs text-muted-foreground border-t">
          📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      </PopoverContent>
    </Popover>
  );
}
