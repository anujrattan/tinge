-- Migration: Setup Supabase Storage Bucket for Category Images
-- Description: Creates storage bucket and policies for category image uploads
-- Date: 2024
-- Note: This should be run via Supabase Dashboard → Storage → Create Bucket

-- IMPORTANT: Storage buckets cannot be created via SQL
-- You need to create the bucket manually via Supabase Dashboard:
-- 1. Go to Storage → Create Bucket
-- 2. Name: category-images
-- 3. Public: Yes (for public image access)
-- 4. File size limit: 5MB (or as needed)
-- 5. Allowed MIME types: image/jpeg, image/png, image/webp

-- After creating the bucket, you can set up policies via SQL:

-- Policy: Allow public read access to category images
CREATE POLICY "Category images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

-- Policy: Allow authenticated users (admin) to upload category images
CREATE POLICY "Authenticated users can upload category images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'category-images' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users (admin) to update category images
CREATE POLICY "Authenticated users can update category images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'category-images' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users (admin) to delete category images
CREATE POLICY "Authenticated users can delete category images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'category-images' 
  AND auth.role() = 'authenticated'
);

-- Note: For service role operations (backend), RLS is bypassed
-- The backend uses service_role key which has full access

