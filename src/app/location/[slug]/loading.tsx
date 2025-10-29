import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Hero Section Skeleton */}
        <div className="mb-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Title skeleton */}
                <div className="h-10 w-64 sm:w-96 bg-muted rounded mb-2 animate-pulse" />
                {/* Location skeleton */}
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-48 sm:w-64 bg-muted rounded animate-pulse" />
                </div>
              </div>
              {/* Action buttons skeleton */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-9 w-24 bg-muted rounded animate-pulse" />
                <div className="h-9 w-9 bg-muted rounded animate-pulse" />
              </div>
            </div>

            {/* Badges skeleton */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
              <div className="h-6 w-32 bg-muted rounded-full animate-pulse" />
              <div className="h-9 w-20 bg-muted rounded animate-pulse" />
              <div className="h-9 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Map skeleton */}
          <div className="mt-4 h-[200px] bg-muted rounded-lg border animate-pulse" />
        </div>

        {/* Current Conditions Card Skeleton */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-7 w-48 bg-muted rounded animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="h-10 w-24 bg-muted rounded animate-pulse" />
                <div className="h-8 w-12 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Community Reports Section Skeleton */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>

          {/* Filter tabs skeleton */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            <div className="h-8 w-28 bg-muted rounded animate-pulse" />
            <div className="h-8 w-24 bg-muted rounded animate-pulse" />
            <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          </div>

          {/* Report cards skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                      <div>
                        <div className="h-4 w-24 bg-muted rounded mb-1 animate-pulse" />
                        <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                    <div className="h-4 w-4/5 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Detailed Conditions Card Skeleton */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* Tabs skeleton */}
            <div className="flex gap-2 mb-6 border-b pb-2">
              <div className="h-10 w-28 bg-muted rounded animate-pulse" />
              <div className="h-10 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            </div>
            {/* Content skeleton */}
            <div className="space-y-4">
              <div className="h-6 w-48 bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                ))}
              </div>
              <div className="h-48 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Sectors Section Skeleton */}
        <Separator className="my-8" />
        <div>
          <div className="h-8 w-32 bg-muted rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-5 w-32 bg-muted rounded mb-2 animate-pulse" />
                  <div className="h-4 w-full bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer skeleton */}
        <div className="mt-12 pt-8 border-t text-center">
          <div className="h-4 w-64 mx-auto bg-muted rounded mb-2 animate-pulse" />
          <div className="h-4 w-48 mx-auto bg-muted rounded animate-pulse" />
        </div>
      </main>
    </div>
  );
}
