/**
 * Call Router - AI Call Management API
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, adminProcedure } from '../trpc';
import { createClient } from '@supabase/supabase-js';
import { queueCall } from '../queue/config';
import { CallAgentSubagent } from '@/lib/agents/call-agent';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const anthropicKey = process.env.ANTHROPIC_API_KEY!;

export const callRouter = createTRPCRouter({
  /**
   * Initiate AI call (business or consumer)
   */
  initiate: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        callType: z.enum(['qualify_lead', 'confirm_appointment', 'follow_up', 'consumer_callback']),
        objective: z.string().min(10),
        phoneNumber: z.string(),
        scheduledTime: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // 1. Get lead details
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*, businesses(*)')
        .eq('id', input.leadId)
        .single();

      if (leadError || !lead) {
        throw new Error('Lead not found');
      }

      // 2. Verify permissions (consumer owns lead OR business matched to lead)
      const { data: match } = await supabase
        .from('matches')
        .select('business_id')
        .eq('lead_id', input.leadId)
        .single();

      const isOwner = lead.user_id === ctx.userId;
      const isMatchedBusiness = match?.business_id === ctx.userId;

      if (!isOwner && !isMatchedBusiness) {
        throw new Error('Unauthorized');
      }

      // 3. Generate system prompt
      const callAgent = new CallAgentSubagent(anthropicKey, supabaseUrl, supabaseKey);

      const callContext = {
        call_id: '', // Will be set after DB insert
        lead_id: input.leadId,
        business_id: match?.business_id,
        consumer_id: lead.user_id,
        objective: input.objective,
        call_type: input.callType,
        lead_details: {
          service_category: lead.service_category,
          problem_text: lead.problem_text,
          urgency: lead.urgency,
          budget_max: lead.budget_max,
          location_zip: lead.location_zip,
        },
        business_details: lead.businesses
          ? {
              name: lead.businesses.name,
              phone_number: lead.businesses.phone_number,
            }
          : undefined,
        consumer_details: {
          phone_number: input.phoneNumber,
        },
      };

      const systemPrompt = callAgent.generateSystemPrompt(callContext);

      // 4. Create call record
      const { data: callRecord, error: callError } = await supabase
        .from('calls')
        .insert({
          lead_id: input.leadId,
          business_id: match?.business_id,
          consumer_id: lead.user_id,
          call_type: input.callType,
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

      // 5. Queue call job
      await queueCall({
        call_id: callRecord.id,
        lead_id: input.leadId,
        business_id: match?.business_id,
        consumer_id: lead.user_id,
        phone_number: input.phoneNumber,
        call_type: input.callType,
        objective: input.objective,
        system_prompt: systemPrompt,
        scheduled_time: input.scheduledTime,
        attempt_number: 1,
      });

      return {
        call_id: callRecord.id,
        status: 'queued',
        message: input.scheduledTime
          ? `Call scheduled for ${input.scheduledTime}`
          : 'Call queued for immediate processing',
      };
    }),

  /**
   * Get call by ID
   */
  getById: protectedProcedure
    .input(z.object({ callId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('id', input.callId)
        .single();

      if (error) {
        throw new Error('Call not found');
      }

      // Verify permissions
      if (data.consumer_id !== ctx.userId && data.business_id !== ctx.userId) {
        throw new Error('Unauthorized');
      }

      return data;
    }),

  /**
   * Get calls for a lead
   */
  getByLead: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Verify lead access
      const { data: lead } = await supabase
        .from('leads')
        .select('user_id')
        .eq('id', input.leadId)
        .single();

      if (!lead || lead.user_id !== ctx.userId) {
        throw new Error('Unauthorized');
      }

      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('lead_id', input.leadId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error('Failed to fetch calls');
      }

      return data;
    }),

  /**
   * Get transcript for a call
   */
  getTranscript: protectedProcedure
    .input(z.object({ callId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('calls')
        .select('transcript, consumer_id, business_id')
        .eq('id', input.callId)
        .single();

      if (error) {
        throw new Error('Call not found');
      }

      // Verify permissions
      if (data.consumer_id !== ctx.userId && data.business_id !== ctx.userId) {
        throw new Error('Unauthorized');
      }

      return {
        transcript: data.transcript,
      };
    }),

  /**
   * Get recording URL (signed, temporary)
   */
  getRecording: protectedProcedure
    .input(z.object({ callId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('calls')
        .select('recording_url, consumer_id, business_id')
        .eq('id', input.callId)
        .single();

      if (error) {
        throw new Error('Call not found');
      }

      // Verify permissions
      if (data.consumer_id !== ctx.userId && data.business_id !== ctx.userId) {
        throw new Error('Unauthorized');
      }

      if (!data.recording_url) {
        throw new Error('Recording not available');
      }

      // Generate signed URL (valid for 1 hour)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('call-recordings')
        .createSignedUrl(data.recording_url, 3600);

      if (signedError) {
        throw new Error('Failed to generate recording URL');
      }

      return {
        url: signedData.signedUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      };
    }),

  /**
   * Cancel scheduled call
   */
  cancel: protectedProcedure
    .input(z.object({ callId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: call } = await supabase
        .from('calls')
        .select('status, consumer_id, business_id')
        .eq('id', input.callId)
        .single();

      if (!call) {
        throw new Error('Call not found');
      }

      // Verify permissions
      if (call.consumer_id !== ctx.userId && call.business_id !== ctx.userId) {
        throw new Error('Unauthorized');
      }

      // Only queued or scheduled calls can be cancelled
      if (call.status !== 'queued' && call.status !== 'scheduled') {
        throw new Error('Cannot cancel call in current status');
      }

      // Update status
      const { error } = await supabase
        .from('calls')
        .update({ status: 'cancelled' })
        .eq('id', input.callId);

      if (error) {
        throw new Error('Failed to cancel call');
      }

      // TODO: Remove from BullMQ queue

      return {
        success: true,
        message: 'Call cancelled',
      };
    }),

  /**
   * Get call statistics
   */
  getStats: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      const callAgent = new CallAgentSubagent(anthropicKey, supabaseUrl, supabaseKey);
      return callAgent.getCallStats(input.days);
    }),

  /**
   * Admin: Get all calls with filters
   */
  adminGetAll: adminProcedure
    .input(
      z.object({
        status: z.string().optional(),
        callType: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      let query = supabase
        .from('calls')
        .select('*, leads(problem_text), businesses(name)')
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.status) {
        query = query.eq('status', input.status);
      }

      if (input.callType) {
        query = query.eq('call_type', input.callType);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error('Failed to fetch calls');
      }

      return data;
    }),

  /**
   * Admin: Get call costs summary
   */
  adminGetCosts: adminProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('calls')
        .select('duration_seconds, status')
        .gte('created_at', new Date(Date.now() - input.days * 24 * 60 * 60 * 1000).toISOString())
        .eq('status', 'completed');

      if (error) {
        throw new Error('Failed to fetch call costs');
      }

      // Cost calculation (from CLAUDE.md)
      const TWILIO_COST_PER_MIN = 0.014;
      const OPENAI_COST_PER_MIN = 0.9; // $0.06 input + $0.24 output
      const CLAUDE_COST_PER_CALL = 0.03;
      const TOTAL_COST_PER_MIN = TWILIO_COST_PER_MIN + OPENAI_COST_PER_MIN;

      const totalMinutes = data.reduce((sum, call) => sum + (call.duration_seconds || 0) / 60, 0);
      const totalCalls = data.length;
      const estimatedCost =
        totalMinutes * TOTAL_COST_PER_MIN + totalCalls * CLAUDE_COST_PER_CALL;

      return {
        totalCalls,
        totalMinutes: Math.round(totalMinutes),
        avgMinutesPerCall: (totalMinutes / totalCalls).toFixed(2),
        estimatedCost: estimatedCost.toFixed(2),
        breakdown: {
          twilio: (totalMinutes * TWILIO_COST_PER_MIN).toFixed(2),
          openai: (totalMinutes * OPENAI_COST_PER_MIN).toFixed(2),
          claude: (totalCalls * CLAUDE_COST_PER_CALL).toFixed(2),
        },
      };
    }),
});
