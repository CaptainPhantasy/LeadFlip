/**
 * Admin Role Management
 *
 * God-level admin users with full system access
 */

import { createClient } from '@supabase/supabase-js';
import { clerkClient } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * List of god-level admin user IDs
 * These users have unrestricted access to all system functions
 *
 * To add yourself as admin:
 * 1. Sign up via Clerk at /sign-up
 * 2. Copy your Clerk user ID from the Clerk Dashboard
 * 3. Add it to this array
 */
export const GOD_ADMINS = [
  'user_33RVOIU75IFG8QVTaXPK4VRAnwv', // Douglas Talley - Primary Admin
];

/**
 * Check if a user is a god-level admin
 */
export function isGodAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return GOD_ADMINS.includes(userId);
}

/**
 * Check if a user has admin role in database
 * This queries the users table for the role field
 */
export async function isAdminInDatabase(userId: string): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.role === 'admin' || data.role === 'super_admin';
}

/**
 * Check if user is admin (either god-level, Clerk metadata, or database admin)
 */
export async function isAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;

  // Log the user ID for debugging
  console.log('[Admin] Checking admin access for user ID:', userId);

  // God admins have instant access
  if (isGodAdmin(userId)) {
    console.log('[Admin] User is GOD ADMIN ✅');
    return true;
  }

  // Check Clerk publicMetadata for admin role
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    console.log('[Admin] Clerk metadata role:', user?.publicMetadata?.role);
    if (user?.publicMetadata?.role === 'admin') {
      console.log('[Admin] User is Clerk admin ✅');
      return true;
    }
  } catch (error) {
    console.error('[Admin] Error checking Clerk metadata:', error);
  }

  // Check database for admin role
  const dbAdmin = await isAdminInDatabase(userId);
  console.log('[Admin] Database admin check:', dbAdmin);
  return dbAdmin;
}

/**
 * Get admin user info
 */
export async function getAdminInfo(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  return {
    isGodAdmin: isGodAdmin(userId),
    isDatabaseAdmin: data?.role === 'admin' || data?.role === 'super_admin',
    user: data,
  };
}

/**
 * Grant admin role to a user (god admins only)
 */
export async function grantAdminRole(targetUserId: string, grantedBy: string): Promise<boolean> {
  // Only god admins can grant admin roles
  if (!isGodAdmin(grantedBy)) {
    throw new Error('Only god-level admins can grant admin roles');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', targetUserId);

  return !error;
}

/**
 * Revoke admin role from a user (god admins only)
 */
export async function revokeAdminRole(targetUserId: string, revokedBy: string): Promise<boolean> {
  // Only god admins can revoke admin roles
  if (!isGodAdmin(revokedBy)) {
    throw new Error('Only god-level admins can revoke admin roles');
  }

  // Cannot revoke god admin status
  if (isGodAdmin(targetUserId)) {
    throw new Error('Cannot revoke god-level admin status');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('users')
    .update({ role: 'user' })
    .eq('id', targetUserId);

  return !error;
}
