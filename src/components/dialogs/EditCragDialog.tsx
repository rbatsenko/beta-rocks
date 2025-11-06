"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Search, Mountain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useToast } from "@/hooks/use-toast";
import { getUserProfile, type UserProfile } from "@/lib/auth/sync-key";
import { ProfileCreationModal } from "@/components/profile/ProfileCreationModal";

interface EditCragDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crag: {
    id: string;
    name: string;
    slug: string | null;
    parent_crag_id?: string | null;
    parent_crag_name?: string | null;
  };
  currentlyIsSector: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  location: string;
  country: string;
}

export function EditCragDialog({
  open,
  onOpenChange,
  crag,
  currentlyIsSector,
}: EditCragDialogProps) {
  const { t } = useClientTranslation("common");
  const { toast } = useToast();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedParentCrag, setSelectedParentCrag] = useState<SearchResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<"make-sector" | "make-crag" | "change-parent">(
    currentlyIsSector ? "change-parent" : "make-sector"
  );
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Reset on dialog open/close
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedParentCrag(null);
      setAction(currentlyIsSector ? "change-parent" : "make-sector");
    }
  }, [open, currentlyIsSector]);

  // Debounced search for parent crags
  useEffect(() => {
    if (action === "make-crag") return; // Don't search if converting to crag

    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, action]);

  const performSearch = async (query: string) => {
    setSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      // Filter out the current crag and only show crags (not sectors)
      const filtered = (data.results || []).filter(
        (result: any) => result.id !== crag.id && result.resultType !== "sector"
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleProfileCreated = (_profile: UserProfile) => {
    setShowProfileModal(false);
    // After profile creation, retry the submission
    handleSubmitWithProfile();
  };

  const handleSubmit = async () => {
    // Check for profile first
    const profile = getUserProfile();
    if (!profile) {
      setShowProfileModal(true);
      return;
    }

    await handleSubmitWithProfile();
  };

  const handleSubmitWithProfile = async () => {
    if (action !== "make-crag" && !selectedParentCrag) {
      toast({
        title: t("editCragDialog.errors.parentRequired"),
        description: t("editCragDialog.errors.parentRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/crags/${crag.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          parentCragId: action !== "make-crag" ? selectedParentCrag?.id : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update crag");
      }

      // Success!
      toast({
        title: t("editCragDialog.success"),
        description: t(
          `editCragDialog.${action === "make-crag" ? "convertedToCrag" : "convertedToSector"}`
        ),
      });

      onOpenChange(false);

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error("Crag update failed:", error);
      toast({
        title: t("editCragDialog.errors.failed"),
        description: error instanceof Error ? error.message : t("editCragDialog.errors.failedDesc"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = action === "make-crag" || selectedParentCrag !== null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-orange-500" />
              {t("editCragDialog.title")}
            </DialogTitle>
            <DialogDescription>{t("editCragDialog.subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            {/* Current Status */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">{t("editCragDialog.currentStatus")}</p>
              <div className="flex items-center gap-2">
                <Mountain className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{crag.name}</span>
                <Badge variant="outline">
                  {currentlyIsSector ? t("editCragDialog.sector") : t("editCragDialog.crag")}
                </Badge>
              </div>
              {currentlyIsSector && crag.parent_crag_name && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t("editCragDialog.currentParent")}: {crag.parent_crag_name}
                </p>
              )}
            </div>

            {/* Action Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                {t("editCragDialog.chooseAction")}
              </Label>
              <div className="space-y-2">
                {!currentlyIsSector && (
                  <Button
                    variant={action === "make-sector" ? "default" : "outline"}
                    className={`w-full justify-start ${action === "make-sector" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                    onClick={() => setAction("make-sector")}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    {t("editCragDialog.convertToSector")}
                  </Button>
                )}
                {currentlyIsSector && (
                  <>
                    <Button
                      variant={action === "change-parent" ? "default" : "outline"}
                      className={`w-full justify-start ${action === "change-parent" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                      onClick={() => setAction("change-parent")}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      {t("editCragDialog.changeParent")}
                    </Button>
                    <Button
                      variant={action === "make-crag" ? "default" : "outline"}
                      className={`w-full justify-start ${action === "make-crag" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                      onClick={() => setAction("make-crag")}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      {t("editCragDialog.convertToCrag")}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Parent Crag Search (only show if not converting to crag) */}
            {action !== "make-crag" && (
              <div>
                <Label className="text-base font-semibold mb-2 block">
                  {action === "change-parent"
                    ? t("editCragDialog.selectNewParent")
                    : t("editCragDialog.selectParentCrag")}
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("editCragDialog.searchForParent")}
                </p>

                {/* Search Input */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t("editCragDialog.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Search Results */}
                {searchQuery.trim().length >= 2 && (
                  <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                    {searchResults.length === 0 && !searching ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {t("editCragDialog.noCragsFound")}
                      </div>
                    ) : (
                      <Command>
                        <CommandList>
                          <CommandGroup>
                            {searchResults.map((result) => (
                              <CommandItem
                                key={result.id}
                                onSelect={() => {
                                  setSelectedParentCrag(result);
                                  setSearchQuery("");
                                  setSearchResults([]);
                                }}
                                className="cursor-pointer"
                              >
                                <Mountain className="mr-2 h-4 w-4 text-orange-500" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{result.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {result.location}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    )}
                  </div>
                )}

                {/* Selected Parent */}
                {selectedParentCrag && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mountain className="h-4 w-4 text-green-600 dark:text-green-500" />
                        <div>
                          <p className="font-medium text-sm">{selectedParentCrag.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedParentCrag.location}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedParentCrag(null)}>
                        {t("editCragDialog.change")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                {t("dialog.cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("editCragDialog.saving")}
                  </>
                ) : (
                  <>{t("editCragDialog.save")}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Creation Modal */}
      <ProfileCreationModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        trigger="manual"
        onCreated={handleProfileCreated}
      />
    </>
  );
}
