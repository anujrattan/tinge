# Supabase Storage Setup Guide

This guide explains how to set up Supabase Storage for category image uploads.

## Overview

- **Seeding**: Uses external URLs (Unsplash) for dummy data
- **Production**: Images uploaded via admin console are stored in Supabase Storage
- **Storage Bucket**: `category-images` (public bucket for easy access)

## Setup Steps

### 1. Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage**
3. Click **Create Bucket**
4. Configure:
   - **Name**: `category-images`
   - **Public**: ✅ **Yes** (enables public image URLs)
   - **File size limit**: 5MB (or adjust as needed)
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`

### 2. Set Up Storage Policies

Run the SQL from `003_setup_storage_bucket.sql` in the SQL Editor:

```sql
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
```

**Note**: The backend uses `service_role` key which bypasses RLS, so these policies are mainly for frontend direct uploads (if implemented later).

### 3. Verify Setup

Test the bucket is accessible:

```bash
# Check bucket exists (via Supabase Dashboard → Storage)
# You should see "category-images" bucket listed
```

## How It Works

### Seeding (Initial Data)
- Uses external URLs from Unsplash
- No upload needed
- URLs stored directly in `image_url` field

### Admin Console (New Categories)
- Admin uploads image via form
- Image sent as base64 data to backend
- Backend uploads to Supabase Storage
- Storage URL stored in `image_url` field
- Old image deleted when updating category

### Image URL Format

**External URLs** (seeding):
```
https://images.unsplash.com/photo-...
```

**Supabase Storage URLs** (uploaded):
```
https://[project-ref].supabase.co/storage/v1/object/public/category-images/categories/[timestamp]_[slug].jpg
```

## API Usage

### Create Category with Image Upload

```javascript
// Frontend sends base64 image data
const categoryData = {
  name: "New Category",
  slug: "new-category",
  imageFile: "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // base64 string
};

// Backend handles upload and stores URL
POST /api/categories
```

### Update Category with New Image

```javascript
// Frontend sends new image
const updateData = {
  name: "Updated Category",
  imageFile: "data:image/jpeg;base64,..." // new base64 image
};

// Backend uploads new image, deletes old one, updates DB
PUT /api/categories/:id
```

## File Structure in Storage

```
category-images/
└── categories/
    ├── 1704123456789_t-shirts.jpg
    ├── 1704123456790_hoodies.jpg
    └── 1704123456791_new-category.jpg
```

## Future Enhancements

- **Direct frontend uploads**: Upload directly from browser to Supabase Storage
- **Image optimization**: Resize/compress images before upload
- **Multiple image sizes**: Generate thumbnails and full-size versions
- **CDN integration**: Use Supabase CDN for faster image delivery

## Troubleshooting

### Error: "Bucket not found"
- Ensure bucket `category-images` exists
- Check bucket name matches exactly (case-sensitive)

### Error: "Permission denied"
- Verify storage policies are set up correctly
- Check service_role key is configured in backend `.env`

### Images not displaying
- Check bucket is set to **Public**
- Verify image URLs are correct
- Check CORS settings if uploading from frontend

