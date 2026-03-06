/**
 * Supabase Storage Service
 * 
 * Handles file uploads to Supabase Storage buckets
 * Used for category images, product images, etc.
 */

import { supabaseAdmin } from './supabase.js';
import { config } from '../config/index.js';

const STORAGE_BUCKET = 'category-images'; // Bucket name for category images

/**
 * Upload a file to Supabase Storage
 * @param file - File buffer or File object
 * @param fileName - Name for the file (will be prefixed with timestamp)
 * @param folder - Optional folder path within the bucket
 * @returns Public URL of the uploaded file
 */
export const uploadFile = async (
  file: Buffer | File,
  fileName: string,
  folder: string = 'categories'
): Promise<string> => {
  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
    const filePath = `${folder}/${uniqueFileName}`;

    // Convert File to Buffer if needed
    let fileBuffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      fileBuffer = file;
    }

    // Detect content type from file extension or file type
    let contentType = 'image/jpeg';
    if (file instanceof File) {
      contentType = file.type || 'image/jpeg';
    } else {
      // Try to detect from fileName extension
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (ext === 'png') contentType = 'image/png';
      else if (ext === 'webp') contentType = 'image/webp';
      else if (ext === 'gif') contentType = 'image/gif';
      else if (ext === 'mp4') contentType = 'video/mp4';
      else if (ext === 'webm') contentType = 'video/webm';
      else if (ext === 'mov') contentType = 'video/quicktime';
    }

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      // Provide helpful error message if bucket doesn't exist
      if (error.message.includes('Bucket not found') || error.message.includes('does not exist')) {
        throw new Error(
          `Storage bucket "${STORAGE_BUCKET}" not found. ` +
          `Please create it via Supabase Dashboard or run: node scripts/setup-storage-bucket.js`
        );
      }
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded file');
    }

    return urlData.publicUrl;
  } catch (error: any) {
    console.error('Storage upload error:', error);
    throw error;
  }
};

/**
 * Delete a file from Supabase Storage
 * @param filePath - Path to the file in storage (relative to bucket)
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Storage delete error:', error);
    throw error;
  }
};

/**
 * Extract file path from Supabase Storage URL
 * @param url - Full public URL from Supabase Storage
 * @returns File path relative to bucket
 */
export const extractFilePathFromUrl = (url: string): string | null => {
  try {
    // Supabase Storage URLs typically look like:
    // https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]
    const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

/**
 * Upload category image
 * Convenience wrapper for category image uploads
 */
export const uploadCategoryImage = async (
  file: Buffer | File,
  categorySlug: string
): Promise<string> => {
  const extension = file instanceof File 
    ? file.name.split('.').pop() || 'jpg'
    : 'jpg';
  
  return uploadFile(file, `${categorySlug}.${extension}`, 'categories');
};

/**
 * Upload product image
 * Convenience wrapper for product image uploads
 */
export const uploadProductImage = async (
  file: Buffer | File,
  productIdOrSlug: string,
  type: 'main' | 'mockup' = 'main'
): Promise<string> => {
  const extension = file instanceof File 
    ? file.name.split('.').pop() || 'jpg'
    : 'jpg';
  
  const folder = type === 'main' ? 'products/main' : 'products/mockups';
  return uploadFile(file, `${productIdOrSlug}_${type}.${extension}`, folder);
};

/**
 * Upload product video
 * Convenience wrapper for product video uploads
 */
export const uploadProductVideo = async (
  file: Buffer | File,
  productIdOrSlug: string
): Promise<string> => {
  const extension = file instanceof File 
    ? file.name.split('.').pop() || 'mp4'
    : 'mp4';
  
  return uploadFile(file, `${productIdOrSlug}_video.${extension}`, 'products/videos');
};

