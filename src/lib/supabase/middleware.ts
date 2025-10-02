/**
 * Supabase client middleware for server-side operations with Clerk authentication
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

/**
 * Create an authenticated Supabase client with Clerk JWT
 * This enables Row Level Security (RLS) by passing the Clerk user ID to Supabase
 */
export async function createAuthenticatedClient() {
  const session = await auth();

  if (!session?.userId) {
    throw new Error('Unauthorized - no active session');
  }

  // Create Supabase client with service role key for bypassing RLS when needed
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          // Set the auth context for RLS
          // This makes auth.uid() work in Supabase RLS policies
          'sb-user-id': session.userId,
        },
      },
    }
  );

  return {
    supabase,
    userId: session.userId,
    sessionId: session.sessionId,
  };
}

/**
 * Create an admin Supabase client that bypasses RLS
 * Use this ONLY for admin operations or system-level tasks
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
