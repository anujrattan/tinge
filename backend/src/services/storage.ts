/**
 * Supabase Storage Service
 * 
 * Handles file uploads to Supabase Storage buckets
 * Used for category and product images
 */

import { supabaseAdmin } from './supabase.js';

const STORAGE_BUCKET = 'category-images'; // Bucket name for images

/**
 * Upload category image to Supabase Storage
 * @param fileBuffer - File buffer (from base64 decoded image)
 * @param categorySlug - Category slug for filename
 * @param contentType - MIME type of the image (default: image/jpeg)
 * @returns Public URL of the uploaded file
 */
export const uploadCategoryImage = async (
  fileBuffer: Buffer,
  categorySlug: string,
  contentType: string = 'image/jpeg'
): Promise<string> => {
  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedSlug = categorySlug.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Detect extension from content type
    let extension = 'jpg';
    if (contentType === 'image/png') extension = 'png';
    else if (contentType === 'image/webp') extension = 'webp';
    else if (contentType === 'image/gif') extension = 'gif';
    
    const uniqueFileName = `${timestamp}_${sanitizedSlug}.${extension}`;
    const filePath = `categories/${uniqueFileName}`;

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
          `Please create it via Supabase Dashboard: Storage → Create Bucket → Name: category-images → Public: Yes`
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
 * @param filePath - Path to the file in storage (relative to bucket, e.g., "categories/1234_category.jpg")
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
 * Upload product image to Supabase Storage
 * @param fileBuffer - File buffer (from base64 decoded image)
 * @param productIdOrSlug - Product ID or slug for filename
 * @param type - 'main' for main images, 'mockup' for mockup images
 * @param contentType - MIME type of the image (default: image/jpeg)
 * @returns Public URL of the uploaded file
 */
export const uploadProductImage = async (
  fileBuffer: Buffer,
  productIdOrSlug: string,
  type: 'main' | 'mockup',
  contentType: string = 'image/jpeg'
): Promise<string> => {
  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedId = productIdOrSlug.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Detect extension from content type
    let extension = 'jpg';
    if (contentType === 'image/png') extension = 'png';
    else if (contentType === 'image/webp') extension = 'webp';
    else if (contentType === 'image/gif') extension = 'gif';
    
    const uniqueFileName = `${timestamp}_${sanitizedId}.${extension}`;
    // Use 'products/main' or 'products/mockups' folder
    const folder = type === 'main' ? 'products/main' : 'products/mockups';
    const filePath = `${folder}/${uniqueFileName}`;

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
          `Please create it via Supabase Dashboard: Storage → Create Bucket → Name: category-images → Public: Yes`
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
 * Extract file path from Supabase Storage URL
 * @param url - Full public URL from Supabase Storage
 * @returns File path relative to bucket (e.g., "categories/1234_category.jpg" or "products/main/1234_product.jpg")
 */
export const extractFilePathFromUrl = (url: string): string | null => {
  try {
    // Supabase Storage URLs typically look like:
    // https://[project-ref].supabase.co/storage/v1/object/public/category-images/[folder]/[filename]
    const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

