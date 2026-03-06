/**
 * Supabase Client Service
 * 
 * This service provides a singleton Supabase client instance
 * for database operations.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  throw new Error('Supabase configuration is missing. Please check your .env file.');
}

// Create Supabase client with service role key for backend operations
// This bypasses RLS and has full access to database and storage
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Alias for clarity - supabaseAdmin is the same as supabase (service role)
export const supabaseAdmin = supabase;

// Create a client with anon key for public operations (if needed)
export const supabaseAnon = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

