# Reports Feature Implementation TODO

## ✅ Completed

1. **Database Queries** (`src/lib/db/queries.ts`)
   - `findCragByCoordinates()` - Find crag within tolerance (~100m)
   - `findOrCreateCrag()` - Ensure crags exist for report attachment
   - Enhanced `fetchReportsByCrag()` to include author info and confirmation counts

2. **UI Components**
   - `ReportDialog.tsx` - Form for submitting reports (ratings + text)
   - `ReportCard.tsx` - Display reports with author, ratings, confirmations
   - `Slider.tsx` - UI component for rating sliders
   - `Textarea.tsx` - UI component for text input

3. **Translations**
   - Added all report-related strings to `en/common.json`
   - Includes ratings labels, form fields, error messages

## 🚧 Remaining Work

### 1. Update Chat API to Return Crag ID

**File:** `src/app/api/chat/route.ts`

**Location:** After line 618 (where we have lat/lon), before returning conditions

**Changes needed:**
```typescript
// After we have lat, lon, location, etc...

// Find or create crag in database to enable reports
let cragId: string | undefined;
try {
  const crag = await findOrCreateCrag({
    name: location,
    lat,
    lon,
    country,
    state,
    municipality,
    village,
    rockType: detectedRockType,
    source: "ai_chat",
  });
  cragId = crag.id;
} catch (error) {
  console.error("[get_conditions] Failed to find/create crag:", error);
  // Continue without cragId - reports won't work but conditions will
}

// Then in the return statement (line 619):
return {
  location,
  locationDetails,
  latitude: lat,
  longitude: lon,
  cragId, // ADD THIS
  country,
  // ... rest of the fields
};
```

### 2. Update ConditionsData Interface

**File:** `src/components/ChatInterface.tsx` (and other places using ConditionsData)

**Add field:**
```typescript
interface ConditionsData {
  location: string;
  locationDetails?: string;
  timeframe?: string;
  rating: string;
  frictionScore: number;
  cragId?: string; // ADD THIS
  // ... rest of fields
}
```

Also update in:
- `src/components/WeatherConditionCard.tsx`
- `src/components/ConditionsDetailDialog.tsx`

### 3. Add Report Button to WeatherConditionCard

**File:** `src/components/WeatherConditionCard.tsx`

**Changes:**
1. Import ReportDialog
2. Add state for dialog:
   ```typescript
   const [reportDialogOpen, setReportDialogOpen] = useState(false);
   ```

3. Add button next to Favorite button:
   ```tsx
   <Button
     variant="outline"
     size="sm"
     onClick={() => setReportDialogOpen(true)}
     disabled={!data.cragId}
     title="Add condition report"
   >
     <MessageSquare className="w-4 h-4 mr-1" />
     Add Report
   </Button>
   ```

4. Add dialog at bottom of component:
   ```tsx
   {data.cragId && (
     <ReportDialog
       open={reportDialogOpen}
       onOpenChange={setReportDialogOpen}
       cragId={data.cragId}
       cragName={data.location}
       onReportCreated={() => {
         // Optionally reload reports
         console.log("Report created!");
       }}
     />
   )}
   ```

### 4. Add Reports Display to ConditionsDetailDialog

**File:** `src/components/ConditionsDetailDialog.tsx`

**Changes:**
1. Import ReportCard
2. Add state for reports:
   ```typescript
   const [reports, setReports] = useState<any[]>([]);
   const [isLoadingReports, setIsLoadingReports] = useState(false);
   ```

3. Load reports when dialog opens:
   ```typescript
   useEffect(() => {
     if (open && data.cragId) {
       loadReports();
     }
   }, [open, data.cragId]);

   const loadReports = async () => {
     setIsLoadingReports(true);
     try {
       const reports = await fetchReportsByCrag(data.cragId!);
       setReports(reports || []);
     } catch (error) {
       console.error("Failed to load reports:", error);
     } finally {
       setIsLoadingReports(false);
     }
   };
   ```

4. Add Reports tab or section:
   ```tsx
   <div className="space-y-3">
     <h3 className="text-lg font-semibold">
       {t("reports.recentReports")}
     </h3>
     {isLoadingReports && <p>Loading...</p>}
     {!isLoadingReports && reports.length === 0 && (
       <p className="text-muted-foreground">
         {t("reports.noReportsMessage")}
       </p>
     )}
     {reports.map((report) => (
       <ReportCard
         key={report.id}
         report={report}
         onConfirmationChange={loadReports}
       />
     ))}
   </div>
   ```

### 5. Test Flow

1. Search for a crag (e.g., "El Capitan")
2. Verify cragId is returned in conditions
3. Click "Add Report" button
4. Fill out ratings and text
5. Submit report
6. Verify report appears in details dialog
7. Test confirmation (thumbs up)
8. Verify confirmations increment
9. Test from different device/browser (different sync key)
10. Verify reports are shared across all users

### 6. Additional Improvements (Optional)

- Add photo upload to reports
- Add edit/delete for own reports
- Add report moderation/flagging
- Add recent reports badge on conditions card
- Add report notifications
- Optimize report queries with pagination
- Add report search/filtering

## Notes

- Reports are tied to crags in the database, not just coordinates
- This ensures all users see the same reports regardless of how they find the location
- The ~100m tolerance for matching crags prevents duplicates while allowing for GPS variance
- Reports work offline-first but require internet to submit to database
- Confirmations use sync key hash to prevent duplicate votes
