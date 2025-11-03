"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mountain, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { getCountryFlag } from "@/lib/utils/country-flags";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  location: string;
  country: string;
  rockType: string | null;
  climbingTypes: string[] | null;
  latitude: number;
  longitude: number;
  reportCount: number;
  matchScore: number;
  matchType: string;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Search dialog with autocomplete for crags
 * - Desktop: Modal with ⌘K support
 * - Mobile: Full-screen dialog
 * - Real-time fuzzy search with abbreviation handling
 */
export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useClientTranslation();

  // Debounced search
  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("[SearchDialog] Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce the search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const handleSelect = (slug: string) => {
    onOpenChange(false);
    router.push(`/location/${slug}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-h-[80vh] sm:max-h-[600px] sm:max-w-2xl flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("search.title")}</DialogTitle>
          <DialogDescription>{t("search.description")}</DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border-none flex-1 flex flex-col" shouldFilter={false}>
          <CommandInput
            placeholder={t("search.placeholder")}
            value={query}
            onValueChange={setQuery}
          />
          {loading && (
            <div className="absolute right-3 top-3">
              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
            </div>
          )}
          <CommandList className="max-h-[calc(80vh-8rem)] sm:max-h-[450px] flex-1">
            {!query && (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                {t("search.typeToSearch")}
              </CommandEmpty>
            )}
            {loading && (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                <p className="text-sm text-muted-foreground">{t("search.searching")}</p>
              </div>
            )}
            {query && results.length === 0 && !loading && (
              <CommandEmpty className="py-6 text-center text-sm">
                {t("search.noCragsFound")}
              </CommandEmpty>
            )}
            {results.length > 0 && !loading && (
              <CommandGroup heading={t("search.heading")}>
                {results.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => handleSelect(result.slug)}
                    className="cursor-pointer"
                  >
                    <Mountain className="mr-2 h-4 w-4 text-orange-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{result.name}</span>
                        {result.rockType && (
                          <Badge
                            variant="outline"
                            className="text-xs shrink-0 border-orange-500/30 text-orange-700 dark:text-orange-400"
                          >
                            {t(`rockTypes.${result.rockType.toLowerCase()}`)}
                          </Badge>
                        )}
                        {result.reportCount > 0 && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {result.reportCount} 💬
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                        <span>{result.location}</span>
                        {getCountryFlag(result.country) && (
                          <span className="text-sm">{getCountryFlag(result.country)}</span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
        <div className="border-t px-4 py-2 text-xs text-muted-foreground hidden sm:block">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">↵</span>
          </kbd>{" "}
          {t("search.toSelect")}{" "}
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">esc</span>
          </kbd>{" "}
          {t("search.toClose")}
        </div>
      </DialogContent>
    </Dialog>
  );
}
