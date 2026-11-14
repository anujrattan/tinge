/**
 * Shared-auth helpers: tag which apps an auth.users row belongs to.
 * Membership lives in app_metadata.apps (service-role only) + tinge_user_profiles.
 */

import { supabaseAdmin } from './supabase.js';

export const TINGE_APP_ID = 'tinge';

type AuthUserLike = {
  id: string;
  email?: string | null;
  phone?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

function appsFromMetadata(meta: Record<string, unknown> | undefined): string[] {
  const raw = meta?.apps;
  if (Array.isArray(raw)) {
    return raw.map(String);
  }
  if (typeof meta?.app === 'string') {
    return [meta.app];
  }
  return [];
}

export function hasTingeApp(user: AuthUserLike): boolean {
  return appsFromMetadata(user.app_metadata).includes(TINGE_APP_ID);
}

/** Merge `tinge` into app_metadata.apps without overwriting other app metadata keys. */
export async function tagAuthUserAsTinge(
  userId: string,
  existingMeta?: Record<string, unknown>,
) {
  const existingApps = appsFromMetadata(existingMeta);
  const apps = Array.from(new Set([...existingApps, TINGE_APP_ID]));
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { ...(existingMeta || {}), apps },
  });
  if (error) {
    throw new Error(`Failed to tag Tinge membership: ${error.message}`);
  }
  return apps;
}

/**
 * Ensure this auth user is a Tinge member: app_metadata + tinge_user_profiles row.
 * Safe if the same email already uses the real-estate app.
 */
export async function ensureTingeMembership(
  user: AuthUserLike,
  opts?: { name?: string; email?: string }
) {
  const email =
    opts?.email ||
    user.email ||
    (typeof user.user_metadata?.email === 'string' ? user.user_metadata.email : null);

  if (!email && !user.phone) {
    throw new Error('Email or phone required for Tinge membership');
  }

  const existingApps = appsFromMetadata(user.app_metadata);
  if (!existingApps.includes(TINGE_APP_ID)) {
    await tagAuthUserAsTinge(user.id, user.app_metadata);
  }

  const displayName =
    opts?.name ||
    (typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : null) ||
    (email ? email.split('@')[0] : user.phone) ||
    'User';

  const { data: profile } = await supabaseAdmin
    .from('tinge_user_profiles')
    .select('id, role, name, email')
    .eq('id', user.id)
    .maybeSingle();

  if (profile) {
    return profile;
  }

  const { data: created, error } = await supabaseAdmin
    .from('tinge_user_profiles')
    .insert({
      id: user.id,
      email: email || `${user.phone}@phone.tinge.local`,
      name: displayName,
      role: 'user',
    })
    .select('id, role, name, email')
    .single();

  if (error) {
    // Race: trigger or concurrent request already inserted
    const { data: again } = await supabaseAdmin
      .from('tinge_user_profiles')
      .select('id, role, name, email')
      .eq('id', user.id)
      .single();
    if (again) return again;
    throw new Error(`Failed to create Tinge profile: ${error.message}`);
  }

  return created;
}
