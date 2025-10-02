/**
 * Lead Router - Consumer-facing API endpoints
 */

import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';
import { processConsumerLead } from '@/lib/agents/main-orchestrator';
import { createClient } from '@supabase/supabase-js';
import { queueCall } from '../queue/config';
import { CallAgentSubagent } from '@/lib/agents/call-agent';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use service role key for server-side operations since RLS is disabled
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const anthropicKey = process.env.ANTHROPIC_API_KEY!;

export const leadRouter = createTRPCRouter({
  /**
   * Submit new consumer lead
   */
  submit: protectedProcedure
    .input(
      z.object({
        problemText: z.string().min(10, 'Please describe your problem in at least 10 characters'),
        contactPhone: z.string().optional(),
        contactEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await processConsumerLead({
        consumer_id: ctx.userId,
        problem_text: input.problemText,
        contact_phone: input.contactPhone,
        contact_email: input.contactEmail,
      });

      return result;
    }),

  /**
   * Get lead by ID
   */
  getById: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', input.leadId)
        .eq('user_id', ctx.userId) // Only owner can view
        .single();

      if (error) {
        throw new Error('Lead not found');
      }

      return data;
    }),

  /**
   * Get all leads for current user
   */
  getMyLeads: protectedProcedure.query(async ({ ctx }) => {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch leads');
    }

    return data;
  }),

  /**
   * Get matches for a lead
   */
  getMatches: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // First verify ownership
      const { data: lead } = await supabase
        .from('leads')
        .select('user_id')
        .eq('id', input.leadId)
        .single();

      if (!lead || lead.user_id !== ctx.userId) {
        throw new Error('Unauthorized');
      }

      // Get matches with business details
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          businesses (
            id,
            name,
            rating,
            service_categories,
            years_in_business
          )
        `)
        .eq('lead_id', input.leadId)
        .order('confidence_score', { ascending: false });

      if (error) {
        throw new Error('Failed to fetch matches');
      }

      return data;
    }),

  /**
   * Request AI callback from business
   */
  requestCallback: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        businessId: z.string().uuid(),
        preferredTime: z.string().optional(),
        objective: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Verify ownership of lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('user_id, contact_phone, problem_text, service_category, urgency, budget_max, location_zip')
        .eq('id', input.leadId)
        .single();

      if (leadError || !lead || lead.user_id !== ctx.userId) {
        throw new Error('Unauthorized');
      }

      // Verify consumer has phone number
      if (!lead.contact_phone) {
        throw new Error('Phone number required for callback');
      }

      // Get business details
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, phone_number')
        .eq('id', input.businessId)
        .single();

      if (businessError || !business) {
        throw new Error('Business not found');
      }

      // Verify business is matched to this lead
      const { data: match } = await supabase
        .from('matches')
        .select('status')
        .eq('lead_id', input.leadId)
        .eq('business_id', input.businessId)
        .single();

      if (!match) {
        throw new Error('Business is not matched to this lead');
      }

      if (match.status !== 'interested') {
        throw new Error('Business has not accepted this lead');
      }

      // Initialize call agent to generate system prompt
      const callAgent = new CallAgentSubagent(anthropicKey, supabaseUrl, supabaseKey);

      const defaultObjective = `Call consumer to discuss their ${lead.service_category} needs and schedule a consultation`;
      const callContext = {
        call_id: '', // Will be set after DB insert
        lead_id: input.leadId,
        business_id: business.id,
        consumer_id: lead.user_id,
        objective: input.objective || defaultObjective,
        call_type: 'consumer_callback' as const,
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
          phone_number: lead.contact_phone,
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
          call_type: 'consumer_callback',
          objective: input.objective || defaultObjective,
          status: 'queued',
          system_prompt: systemPrompt,
          scheduled_time: input.preferredTime,
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
        phone_number: lead.contact_phone,
        call_type: 'consumer_callback',
        objective: input.objective || defaultObjective,
        system_prompt: systemPrompt,
        scheduled_time: input.preferredTime,
        attempt_number: 1,
      });

      return {
        success: true,
        call_id: callRecord.id,
        message: input.preferredTime
          ? `Callback scheduled for ${input.preferredTime}`
          : 'Callback request queued for immediate processing',
        queued_at: callRecord.created_at,
      };
    }),

  /**
   * Get lead statistics for consumer
   */
  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: leads } = await supabase
      .from('leads')
      .select('*, matches(*)')
      .eq('user_id', ctx.userId);

    const totalLeads = leads?.length || 0;
    const matchedLeads = leads?.filter((l) => l.status === 'matched').length || 0;
    const totalMatches = leads?.reduce((sum, l) => sum + (l.matches?.length || 0), 0) || 0;
    const avgQualityScore =
      leads?.reduce((sum, l) => sum + (l.quality_score || 0), 0) / totalLeads || 0;

    return {
      totalLeads,
      matchedLeads,
      totalMatches,
      avgQualityScore: avgQualityScore.toFixed(2),
      matchRate: totalLeads > 0 ? ((matchedLeads / totalLeads) * 100).toFixed(1) + '%' : '0%',
    };
  }),
});
