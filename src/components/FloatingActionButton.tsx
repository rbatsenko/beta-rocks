"use client";

import { useState } from "react";
import { Plus, Mountain, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddCragModal } from "@/components/dialogs/AddCragModal";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onAddReport?: () => void;
}

export function FloatingActionButton({ onAddReport }: FloatingActionButtonProps) {
  const { t } = useClientTranslation("common");
  const [expanded, setExpanded] = useState(false);
  const [showAddCragModal, setShowAddCragModal] = useState(false);

  const handleAddCrag = () => {
    setExpanded(false);
    setShowAddCragModal(true);
  };

  const handleAddReport = () => {
    setExpanded(false);
    if (onAddReport) {
      onAddReport();
    }
  };

  return (
    <>
      <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 flex flex-col items-end gap-3">
        {/* Main FAB button */}
        <Button
          size="icon"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg transition-transform duration-200",
            expanded && "rotate-45"
          )}
          aria-label={t("fab.tooltip")}
        >
          <Plus className="h-8 w-8 md:h-10 md:w-10" />
        </Button>

        {/* Action buttons (shown when expanded) - appear above main button */}
        <div
          className={cn(
            "flex flex-col gap-2 transition-all duration-200 absolute bottom-16 md:bottom-[4.5rem]",
            expanded ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          )}
        >
          <Button
            variant="secondary"
            onClick={handleAddCrag}
            className="h-12 rounded-full shadow-lg px-4 gap-2"
          >
            <Mountain className="h-5 w-5" />
            <span className="font-medium">{t("fab.addCrag")}</span>
          </Button>

          {onAddReport && (
            <Button
              variant="secondary"
              onClick={handleAddReport}
              className="h-12 rounded-full shadow-lg px-4 gap-2"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">{t("fab.addReport")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Add Crag Modal */}
      <AddCragModal open={showAddCragModal} onOpenChange={setShowAddCragModal} />
    </>
  );
}
