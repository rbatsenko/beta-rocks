"use client";

import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { logRender } from "@/lib/debug/render-log";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { CreateCragDialog } from "@/components/dialogs/CreateCragDialog";

interface SuggestedCrag {
  name: string;
  latitude: number;
  longitude: number;
  rockType?: string | null;
  climbingTypes?: string[];
  country?: string;
  state?: string;
  municipality?: string;
  village?: string;
  osmId?: string;
  osmType?: "node" | "way" | "relation";
}

interface CreateCragSuggestionResult {
  suggestCragCreation: true;
  message: string;
  translationKey?: string;
  translationParams?: Record<string, string | number>;
  source: string;
  suggestedCrag: SuggestedCrag;
}

interface CreateCragSuggestionProps {
  result: CreateCragSuggestionResult;
  displayMessage: string;
  onCragCreated?: (query: string) => void;
}

export const CreateCragSuggestion = memo(function CreateCragSuggestion({
  result,
  displayMessage,
  onCragCreated,
}: CreateCragSuggestionProps) {
  const { t } = useClientTranslation("common");
  const [showDialog, setShowDialog] = useState(false);

  logRender("CreateCragSuggestion", {
    suggestedName: result.suggestedCrag.name,
    hasRockType: !!result.suggestedCrag.rockType,
  });

  const handleCreateSuccess = useCallback(
    (cragName: string, latitude: number, longitude: number) => {
      // Close dialog
      setShowDialog(false);

      // Re-run search with the created crag's coordinates
      if (onCragCreated) {
        const query = `conditions at ${cragName} (${latitude}, ${longitude})`;
        onCragCreated(query);
      }
    },
    [onCragCreated]
  );

  return (
    <div className="space-y-3 border border-dashed border-orange-400 dark:border-orange-600 rounded-lg p-4 bg-orange-50 dark:bg-orange-950/20">
      <div className="space-y-2">
        <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
          {displayMessage}
        </p>
        <div className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
          <div>
            <span className="font-semibold">{t("cragCreation.name")}:</span>{" "}
            {result.suggestedCrag.name}
          </div>
          {result.suggestedCrag.rockType && (
            <div>
              <span className="font-semibold">{t("cragCreation.rockType")}:</span>{" "}
              {t(`rockTypes.${result.suggestedCrag.rockType}`, result.suggestedCrag.rockType)}
            </div>
          )}
          {result.suggestedCrag.climbingTypes && result.suggestedCrag.climbingTypes.length > 0 && (
            <div>
              <span className="font-semibold">{t("cragCreation.climbingTypes")}:</span>{" "}
              {result.suggestedCrag.climbingTypes.map((type) => t(`climbingTypes.${type}`, type)).join(", ")}
            </div>
          )}
          {result.suggestedCrag.country && (
            <div>
              <span className="font-semibold">{t("cragCreation.location")}:</span>{" "}
              {[
                result.suggestedCrag.village,
                result.suggestedCrag.municipality,
                result.suggestedCrag.state,
                result.suggestedCrag.country,
              ]
                .filter(Boolean)
                .join(", ")}
            </div>
          )}
        </div>
      </div>

      <Button
        variant="default"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600"
      >
        <PlusCircle className="w-4 h-4 mr-2" />
        {t("cragCreation.addCragButton")}
      </Button>

      {showDialog && (
        <CreateCragDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          suggestedCrag={result.suggestedCrag}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
});
