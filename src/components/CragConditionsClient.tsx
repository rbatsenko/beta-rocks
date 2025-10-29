"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { CragPageContent } from "@/components/CragPageContent";

interface Crag {
  id: string;
  name: string;
  lat: number;
  lon: number;
  rock_type: string | null;
  country: string | null;
  state: string | null;
  municipality: string | null;
  village: string | null;
}

interface CragConditionsClientProps {
  crag: Crag;
}

async function fetchCragConditions(cragId: string, lat: number, lon: number, rockType: string) {
  const res = await fetch(
    `/api/conditions?lat=${lat}&lon=${lon}&cragId=${cragId}&rockType=${rockType || "unknown"}`
  );
  if (!res.ok) {
    throw new Error("Failed to load conditions");
  }
  return res.json();
}

export function CragConditionsClient({ crag }: CragConditionsClientProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["cragConditions", crag.id],
    queryFn: () => fetchCragConditions(crag.id, crag.lat, crag.lon, crag.rock_type || "unknown"),
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
            <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Conditions</h1>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "Failed to load weather data"}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <CragPageContent
      crag={crag}
      conditions={data.conditions}
      reports={data.reports}
      sectors={data.sectors}
    />
  );
}
