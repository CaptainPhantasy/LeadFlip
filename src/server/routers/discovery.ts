/**
 * Discovery Router - Business discovery and invitation API endpoints
 */

import { z } from 'zod';
import { createTRPCRouter, adminProcedure, publicProcedure } from '../trpc';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const discoveryRouter = createTRPCRouter({
  /**
   * Get all prospective businesses with filters
   */
  getProspects: adminProcedure
    .input(
      z.object({
        serviceCategory: z.string().optional(),
        invitationStatus: z.string().optional(),
        zipCode: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      let query = supabase
        .from('prospective_businesses')
        .select('*', { count: 'exact' })
        .order('discovered_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      // Apply filters
      if (input.serviceCategory) {
        query = query.eq('service_category', input.serviceCategory);
      }

      if (input.invitationStatus) {
        query = query.eq('invitation_status', input.invitationStatus);
      }

      if (input.zipCode) {
        query = query.eq('discovery_zip', input.zipCode);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch prospective businesses: ${error.message}`);
      }

      // Transform snake_case to camelCase for frontend
      const prospects = (data || []).map((row: any) => ({
        id: row.id,
        googlePlaceId: row.google_place_id,
        name: row.name,
        formattedAddress: row.formatted_address,
        formattedPhoneNumber: row.formatted_phone_number,
        internationalPhoneNumber: row.international_phone_number,
        website: row.website,
        latitude: row.latitude,
        longitude: row.longitude,
        zipCode: row.zip_code,
        city: row.city,
        state: row.state,
        rating: row.rating,
        userRatingsTotal: row.user_ratings_total,
        priceLevel: row.price_level,
        businessStatus: row.business_status,
        serviceCategory: row.service_category,
        serviceTypes: row.service_types,
        discoveredAt: row.discovered_at,
        discoverySource: row.discovery_source,
        discoveryZip: row.discovery_zip,
        distanceFromTarget: row.distance_from_target,
        invitationStatus: row.invitation_status,
        invitationSentAt: row.invitation_sent_at,
        invitationClickedAt: row.invitation_clicked_at,
        followUpCount: row.follow_up_count,
        lastFollowUpAt: row.last_follow_up_at,
        activated: row.activated,
        activatedAt: row.activated_at,
        activatedBusinessId: row.activated_business_id,
        qualified: row.qualified,
        disqualificationReason: row.disqualification_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return {
        prospects,
        total: count || 0,
      };
    }),

  /**
   * Get discovery dashboard statistics
   */
  getStats: adminProcedure.query(async () => {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get total counts by status
    const { count: totalDiscovered } = await supabase
      .from('prospective_businesses')
      .select('*', { count: 'exact', head: true });

    const { count: totalInvited } = await supabase
      .from('prospective_businesses')
      .select('*', { count: 'exact', head: true })
      .eq('invitation_status', 'invited');

    const { count: totalClicked } = await supabase
      .from('prospective_businesses')
      .select('*', { count: 'exact', head: true })
      .eq('invitation_status', 'clicked');

    const { count: totalActivated } = await supabase
      .from('prospective_businesses')
      .select('*', { count: 'exact', head: true })
      .eq('activated', true);

    // Get breakdown by service category
    const { data: categoryBreakdown } = await supabase
      .from('prospective_businesses')
      .select('service_category, invitation_status, activated')
      .order('service_category');

    // Count by category
    const categoryStatsMap: Record<string, { discovered: number; invited: number; activated: number }> = {};

    if (categoryBreakdown) {
      for (const item of categoryBreakdown) {
        if (!categoryStatsMap[item.service_category]) {
          categoryStatsMap[item.service_category] = { discovered: 0, invited: 0, activated: 0 };
        }
        categoryStatsMap[item.service_category].discovered += 1;

        if (item.invitation_status === 'invited' || item.invitation_status === 'clicked' || item.invitation_status === 'activated') {
          categoryStatsMap[item.service_category].invited += 1;
        }

        if (item.activated) {
          categoryStatsMap[item.service_category].activated += 1;
        }
      }
    }

    // Get breakdown by market (ZIP code)
    const { data: marketBreakdown } = await supabase
      .from('prospective_businesses')
      .select('discovery_zip, city, invitation_status, activated')
      .order('discovery_zip');

    // Count by market
    const marketStatsMap: Record<string, { zipCode: string; name: string; discovered: number; invited: number; activated: number }> = {};

    if (marketBreakdown) {
      for (const item of marketBreakdown) {
        const zip = item.discovery_zip;
        if (!marketStatsMap[zip]) {
          marketStatsMap[zip] = {
            zipCode: zip,
            name: item.city || zip,
            discovered: 0,
            invited: 0,
            activated: 0
          };
        }
        marketStatsMap[zip].discovered += 1;

        if (item.invitation_status === 'invited' || item.invitation_status === 'clicked' || item.invitation_status === 'activated') {
          marketStatsMap[zip].invited += 1;
        }

        if (item.activated) {
          marketStatsMap[zip].activated += 1;
        }
      }
    }

    // Get next actions - businesses that need follow-up
    const { data: needsFollowUp } = await supabase
      .from('prospective_businesses')
      .select('id, name, invitation_sent_at, follow_up_count')
      .in('invitation_status', ['invited', 'clicked'])
      .lt('follow_up_count', 3);

    // Get businesses that clicked but haven't activated
    const { data: clickedNotActivated } = await supabase
      .from('prospective_businesses')
      .select('id, name, invitation_clicked_at')
      .eq('invitation_status', 'clicked')
      .eq('activated', false);

    // Convert category stats map to array
    const SERVICE_CATEGORY_LABELS: Record<string, string> = {
      plumbing: 'Plumbing',
      hvac: 'HVAC',
      electrical: 'Electrical',
      roofing: 'Roofing',
      landscaping: 'Landscaping/Lawn Care',
      pest_control: 'Pest Control',
      cleaning: 'Cleaning Services',
      painting: 'Painting',
      carpentry: 'Carpentry/Handyman',
      appliance_repair: 'Appliance Repair',
      general_contractor: 'General Contractors',
    };

    const byServiceCategory = Object.entries(categoryStatsMap).map(([category, stats]) => ({
      category: category as any,
      displayName: SERVICE_CATEGORY_LABELS[category] || category,
      discovered: stats.discovered,
      invited: stats.invited,
      activated: stats.activated,
    }));

    // Convert market stats map to array
    const byMarket = Object.values(marketStatsMap);

    // Convert next actions to array
    const nextActions: any[] = [];

    if (needsFollowUp && needsFollowUp.length > 0) {
      nextActions.push({
        type: 'follow_up',
        count: needsFollowUp.length,
        description: `${needsFollowUp.length} businesses need follow-up`,
        scheduledFor: null,
      });
    }

    if (clickedNotActivated && clickedNotActivated.length > 0) {
      nextActions.push({
        type: 'clicked_not_activated',
        count: clickedNotActivated.length,
        description: `${clickedNotActivated.length} clicked but not activated`,
        scheduledFor: null,
      });
    }

    return {
      totalDiscovered: totalDiscovered || 0,
      totalInvited: totalInvited || 0,
      totalClicked: totalClicked || 0,
      totalActivated: totalActivated || 0,
      byMarket,
      byServiceCategory,
      nextActions,
    };
  }),

  /**
   * Trigger manual discovery scan for a ZIP code and service category
   */
  triggerScan: adminProcedure
    .input(
      z.object({
        zipCode: z.string(),
        serviceCategory: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      console.log(`[Discovery] Manual scan triggered for ${input.serviceCategory} in ${input.zipCode}`);

      // Import discovery scan logic
      const { runDiscoveryScan } = await import('@/lib/discovery/scan');

      try {
        // Run discovery scan directly (not through BullMQ for manual scans)
        const result = await runDiscoveryScan({
          zipCode: input.zipCode,
          serviceCategory: input.serviceCategory,
          radius: 10, // 10 miles default
        });

        return {
          success: true,
          message: `Discovery scan completed for ${input.serviceCategory} in ${input.zipCode}`,
          result: {
            totalResults: result.totalResults,
            discovered: result.discovered,
            filteredOut: result.filteredOut,
            duplicates: result.duplicates,
          },
        };
      } catch (error) {
        console.error('[Discovery] Scan failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Discovery scan failed: ${errorMessage}`);
      }
    }),

  /**
   * Send invitation to a prospective business
   */
  sendInvitation: adminProcedure
    .input(
      z.object({
        prospectiveBusinessId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get business details
      const { data: prospect, error: fetchError } = await supabase
        .from('prospective_businesses')
        .select('*')
        .eq('id', input.prospectiveBusinessId)
        .single();

      if (fetchError || !prospect) {
        throw new Error('Prospective business not found');
      }

      // Check if already invited
      if (prospect.invitation_status !== 'pending') {
        throw new Error(`Business already has status: ${prospect.invitation_status}`);
      }

      // TODO: Queue invitation job in BullMQ
      // For now, update status directly
      // This will be implemented by Agent 3 (BullMQ Jobs) and Agent 4 (Email System)

      const { data, error } = await supabase
        .from('prospective_businesses')
        .update({
          invitation_status: 'invited',
          invitation_sent_at: new Date().toISOString(),
        })
        .eq('id', input.prospectiveBusinessId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to send invitation: ${error.message}`);
      }

      try {
        const { Queue } = await import('bullmq');
        const Redis = await import('ioredis');

        const connection = new Redis.default(process.env.UPSTASH_REDIS_REST_URL || '');
        const invitationQueue = new Queue('invitations', { connection });

        await invitationQueue.add('send-invitation', {
          prospectiveBusinessId: input.prospectiveBusinessId,
        });
      } catch (error) {
        console.warn('BullMQ not configured yet, invitation not queued:', error);
      }

      return {
        success: true,
        prospect: data,
        message: `Invitation sent to ${prospect.name}`,
      };
    }),

  /**
   * Mark business as disqualified
   */
  disqualify: adminProcedure
    .input(
      z.object({
        prospectiveBusinessId: z.string().uuid(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('prospective_businesses')
        .update({
          qualified: false,
          disqualification_reason: input.reason,
          invitation_status: 'declined', // Mark as declined to prevent future invitations
        })
        .eq('id', input.prospectiveBusinessId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to disqualify business: ${error.message}`);
      }

      return {
        success: true,
        prospect: data,
        message: 'Business marked as disqualified',
      };
    }),

  /**
   * Track invitation click (public endpoint, no auth required)
   * Called when business clicks invitation link
   */
  trackClick: publicProcedure
    .input(
      z.object({
        prospectId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Update invitation status to 'clicked'
      const { data, error } = await supabase
        .from('prospective_businesses')
        .update({
          invitation_status: 'clicked',
          invitation_clicked_at: new Date().toISOString(),
        })
        .eq('id', input.prospectId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to track click: ${error.message}`);
      }

      return {
        success: true,
        prospect: data,
      };
    }),
});
