/**
 * Interview Router - AI-Powered Conversational Lead Intake
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { ProblemInterviewAgent } from '@/lib/agents/problem-interview-agent';
import { observable } from '@trpc/server/observable';

// Singleton agent instance (reused across requests)
let interviewAgent: ProblemInterviewAgent | null = null;

function getInterviewAgent() {
  if (!interviewAgent) {
    interviewAgent = new ProblemInterviewAgent();
  }
  return interviewAgent;
}

export const interviewRouter = createTRPCRouter({
  /**
   * Start a new conversational interview session
   */
  startInterview: protectedProcedure
    .input(
      z.object({
        initialMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log('[Interview Router] startInterview called for userId:', ctx.userId);

      const agent = getInterviewAgent();

      const result = await agent.startInterview(ctx.userId, input.initialMessage);

      console.log('[Interview Router] Session created:', result.session_id);
      console.log('[Interview Router] Total active sessions:', (agent as any).sessions?.size);

      return {
        session_id: result.session_id,
        greeting: result.greeting,
      };
    }),

  /**
   * Send a message and stream the AI response in real-time
   * This uses tRPC subscriptions for streaming
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        message: z.string().min(1).max(2000),
      })
    )
    .subscription(async ({ input }) => {
      const agent = getInterviewAgent();

      return observable<{
        type: 'thinking' | 'text' | 'tool_use' | 'complete';
        content: string;
        thinking?: string;
        extracted_info?: any;
        is_complete?: boolean;
      }>((emit) => {
        (async () => {
          try {
            for await (const chunk of agent.processMessageStream(
              input.sessionId,
              input.message
            )) {
              emit.next(chunk);
            }

            emit.complete();
          } catch (error) {
            emit.error(
              new Error(
                `Interview stream failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              )
            );
          }
        })();
      });
    }),

  /**
   * Non-streaming version (fallback for clients that don't support subscriptions)
   */
  sendMessageSync: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        message: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log('[Interview Router] sendMessageSync called:', {
        sessionId: input.sessionId,
        message: input.message.substring(0, 50),
        userId: ctx.userId
      });

      const agent = getInterviewAgent();

      // Check if session exists (load from disk if needed)
      const session = await agent.getSessionAsync(input.sessionId);
      console.log('[Interview Router] Session exists:', !!session);

      if (!session) {
        console.error('[Interview Router] Session not found');
        throw new Error('Interview session not found. Please refresh the page and start again.');
      }

      const result = await agent.processMessage(input.sessionId, input.message);

      console.log('[Interview Router] Response generated:', {
        hasText: !!result.text,
        textLength: result.text.length,
        isComplete: result.is_complete
      });

      return {
        text: result.text,
        thinking: result.thinking,
        extracted_info: result.extracted_info,
        is_complete: result.is_complete,
      };
    }),

  /**
   * Get current interview session state
   */
  getSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(({ input }) => {
      const agent = getInterviewAgent();
      const session = agent.getSession(input.sessionId);

      if (!session) {
        throw new Error('Interview session not found');
      }

      return {
        session_id: session.session_id,
        messages: session.messages,
        extracted_info: session.extracted_info,
        is_complete: session.is_complete,
        quality_score: session.quality_score,
      };
    }),

  /**
   * Finalize interview and submit as a lead
   */
  finalizeInterview: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = getInterviewAgent();

      const extractedInfo = await agent.finalizeInterview(input.sessionId);

      // Get user details from Clerk to use as fallback contact info
      const { clerkClient } = await import('@clerk/nextjs/server');
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(ctx.userId);

      // Merge extracted info with Clerk user data (extracted info takes priority)
      const contactPhone = extractedInfo.contact_phone || user.phoneNumbers?.[0]?.phoneNumber;
      const contactEmail = extractedInfo.contact_email || user.emailAddresses?.[0]?.emailAddress;

      // Validate we have at least one contact method
      if (!contactPhone && !contactEmail) {
        throw new Error('Contact information is required. Please provide a phone number or email.');
      }

      // Submit as a lead via the lead router
      // (This will trigger the full orchestration: classify → match → notify)
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          user_id: ctx.userId,
          problem_text: extractedInfo.problem_description,
          service_category: extractedInfo.service_category,
          urgency: extractedInfo.urgency,
          budget_min: extractedInfo.budget_min || 0,
          budget_max: extractedInfo.budget_max,
          location_zip: extractedInfo.location_zip,
          location_city: extractedInfo.location_city,
          location_state: extractedInfo.location_state,
          contact_phone: contactPhone,
          contact_email: contactEmail,
          quality_score: agent.getSession(input.sessionId)?.quality_score || 0,
          status: 'pending',
          classified_data: extractedInfo,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create lead: ${error.message}`);
      }

      return {
        lead_id: lead.id,
        extracted_info: extractedInfo,
      };
    }),
});
