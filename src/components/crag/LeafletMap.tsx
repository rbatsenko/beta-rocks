"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet default icon issue with Next.js
if (typeof window !== "undefined") {
  // @ts-expect-error - Leaflet's typing doesn't include _getIconUrl but it exists at runtime
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  locationName: string;
}

export default function LeafletMap({ latitude, longitude, locationName }: LeafletMapProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={14}
      style={{ height: "300px", width: "100%" }}
      zoomControl={true}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]}>
        <Popup>{locationName}</Popup>
      </Marker>
    </MapContainer>
  );
}
