"use client";

import { useState } from "react";
import { MessageSquare, Edit, Trash2, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useRouter } from "next/navigation";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { formatDistanceToNow } from "date-fns";
import { getDateFnsLocale } from "@/lib/i18n/date-locales";
import { useToast } from "@/hooks/use-toast";
import {
  useUserReports,
  useDeleteReport,
  useInvalidateReports,
  type UserReport,
} from "@/hooks/queries/useReportsQueries";

interface UserReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserReportsDialog({ open, onOpenChange }: UserReportsDialogProps) {
  const { t, i18n } = useClientTranslation("common");
  const dateLocale = getDateFnsLocale(i18n.language);
  const router = useRouter();
  const { toast } = useToast();

  // React Query hooks
  const { data: reports = [], isLoading } = useUserReports();
  const deleteReportMutation = useDeleteReport();
  const invalidateReports = useInvalidateReports();

  const [reportToDelete, setReportToDelete] = useState<UserReport | null>(null);
  const [reportToEdit, setReportToEdit] = useState<UserReport | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const handleEdit = (report: UserReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setReportToEdit(report);
    setShowReportDialog(true);
  };

  const handleDelete = (report: UserReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setReportToDelete(report);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    try {
      await deleteReportMutation.mutateAsync(reportToDelete.id);
      toast({
        title: t("reports.deleted"),
        description: t("userReports.deleteSuccess"),
      });
    } catch (error) {
      console.error("[UserReportsDialog] Error deleting report:", error);
      toast({
        title: t("userReports.deleteFailed"),
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setReportToDelete(null);
    }
  };

  const handleViewCrag = (report: UserReport) => {
    if (!report.crag) return;

    // Use stored slug if available, otherwise generate one for backward compatibility
    const slug =
      report.crag.slug || generateUniqueSlug(report.crag.name, report.crag.lat, report.crag.lon);
    router.push(`/location/${slug}`);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-4xl max-h-[90vh]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-500" />
              {t("userReports.title")}
            </DialogTitle>
            <DialogDescription>
              {reports.length === 0
                ? t("userReports.empty")
                : t("userReports.description", { count: reports.length })}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="h-16 w-16 text-muted-foreground/50 mb-4 animate-spin" />
                <p className="text-muted-foreground">{t("userReports.loading")}</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t("userReports.emptyMessage")}</p>
                <p className="text-sm text-muted-foreground mt-2">{t("userReports.emptyHint")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Card
                    key={report.id}
                    className="cursor-pointer transition-all hover:shadow-md hover:border-orange-500/50"
                    onClick={() => handleViewCrag(report)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {t(`reports.categories.${report.category}`)}
                            </Badge>
                            {report.lost_found_type && (
                              <Badge
                                variant={
                                  report.lost_found_type === "lost" ? "destructive" : "default"
                                }
                                className="text-xs"
                              >
                                {t(`reports.lostFoundTypes.${report.lost_found_type}`)}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(report.created_at), {
                                addSuffix: true,
                                locale: dateLocale,
                              })}
                            </span>
                          </div>
                          {report.crag && (
                            <CardTitle className="text-base flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{report.crag.name}</span>
                            </CardTitle>
                          )}
                          {report.text && (
                            <CardDescription className="line-clamp-2 text-sm">
                              {report.text}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => handleEdit(report, e)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDelete(report, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {report.category === "conditions" && (
                      <CardContent className="pt-0">
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {report.rating_dry && (
                            <div className="flex items-center gap-1">
                              <span>{t("reports.dryness")}:</span>
                              <span className="font-medium text-orange-500">
                                {report.rating_dry}/5
                              </span>
                            </div>
                          )}
                          {report.rating_wind && (
                            <div className="flex items-center gap-1">
                              <span>{t("reports.wind")}:</span>
                              <span className="font-medium text-orange-500">
                                {report.rating_wind}/5
                              </span>
                            </div>
                          )}
                          {report.rating_crowds && (
                            <div className="flex items-center gap-1">
                              <span>{t("reports.crowds")}:</span>
                              <span className="font-medium text-orange-500">
                                {report.rating_crowds}/5
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!reportToDelete}
        onOpenChange={(open) => !open && setReportToDelete(null)}
        onConfirm={confirmDelete}
        title={t("reports.deleteConfirmTitle")}
        description={t("reports.deleteConfirm")}
        confirmText={t("dialog.delete")}
        cancelText={t("dialog.cancel")}
        variant="destructive"
      />

      {/* Edit Report Dialog */}
      {reportToEdit && reportToEdit.crag && (
        <ReportDialog
          open={showReportDialog}
          onOpenChange={(open) => {
            setShowReportDialog(open);
            if (!open) {
              setReportToEdit(null);
            }
          }}
          cragId={reportToEdit.crag.id}
          cragName={reportToEdit.crag.name}
          editReport={reportToEdit}
          onReportCreated={() => {
            invalidateReports(); // Invalidate cache to refetch reports after edit
          }}
        />
      )}
    </>
  );
}
