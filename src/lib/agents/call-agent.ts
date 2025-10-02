/**
 * Call Agent Subagent
 *
 * Purpose: Make autonomous outbound calls to qualify leads or reach consumers
 *
 * Use Cases:
 * 1. Business wants AI to call consumer to qualify need
 * 2. Consumer requests callback from matched business
 * 3. Follow-up call to confirm appointment/quote acceptance
 *
 * Integration:
 * - BullMQ for job queuing
 * - WebSocket server for audio streaming
 * - Twilio for telephony
 * - OpenAI Realtime API for voice
 * - Claude API for reasoning
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export interface CallContext {
  call_id: string;
  lead_id: string;
  business_id?: string;
  consumer_id?: string;
  objective: string;
  call_type: 'qualify_lead' | 'confirm_appointment' | 'follow_up' | 'consumer_callback';
  lead_details: {
    service_category: string;
    problem_text: string;
    urgency: string;
    budget_max: number;
    location_zip: string;
  };
  business_details?: {
    name: string;
    phone_number: string;
  };
  consumer_details?: {
    name?: string;
    phone_number: string;
  };
}

export interface CallOutcome {
  status: 'goal_achieved' | 'no_answer' | 'voicemail' | 'declined' | 'error';
  summary: string;
  transcript: string;
  next_action?: string;
  appointment_time?: string;
  quote_amount?: number;
  consumer_interest_level?: 'high' | 'medium' | 'low' | 'none';
}

export interface ReasoningRequest {
  conversation_history: Array<{
    role: 'assistant' | 'user';
    content: string;
  }>;
  current_situation: string;
  question: string;
}

export class CallAgentSubagent {
  private anthropic: Anthropic;
  private supabase;

  constructor(apiKey: string, supabaseUrl: string, supabaseKey: string) {
    this.anthropic = new Anthropic({ apiKey });
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate system prompt for OpenAI Realtime API
   */
  generateSystemPrompt(context: CallContext): string {
    const { call_type, lead_details, business_details } = context;

    const baseInstructions = `You are a professional AI assistant making a phone call on behalf of LeadFlip, a local services marketplace.

CRITICAL RULES:
1. ALWAYS identify yourself as an AI assistant in the first 10 seconds
2. Be polite, professional, and concise
3. If asked for a human, offer to have someone call back within 1 hour
4. Never make promises about pricing without business confirmation
5. Respect "Do Not Call" requests immediately
6. If voicemail detected, leave brief message and end call
7. Maximum call duration: 5 minutes

VOICE STYLE:
- Speak naturally with slight pauses
- Use conversational language
- Mirror the other person's pace
- Be empathetic and understanding
- Avoid robotic or scripted tone`;

    let specificInstructions = '';

    switch (call_type) {
      case 'qualify_lead':
        specificInstructions = `
CALL OBJECTIVE: Qualify this lead for ${business_details?.name}

LEAD DETAILS:
- Service needed: ${lead_details.service_category}
- Problem: ${lead_details.problem_text}
- Location: ${lead_details.location_zip}
- Budget: Up to $${lead_details.budget_max}
- Urgency: ${lead_details.urgency}

YOUR SCRIPT:
1. Introduction (10 sec): "Hi, this is an AI assistant calling from LeadFlip on behalf of ${business_details?.name}. Is this a good time for a quick 2-minute call about your ${lead_details.service_category} request?"

2. If YES → Qualification Questions (2-3 min):
   - Confirm the problem is still active
   - Ask clarifying questions about scope
   - Verify timeline/urgency
   - Confirm budget is realistic
   - Ask about preferred contact method

3. If NO → "No problem! Would you prefer I have ${business_details?.name} text or email you instead?"

4. Closing (30 sec):
   - If qualified: "Great! ${business_details?.name} will reach out within [timeframe]. Expect a call from ${business_details?.phone_number}."
   - If not qualified: "Thanks for your time. I'll update your request."

VOICEMAIL SCRIPT:
"Hi, this is an AI assistant from LeadFlip calling about your ${lead_details.service_category} request. ${business_details?.name} is interested in helping. Please call back at [LeadFlip number] or we'll try again later. Thanks!"`;
        break;

      case 'confirm_appointment':
        specificInstructions = `
CALL OBJECTIVE: Confirm appointment details

YOUR SCRIPT:
1. "Hi, this is an AI assistant from LeadFlip calling to confirm your appointment with ${business_details?.name}. Do you have a moment?"

2. Confirm:
   - Date and time
   - Service location
   - Services to be performed
   - Any preparation needed

3. "Perfect! See you [date/time]. If anything changes, call ${business_details?.phone_number}."`;
        break;

      case 'follow_up':
        specificInstructions = `
CALL OBJECTIVE: Follow up on service completion

YOUR SCRIPT:
1. "Hi, this is an AI assistant from LeadFlip. I'm following up on your recent service with ${business_details?.name}. How did everything go?"

2. Collect feedback:
   - Was service completed satisfactorily?
   - Any issues or concerns?
   - Would you recommend this business?
   - Permission to use review on platform

3. "Thank you for the feedback! Have a great day."`;
        break;

      case 'consumer_callback':
        specificInstructions = `
CALL OBJECTIVE: Consumer requested callback from business

YOUR SCRIPT:
1. "Hi, this is an AI assistant from ${business_details?.name} via LeadFlip. You requested a callback about ${lead_details.service_category}. Is now a good time?"

2. If YES → Connect business:
   - "Let me get ${business_details?.name} on the line for you."
   - Transfer call or schedule callback

3. If NO → "What time works better for you?"`;
        break;
    }

    return baseInstructions + '\n\n' + specificInstructions + `

HANDLING OBJECTIONS:
- "How did you get my number?" → "You submitted a request on LeadFlip.com for ${lead_details.service_category}. We're connecting you with local businesses."
- "I'm not interested anymore" → "No problem! I'll remove you from the list. Thanks for letting me know."
- "This is spam" → "I apologize. You won't receive further calls. Have a good day."
- "I want a human" → "I understand. I'll have a real person from ${business_details?.name} call you within 1 hour at this number. Is that okay?"

DO NOT CALL REGISTRY:
If the person says "Put me on your do not call list" or similar:
1. Immediately confirm: "Absolutely, I'm adding you to the do not call list right now."
2. Mark outcome as 'declined'
3. End call politely: "You won't receive any more calls. Thanks for your time."`;
  }

  /**
   * Request reasoning from Claude during a call
   * Used when AI needs to make complex decisions mid-conversation
   */
  async requestReasoning(request: ReasoningRequest): Promise<string> {
    const prompt = `You are reasoning module for an AI call agent currently on a phone call.

CONVERSATION SO FAR:
${request.conversation_history
  .map((msg) => `${msg.role === 'assistant' ? 'AI' : 'Human'}: ${msg.content}`)
  .join('\n')}

CURRENT SITUATION: ${request.current_situation}

QUESTION: ${request.question}

Provide a concise, actionable response (1-2 sentences max). Focus on what the AI should say or do next.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 150,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return content.text;
    } catch (error) {
      console.error('Reasoning request failed:', error);
      return 'Continue with the standard script.';
    }
  }

  /**
   * Generate call summary after completion
   */
  async generateCallSummary(context: CallContext, transcript: string): Promise<CallOutcome> {
    const prompt = `You are analyzing a completed AI phone call. Generate a structured summary.

CALL OBJECTIVE: ${context.objective}

FULL TRANSCRIPT:
${transcript}

Analyze the call and provide:
1. Outcome status (goal_achieved, no_answer, voicemail, declined, or error)
2. Brief summary (2-3 sentences)
3. Consumer interest level (high, medium, low, none)
4. Next action recommendation
5. Any appointment time mentioned
6. Any quote/price mentioned

Output as JSON:
{
  "status": "goal_achieved",
  "summary": "...",
  "consumer_interest_level": "high",
  "next_action": "...",
  "appointment_time": "..." (if mentioned),
  "quote_amount": 500 (if mentioned)
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        temperature: 0.5,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const parsed = JSON.parse(content.text);

      return {
        status: parsed.status,
        summary: parsed.summary,
        transcript,
        next_action: parsed.next_action,
        appointment_time: parsed.appointment_time,
        quote_amount: parsed.quote_amount,
        consumer_interest_level: parsed.consumer_interest_level,
      };
    } catch (error) {
      console.error('Summary generation failed:', error);

      // Fallback summary
      return {
        status: 'error',
        summary: 'Call completed but summary generation failed',
        transcript,
        consumer_interest_level: 'medium',
      };
    }
  }

  /**
   * Detect voicemail from audio characteristics
   * Returns true if likely voicemail, false if human
   */
  detectVoicemail(audioPattern: string): boolean {
    // Common voicemail indicators:
    // - Long uninterrupted speech (>15 seconds)
    // - Phrases like "leave a message", "beep", "mailbox"
    // - No natural pauses for response

    const voicemailKeywords = [
      'leave a message',
      'after the beep',
      'not available',
      'voicemail',
      'mailbox',
      'unable to take your call',
    ];

    const lowerPattern = audioPattern.toLowerCase();
    return voicemailKeywords.some((keyword) => lowerPattern.includes(keyword));
  }

  /**
   * Save call record to database
   */
  async saveCallRecord(
    callId: string,
    context: CallContext,
    outcome: CallOutcome,
    duration: number,
    recordingUrl?: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('calls').insert({
        id: callId,
        lead_id: context.lead_id,
        business_id: context.business_id,
        consumer_id: context.consumer_id,
        call_type: context.call_type,
        objective: context.objective,
        status: outcome.status,
        transcript: outcome.transcript,
        summary: outcome.summary,
        duration_seconds: duration,
        recording_url: recordingUrl,
        consumer_interest_level: outcome.consumer_interest_level,
        appointment_time: outcome.appointment_time,
        quote_amount: outcome.quote_amount,
        next_action: outcome.next_action,
      });

      if (error) {
        console.error('Failed to save call record:', error);
      }
    } catch (error) {
      console.error('Error saving call record:', error);
    }
  }

  /**
   * Update lead status based on call outcome
   */
  async updateLeadStatus(leadId: string, callOutcome: CallOutcome): Promise<void> {
    let newStatus = 'contacted';

    switch (callOutcome.status) {
      case 'goal_achieved':
        if (callOutcome.appointment_time) {
          newStatus = 'appointment_scheduled';
        } else {
          newStatus = 'contacted';
        }
        break;
      case 'declined':
        newStatus = 'declined';
        break;
      case 'no_answer':
      case 'voicemail':
        newStatus = 'contact_attempted';
        break;
    }

    try {
      await this.supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
    } catch (error) {
      console.error('Failed to update lead status:', error);
    }
  }

  /**
   * Queue retry for failed calls
   */
  async queueRetry(callId: string, context: CallContext, attemptNumber: number): Promise<void> {
    if (attemptNumber >= 3) {
      console.log(`Max retry attempts reached for call ${callId}`);
      return;
    }

    // Calculate retry delay (exponential backoff)
    const delayMinutes = Math.pow(2, attemptNumber) * 30; // 30 min, 60 min, 120 min

    console.log(`Queuing retry for call ${callId} in ${delayMinutes} minutes`);

    // TODO: Add to BullMQ with delay
    // await callQueue.add('retry-call', context, {
    //   delay: delayMinutes * 60 * 1000,
    //   attempts: 3,
    // });
  }

  /**
   * Get call statistics
   */
  async getCallStats(days: number = 30): Promise<{
    totalCalls: number;
    goalAchieved: number;
    noAnswer: number;
    voicemail: number;
    declined: number;
    successRate: string;
    avgDuration: number;
  } | null> {
    const { data, error } = await this.supabase
      .from('calls')
      .select('*')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Failed to fetch call stats:', error);
      return null;
    }

    const totalCalls = data.length;
    const goalAchieved = data.filter((c) => c.status === 'goal_achieved').length;
    const noAnswer = data.filter((c) => c.status === 'no_answer').length;
    const voicemail = data.filter((c) => c.status === 'voicemail').length;
    const declined = data.filter((c) => c.status === 'declined').length;
    const avgDuration = data.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / totalCalls;

    return {
      totalCalls,
      goalAchieved,
      noAnswer,
      voicemail,
      declined,
      successRate: ((goalAchieved / totalCalls) * 100).toFixed(1) + '%',
      avgDuration: Math.round(avgDuration),
    };
  }
}

/**
 * Standalone function for quick call initiation (used by API endpoints)
 */
export async function initiateAICall(context: CallContext): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const callAgent = new CallAgentSubagent(apiKey, supabaseUrl, supabaseKey);

  // Generate system prompt
  const systemPrompt = callAgent.generateSystemPrompt(context);

  // TODO: Queue call job in BullMQ with system prompt
  console.log('Call queued:', context.call_id);
  console.log('System prompt length:', systemPrompt.length);

  return context.call_id;
}
