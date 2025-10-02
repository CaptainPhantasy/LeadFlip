/**
 * Business Router - Business-facing API endpoints
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { createClient } from '@supabase/supabase-js';
import { queueCall } from '../queue/config';
import { CallAgentSubagent } from '@/lib/agents/call-agent';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service role key for server-side operations
// This bypasses RLS, so we enforce auth at the application level via Clerk
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const anthropicKey = process.env.ANTHROPIC_API_KEY!;

export const businessRouter = createTRPCRouter({
  /**
   * Register new business profile
   */
  register: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        serviceCategories: z.array(z.string()).min(1),
        phoneNumber: z.string(),
        email: z.string().email(),
        address: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        description: z.string().optional(),
        priceTier: z.enum(['budget', 'standard', 'premium']).default('standard'),
        offersEmergencyService: z.boolean().default(false),
        isLicensed: z.boolean().default(false),
        isInsured: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      console.log('[BusinessRouter] Attempting to insert business:', {
        user_id: ctx.userId,
        name: input.name,
        service_categories: input.serviceCategories,
      });

      const { data, error } = await supabase
        .from('businesses')
        .insert({
          user_id: ctx.userId,
          name: input.name,
          service_categories: input.serviceCategories,
          phone_number: input.phoneNumber,
          email: input.email,
          address: input.address,
          city: input.city,
          state: input.state,
          zip_code: input.zipCode,
          location: `POINT(${input.longitude} ${input.latitude})`,
          description: input.description,
          price_tier: input.priceTier,
          offers_emergency_service: input.offersEmergencyService,
          is_licensed: input.isLicensed,
          is_insured: input.isInsured,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('[BusinessRouter] Database error:', error);
        throw new Error(`Failed to register business: ${error.message}`);
      }

      console.log('[BusinessRouter] Business registered successfully:', data.id);

      return data;
    }),

  /**
   * Get matched leads for business
   */
  getLeads: protectedProcedure
    .input(
      z.object({
        status: z.enum(['active', 'accepted', 'declined', 'converted']).optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get business ID for current user
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', ctx.userId)
        .single();

      if (businessError || !business) {
        // Return empty array instead of throwing error
        // This allows the UI to handle the "no profile" state gracefully
        return [];
      }

      // Get matches with lead details
      let query = supabase
        .from('matches')
        .select(`
          *,
          leads (
            id,
            problem_text,
            service_category,
            urgency,
            budget_max,
            location_zip,
            quality_score,
            created_at
          )
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (input.status) {
        query = query.eq('status', input.status);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error('Failed to fetch leads');
      }

      return data;
    }),

  /**
   * Respond to lead (accept/decline)
   */
  respondToLead: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        response: z.enum(['accept', 'decline']),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get business ID
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', ctx.userId)
        .single();

      if (!business) {
        throw new Error('Business profile not found');
      }

      // Find the match record using leadId + business_id
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('id')
        .eq('lead_id', input.leadId)
        .eq('business_id', business.id)
        .single();

      if (matchError || !match) {
        throw new Error('Match not found for this lead and business');
      }

      // Update match status
      const { data, error } = await supabase
        .from('matches')
        .update({
          status: input.response === 'accept' ? 'accepted' : 'declined',
          responded_at: new Date().toISOString(),
          response_message: input.message,
        })
        .eq('id', match.id)
        .eq('business_id', business.id)
        .select()
        .single();

      if (error) {
        throw new Error('Failed to update match');
      }

      return data;
    }),

  /**
   * Request AI to call consumer on behalf of business
   */
  requestAICall: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        objective: z.string().min(10, 'Objective must be at least 10 characters'),
        scheduledTime: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get business ID and details
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, phone_number')
        .eq('user_id', ctx.userId)
        .single();

      if (businessError || !business) {
        throw new Error('Business profile not found');
      }

      // Get lead details and verify business is matched to this lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*, matches!inner(business_id, status)')
        .eq('id', input.leadId)
        .eq('matches.business_id', business.id)
        .single();

      if (leadError || !lead) {
        throw new Error('Lead not found or not matched to your business');
      }

      // Verify match is active
      const match = Array.isArray(lead.matches) ? lead.matches[0] : lead.matches;
      if (match.status !== 'interested') {
        throw new Error('You must accept this lead before requesting a call');
      }

      // Get consumer phone number
      const consumerPhone = lead.contact_phone;
      if (!consumerPhone) {
        throw new Error('Consumer phone number not available');
      }

      // Initialize call agent to generate system prompt
      const callAgent = new CallAgentSubagent(anthropicKey, supabaseUrl, supabaseKey);

      const callContext = {
        call_id: '', // Will be set after DB insert
        lead_id: input.leadId,
        business_id: business.id,
        consumer_id: lead.user_id,
        objective: input.objective,
        call_type: 'qualify_lead' as const,
        lead_details: {
          service_category: lead.service_category,
          problem_text: lead.problem_text,
          urgency: lead.urgency,
          budget_max: lead.budget_max,
          location_zip: lead.location_zip,
        },
        business_details: {
          name: business.name,
          phone_number: business.phone_number,
        },
        consumer_details: {
          phone_number: consumerPhone,
        },
      };

      const systemPrompt = callAgent.generateSystemPrompt(callContext);

      // Create call record in database
      const { data: callRecord, error: callError } = await supabase
        .from('calls')
        .insert({
          lead_id: input.leadId,
          business_id: business.id,
          consumer_id: lead.user_id,
          call_type: 'qualify_lead',
          objective: input.objective,
          status: 'queued',
          system_prompt: systemPrompt,
          scheduled_time: input.scheduledTime,
        })
        .select()
        .single();

      if (callError || !callRecord) {
        throw new Error('Failed to create call record');
      }

      // Queue the call job
      await queueCall({
        call_id: callRecord.id,
        lead_id: input.leadId,
        business_id: business.id,
        consumer_id: lead.user_id,
        phone_number: consumerPhone,
        call_type: 'qualify_lead',
        objective: input.objective,
        system_prompt: systemPrompt,
        scheduled_time: input.scheduledTime,
        attempt_number: 1,
      });

      return {
        success: true,
        call_id: callRecord.id,
        message: input.scheduledTime
          ? `AI call scheduled for ${input.scheduledTime}`
          : 'AI call queued for immediate processing',
        queued_at: callRecord.created_at,
      };
    }),

  /**
   * Update notification capacity (pause/resume)
   */
  updateCapacity: protectedProcedure
    .input(
      z.object({
        notificationsPaused: z.boolean(),
        maxMonthlyLeads: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('businesses')
        .update({
          notifications_paused: input.notificationsPaused,
          max_monthly_leads: input.maxMonthlyLeads,
        })
        .eq('user_id', ctx.userId)
        .select()
        .single();

      if (error) {
        throw new Error('Failed to update capacity');
      }

      return data;
    }),

  /**
   * Get business profile
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', ctx.userId)
      .single();

    if (error) {
      // Return null instead of throwing error
      // This allows the UI to show a "Create Profile" prompt
      return null;
    }

    return data;
  }),

  /**
   * Update business profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        serviceCategories: z.array(z.string()).optional(),
        phoneNumber: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        description: z.string().optional(),
        priceTier: z.enum(['budget', 'standard', 'premium']).optional(),
        offersEmergencyService: z.boolean().optional(),
        isLicensed: z.boolean().optional(),
        isInsured: z.boolean().optional(),
        notificationsPaused: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Build update object with only provided fields
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.serviceCategories !== undefined) updateData.service_categories = input.serviceCategories;
      if (input.phoneNumber !== undefined) updateData.phone_number = input.phoneNumber;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.city !== undefined) updateData.city = input.city;
      if (input.state !== undefined) updateData.state = input.state;
      if (input.zipCode !== undefined) updateData.zip_code = input.zipCode;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.priceTier !== undefined) updateData.price_tier = input.priceTier;
      if (input.offersEmergencyService !== undefined) updateData.offers_emergency_service = input.offersEmergencyService;
      if (input.isLicensed !== undefined) updateData.is_licensed = input.isLicensed;
      if (input.isInsured !== undefined) updateData.is_insured = input.isInsured;
      if (input.notificationsPaused !== undefined) updateData.notifications_paused = input.notificationsPaused;

      const { data, error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('user_id', ctx.userId)
        .select()
        .single();

      if (error) {
        throw new Error('Failed to update profile');
      }

      return data;
    }),

  /**
   * Get business statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get business ID for current user
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', ctx.userId)
      .single();

    if (businessError || !business) {
      // Return default stats if no business profile exists
      return {
        totalLeads: 0,
        pendingLeads: 0,
        acceptedLeads: 0,
        declinedLeads: 0,
        responseRate: '0%',
      };
    }

    // Get all matches for this business
    const { data: matches, error } = await supabase
      .from('matches')
      .select('status')
      .eq('business_id', business.id);

    if (error) {
      throw new Error('Failed to fetch matches');
    }

    // Count different statuses
    const totalLeads = matches?.length || 0;
    const pendingLeads =
      matches?.filter((m) => !m.status || m.status === 'pending').length || 0;
    const acceptedLeads =
      matches?.filter((m) => m.status === 'accepted').length || 0;
    const declinedLeads =
      matches?.filter((m) => m.status === 'declined').length || 0;

    // Calculate response rate (accepted + declined / total)
    const respondedLeads = acceptedLeads + declinedLeads;
    const responseRate =
      totalLeads > 0
        ? `${Math.round((respondedLeads / totalLeads) * 100)}%`
        : '0%';

    return {
      totalLeads,
      pendingLeads,
      acceptedLeads,
      declinedLeads,
      responseRate,
    };
  }),
});
