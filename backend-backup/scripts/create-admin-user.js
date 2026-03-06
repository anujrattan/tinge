/**
 * Script to create an admin user programmatically
 * 
 * Usage: node scripts/create-admin-user.js <email> <password> [name]
 * 
 * Example: node scripts/create-admin-user.js admin@example.com admin123 "Admin User"
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

async function createAdminUser(email, password, name) {
  try {
    console.log(`\n🔐 Creating admin user...`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name || email.split('@')[0]}`);
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || email.split('@')[0],
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.error(`\n❌ Error: User with email ${email} already exists`);
        console.log(`\n💡 To update existing user to admin, run:`);
        console.log(`   UPDATE user_profiles SET role = 'admin' WHERE email = '${email}';`);
        process.exit(1);
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    console.log(`✅ User created in Supabase Auth (ID: ${authData.user.id})`);

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update profile to admin role
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('id', authData.user.id)
      .select()
      .single();

    if (profileError) {
      // If profile doesn't exist, create it
      if (profileError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email: authData.user.email,
            name: name || email.split('@')[0],
            role: 'admin',
          });

        if (insertError) {
          throw insertError;
        }
        console.log(`✅ Admin profile created`);
      } else {
        throw profileError;
      }
    } else {
      console.log(`✅ User profile updated to admin role`);
    }

    console.log(`\n🎉 Admin user created successfully!`);
    console.log(`\n📋 User Details:`);
    console.log(`   ID: ${authData.user.id}`);
    console.log(`   Email: ${authData.user.email}`);
    console.log(`   Name: ${profileData?.name || name || email.split('@')[0]}`);
    console.log(`   Role: admin`);
    console.log(`\n✨ You can now log in with these credentials at /auth`);

  } catch (error) {
    console.error(`\n❌ Error creating admin user:`, error.message);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('\n❌ Usage: node scripts/create-admin-user.js <email> <password> [name]');
  console.error('\nExample:');
  console.error('  node scripts/create-admin-user.js admin@example.com admin123 "Admin User"');
  process.exit(1);
}

const [email, password, name] = args;

if (password.length < 6) {
  console.error('\n❌ Error: Password must be at least 6 characters long');
  process.exit(1);
}

createAdminUser(email, password, name);

