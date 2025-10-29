"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CragPageContent } from "@/components/CragPageContent";
import { Loader2 } from "lucide-react";

async function fetchLocationData(slug: string) {
  const res = await fetch(`/api/location/${slug}`);
  if (!res.ok) {
    throw new Error("Failed to load location data");
  }
  return res.json();
}

export default function LocationPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["location", slug],
    queryFn: () => fetchLocationData(slug),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4 bg-card p-8 rounded-lg shadow-xl border-2 border-orange-500/20">
            <Loader2 className="h-16 w-16 text-orange-500 animate-spin" />
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">Loading conditions...</p>
              <p className="text-sm text-muted-foreground mt-1">Fetching weather data...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Location</h1>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "Failed to load location data"}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <CragPageContent
      crag={data.crag}
      conditions={data.conditions}
      reports={data.reports}
      sectors={data.sectors}
    />
  );
}
