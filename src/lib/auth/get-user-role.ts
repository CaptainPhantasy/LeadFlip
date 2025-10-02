/**
 * Get user role and capabilities
 * A user can be BOTH a consumer and a business (e.g., a plumber who also needs a plumber)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface UserRole {
  isAdmin: boolean;
  isBusinessOwner: boolean;
  isConsumer: boolean; // Everyone is a consumer (can post problems)
  businessId?: string;
  businessName?: string;
}

export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if user has admin role
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  const isAdmin = user?.role === 'admin';

  // Check if user has a business profile
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('user_id', userId)
    .single();

  const isBusinessOwner = !!business;

  return {
    isAdmin,
    isBusinessOwner,
    isConsumer: true, // Everyone can be a consumer
    businessId: business?.id,
    businessName: business?.name,
  };
}
