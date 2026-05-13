import type { Metadata } from "next";
import { MapPageClient } from "@/components/home/MapPageClient";

export const metadata: Metadata = {
  title: "Map - beta.rocks",
  description: "Browse climbing crags worldwide on an interactive map with live conditions.",
};

export default function MapPage() {
  return <MapPageClient />;
}
