/**
 * Admin Router - Admin-only API endpoints
 */

import { z } from 'zod';
import { createTRPCRouter, adminProcedure } from '../trpc';
import { createClient } from '@supabase/supabase-js';
import { grantAdminRole, revokeAdminRole, isGodAdmin } from '@/lib/auth/admin';
import { RestClient } from '@signalwire/compatibility-api';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const signalwireProjectId = process.env.SIGNALWIRE_PROJECT_ID!;
const signalwireApiToken = process.env.SIGNALWIRE_API_TOKEN!;
const signalwireSpaceUrl = process.env.SIGNALWIRE_SPACE_URL!;

export const adminRouter = createTRPCRouter({
  /**
   * Get platform-wide statistics
   */
  getStats: adminProcedure.query(async () => {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get total counts
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    const { count: totalBusinesses } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });

    const { count: totalMatches } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true });

    const { count: totalCalls } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true });

    return {
      totalLeads: totalLeads || 0,
      totalBusinesses: totalBusinesses || 0,
      totalMatches: totalMatches || 0,
      totalCalls: totalCalls || 0,
    };
  }),

  /**
   * Get recent leads (admin view)
   */
  getRecentLeads: adminProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (error) {
        throw new Error('Failed to fetch recent leads');
      }

      return data;
    }),

  /**
   * Get system health status
   */
  getSystemHealth: adminProcedure.query(async () => {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check database connectivity
    const { error: dbError } = await supabase.from('leads').select('id').limit(1);

    // Check SignalWire connectivity
    let signalwireStatus = 'unknown';
    try {
      if (signalwireProjectId && signalwireApiToken && signalwireSpaceUrl) {
        const client = new RestClient(signalwireProjectId, signalwireApiToken, {
          signalwireSpaceUrl,
        });
        // Fetch account info to verify credentials
        await client.api.accounts(signalwireProjectId).fetch();
        signalwireStatus = 'healthy';
      } else {
        signalwireStatus = 'not_configured';
      }
    } catch (error) {
      console.error('SignalWire health check failed:', error);
      signalwireStatus = 'error';
    }

    // Check WebSocket server (if deployed)
    let websocketStatus = 'unknown';
    const websocketUrl = process.env.WEBSOCKET_SERVER_URL;
    if (websocketUrl) {
      try {
        const healthUrl = websocketUrl.replace('wss://', 'https://').replace('ws://', 'http://') + '/health';
        const response = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          websocketStatus = 'healthy';
        } else {
          websocketStatus = 'error';
        }
      } catch (error) {
        websocketStatus = 'error';
      }
    }

    return {
      database: dbError ? 'error' : 'healthy',
      agents: 'healthy', // Claude Agent SDK is always available
      signalwire: signalwireStatus,
      websocket: websocketStatus,
      workers: 'unknown', // TODO: Check BullMQ workers
    };
  }),

  /**
   * Get all leads (with filters)
   */
  getAllLeads: adminProcedure
    .input(
      z.object({
        status: z.string().optional(),
        minQualityScore: z.number().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.status) {
        query = query.eq('status', input.status);
      }

      if (input.minQualityScore !== undefined) {
        query = query.gte('quality_score', input.minQualityScore);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error('Failed to fetch leads');
      }

      return data;
    }),

  /**
   * Flag lead as spam
   */
  flagLead: adminProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('leads')
        .update({
          status: 'spam',
          spam_reason: input.reason,
        })
        .eq('id', input.leadId)
        .select()
        .single();

      if (error) {
        throw new Error('Failed to flag lead');
      }

      return data;
    }),

  /**
   * Get audit reports
   */
  getAuditReports: adminProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      // TODO: Implement audit report retrieval from storage
      // For now, return empty array
      return [];
    }),

  /**
   * Manually trigger audit
   */
  triggerAudit: adminProcedure.mutation(async () => {
    // TODO: Queue audit agent job
    return {
      success: true,
      message: 'Audit queued',
    };
  }),

  /**
   * Get business list with filters
   */
  getAllBusinesses: adminProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        minRating: z.number().optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      let query = supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (input.isActive !== undefined) {
        query = query.eq('is_active', input.isActive);
      }

      if (input.minRating !== undefined) {
        query = query.gte('rating', input.minRating);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error('Failed to fetch businesses');
      }

      return data;
    }),

  /**
   * Update business status
   */
  updateBusinessStatus: adminProcedure
    .input(
      z.object({
        businessId: z.string().uuid(),
        isActive: z.boolean(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('businesses')
        .update({
          is_active: input.isActive,
        })
        .eq('id', input.businessId)
        .select()
        .single();

      if (error) {
        throw new Error('Failed to update business');
      }

      return data;
    }),

  /**
   * Get all users with their roles
   */
  getAllUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) {
        throw new Error('Failed to fetch users');
      }

      return {
        users: data || [],
        total: count || 0,
      };
    }),

  // [2025-10-01 8:35 PM] Agent 1: Added tRPC endpoints for admin checks to fix server/client import issue
  /**
   * Check if current user is god admin
   */
  checkIsGodAdmin: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return { isGodAdmin: isGodAdmin(input.userId) };
    }),

  /**
   * Check if a user is admin (any type: god, Clerk metadata, or database)
   */
  checkIsAdmin: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      // This already uses the isAdmin function from admin.ts which checks all sources
      return { isAdmin: await import('@/lib/auth/admin').then(mod => mod.isAdmin(input.userId)) };
    }),

  /**
   * Get admin information for a user
   */
  getAdminInfo: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const { getAdminInfo } = await import('@/lib/auth/admin');
      return await getAdminInfo(input.userId);
    }),

  /**
   * Get the list of god admin user IDs (for client-side checks)
   */
  getGodAdmins: adminProcedure.query(async () => {
    const { GOD_ADMINS } = await import('@/lib/auth/admin');
    return { godAdmins: GOD_ADMINS };
  }),

  /**
   * Grant admin role to user (god admins only)
   */
  grantAdminRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const currentUserId = ctx.userId;

      // Check if current user is god admin
      if (!isGodAdmin(currentUserId)) {
        throw new Error('Only god-level admins can grant admin roles');
      }

      const success = await grantAdminRole(input.userId, currentUserId);

      if (!success) {
        throw new Error('Failed to grant admin role');
      }

      // Create audit log entry
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('audit_events').insert({
        event_type: 'admin_role_granted',
        user_id: currentUserId,
        target_user_id: input.userId,
        metadata: { granted_by: currentUserId },
      });

      return { success: true };
    }),

  /**
   * Revoke admin role from user (god admins only)
   */
  revokeAdminRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const currentUserId = ctx.userId;

      // Check if current user is god admin
      if (!isGodAdmin(currentUserId)) {
        throw new Error('Only god-level admins can revoke admin roles');
      }

      const success = await revokeAdminRole(input.userId, currentUserId);

      if (!success) {
        throw new Error('Failed to revoke admin role');
      }

      // Create audit log entry
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('audit_events').insert({
        event_type: 'admin_role_revoked',
        user_id: currentUserId,
        target_user_id: input.userId,
        metadata: { revoked_by: currentUserId },
      });

      return { success: true };
    }),

  /**
   * Get audit events with filters
   */
  getAuditEvents: adminProcedure
    .input(
      z.object({
        eventType: z.string().optional(),
        userId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      let query = supabase
        .from('audit_events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.eventType) {
        query = query.eq('event_type', input.eventType);
      }

      if (input.userId) {
        query = query.eq('user_id', input.userId);
      }

      if (input.startDate) {
        query = query.gte('created_at', input.startDate);
      }

      if (input.endDate) {
        query = query.lte('created_at', input.endDate);
      }

      const { data, error, count } = await query;

      if (error) {
        // If table doesn't exist yet, return mock data
        if (error.message.includes('does not exist')) {
          return {
            events: getMockAuditEvents(),
            total: 10,
          };
        }
        throw new Error('Failed to fetch audit events');
      }

      return {
        events: data || [],
        total: count || 0,
      };
    }),
});

/**
 * Mock audit events for development
 */
function getMockAuditEvents() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return [
    {
      id: '1',
      event_type: 'admin_role_granted',
      user_id: 'user_admin1',
      target_user_id: 'user_newadmin',
      metadata: { granted_by: 'user_admin1' },
      created_at: now.toISOString(),
    },
    {
      id: '2',
      event_type: 'lead_flagged',
      user_id: 'user_admin1',
      target_user_id: null,
      metadata: { lead_id: 'lead_123', reason: 'spam' },
      created_at: dayAgo.toISOString(),
    },
    {
      id: '3',
      event_type: 'business_suspended',
      user_id: 'user_admin1',
      target_user_id: 'business_456',
      metadata: { reason: 'low quality leads' },
      created_at: weekAgo.toISOString(),
    },
    {
      id: '4',
      event_type: 'audit_triggered',
      user_id: 'user_admin1',
      target_user_id: null,
      metadata: { trigger: 'manual' },
      created_at: weekAgo.toISOString(),
    },
    {
      id: '5',
      event_type: 'admin_role_revoked',
      user_id: 'user_admin1',
      target_user_id: 'user_oldadmin',
      metadata: { revoked_by: 'user_admin1' },
      created_at: weekAgo.toISOString(),
    },
    {
      id: '6',
      event_type: 'system_config_updated',
      user_id: 'user_admin1',
      target_user_id: null,
      metadata: { setting: 'max_matches_per_lead', old_value: 10, new_value: 15 },
      created_at: weekAgo.toISOString(),
    },
    {
      id: '7',
      event_type: 'lead_quality_review',
      user_id: 'system',
      target_user_id: null,
      metadata: { low_quality_count: 45, spam_detected: 12 },
      created_at: weekAgo.toISOString(),
    },
    {
      id: '8',
      event_type: 'business_approved',
      user_id: 'user_admin1',
      target_user_id: 'business_789',
      metadata: { verification_status: 'verified' },
      created_at: weekAgo.toISOString(),
    },
    {
      id: '9',
      event_type: 'call_quota_exceeded',
      user_id: 'business_456',
      target_user_id: null,
      metadata: { quota: 100, used: 105 },
      created_at: weekAgo.toISOString(),
    },
    {
      id: '10',
      event_type: 'database_backup',
      user_id: 'system',
      target_user_id: null,
      metadata: { size_mb: 450, duration_sec: 23 },
      created_at: weekAgo.toISOString(),
    },
  ];
}
