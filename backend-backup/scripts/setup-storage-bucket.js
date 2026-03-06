/**
 * Script to create Supabase Storage bucket for category images
 * 
 * Usage: node scripts/setup-storage-bucket.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const backendRoot = join(__dirname, '..');
const envPath = join(backendRoot, '.env');

if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const BUCKET_NAME = 'category-images';

async function setupStorageBucket() {
  try {
    console.log(`\n📦 Setting up storage bucket: ${BUCKET_NAME}...\n`);

    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw listError;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`✅ Bucket "${BUCKET_NAME}" already exists!`);
      console.log(`\n📋 Bucket Details:`);
      const bucket = buckets.find(b => b.name === BUCKET_NAME);
      console.log(`   Name: ${bucket.name}`);
      console.log(`   Public: ${bucket.public ? 'Yes' : 'No'}`);
      console.log(`   Created: ${bucket.created_at}`);
      
      if (!bucket.public) {
        console.log(`\n⚠️  Warning: Bucket is not public. Making it public...`);
        // Note: Supabase JS SDK doesn't have a direct method to update bucket settings
        // You'll need to do this via Dashboard or REST API
        console.log(`   Please make the bucket public via Supabase Dashboard:`);
        console.log(`   1. Go to Storage → ${BUCKET_NAME}`);
        console.log(`   2. Click Settings`);
        console.log(`   3. Toggle "Public bucket" to ON`);
      } else {
        console.log(`\n✅ Bucket is public and ready to use!`);
      }
      return;
    }

    // Create the bucket
    console.log(`Creating bucket "${BUCKET_NAME}"...`);
    const { data: bucketData, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    });

    if (createError) {
      // If bucket creation fails, provide manual instructions
      if (createError.message.includes('already exists') || createError.message.includes('duplicate')) {
        console.log(`✅ Bucket "${BUCKET_NAME}" already exists!`);
        return;
      }
      
      console.error(`\n❌ Error creating bucket: ${createError.message}`);
      console.log(`\n💡 Manual Setup Instructions:`);
      console.log(`   1. Go to Supabase Dashboard: ${SUPABASE_URL.replace('/rest/v1', '')}`);
      console.log(`   2. Navigate to Storage → Create Bucket`);
      console.log(`   3. Name: ${BUCKET_NAME}`);
      console.log(`   4. Public: Yes`);
      console.log(`   5. File size limit: 5MB`);
      console.log(`   6. Allowed MIME types: image/jpeg, image/png, image/webp`);
      process.exit(1);
    }

    console.log(`✅ Bucket "${BUCKET_NAME}" created successfully!`);
    console.log(`\n📋 Bucket Details:`);
    console.log(`   Name: ${bucketData.name}`);
    console.log(`   Public: ${bucketData.public ? 'Yes' : 'No'}`);
    console.log(`   File size limit: 5MB`);
    console.log(`   Allowed types: image/jpeg, image/png, image/webp`);

    // Set up storage policies (these need to be run in SQL Editor)
    console.log(`\n📝 Next Steps:`);
    console.log(`   1. Run the storage policies SQL in Supabase SQL Editor:`);
    console.log(`      See: backend/db-migrations/003_setup_storage_bucket.sql`);
    console.log(`   2. Or run this SQL:`);
    console.log(`\n   CREATE POLICY "Category images are publicly accessible"`);
    console.log(`   ON storage.objects FOR SELECT`);
    console.log(`   USING (bucket_id = '${BUCKET_NAME}');`);
    console.log(`\n   CREATE POLICY "Service role can manage category images"`);
    console.log(`   ON storage.objects FOR ALL`);
    console.log(`   USING (bucket_id = '${BUCKET_NAME}' AND auth.role() = 'service_role');`);

  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    console.log(`\n💡 Manual Setup Instructions:`);
    console.log(`   1. Go to Supabase Dashboard`);
    console.log(`   2. Navigate to Storage → Create Bucket`);
    console.log(`   3. Name: ${BUCKET_NAME}`);
    console.log(`   4. Public: Yes`);
    console.log(`   5. File size limit: 5MB`);
    console.log(`   6. Allowed MIME types: image/jpeg, image/png, image/webp`);
    process.exit(1);
  }
}

setupStorageBucket();

