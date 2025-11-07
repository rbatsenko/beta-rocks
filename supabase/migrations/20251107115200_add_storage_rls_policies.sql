-- Add RLS policies for report-photos storage bucket
-- These policies allow users to upload, view, and delete report photos

-- Drop policies if they exist (for idempotency)
DROP POLICY IF EXISTS "authenticated_upload_report_photos" ON storage.objects;
DROP POLICY IF EXISTS "anon_upload_report_photos" ON storage.objects;
DROP POLICY IF EXISTS "public_read_report_photos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_report_photos" ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_report_photos" ON storage.objects;

-- Create policy for authenticated users to upload
CREATE POLICY "authenticated_upload_report_photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'report-photos'
  AND (storage.foldername(name))[1] = 'reports'
);

-- Create policy for anonymous users to upload (needed for anonymous reports)
CREATE POLICY "anon_upload_report_photos"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'report-photos'
  AND (storage.foldername(name))[1] = 'reports'
);

-- Create policy for public read access
CREATE POLICY "public_read_report_photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'report-photos');

-- Create policy for authenticated users to delete their photos
CREATE POLICY "authenticated_delete_report_photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'report-photos'
  AND (storage.foldername(name))[1] = 'reports'
);

-- Create policy for anonymous users to delete their photos
CREATE POLICY "anon_delete_report_photos"
ON storage.objects FOR DELETE TO anon
USING (
  bucket_id = 'report-photos'
  AND (storage.foldername(name))[1] = 'reports'
);

-- Add comments
COMMENT ON POLICY "authenticated_upload_report_photos" ON storage.objects IS 'Allows authenticated users to upload photos to reports/ folder';
COMMENT ON POLICY "anon_upload_report_photos" ON storage.objects IS 'Allows anonymous users to upload photos to reports/ folder';
COMMENT ON POLICY "public_read_report_photos" ON storage.objects IS 'Allows public read access to all report photos';
COMMENT ON POLICY "authenticated_delete_report_photos" ON storage.objects IS 'Allows authenticated users to delete photos from reports/ folder';
COMMENT ON POLICY "anon_delete_report_photos" ON storage.objects IS 'Allows anonymous users to delete photos from reports/ folder';
