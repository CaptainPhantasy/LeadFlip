/**
 * Integration Tests - AI Call Flow
 *
 * Tests the end-to-end call flow:
 * 1. Call initiation
 * 2. Job queuing
 * 3. Twilio call creation
 * 4. WebSocket audio streaming
 * 5. Call transcript generation
 * 6. Call summary and outcome
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { CallAgentSubagent } from '@/lib/agents/call-agent';
import { queueCall } from '@/server/queue/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const anthropicKey = process.env.ANTHROPIC_API_KEY!;

describe('AI Call Flow Integration Tests', () => {
  let callAgent: CallAgentSubagent;
  let supabase: ReturnType<typeof createClient>;
  let testLeadId: string;
  let testBusinessId: string;
  let testConsumerId: string;

  beforeAll(async () => {
    callAgent = new CallAgentSubagent(anthropicKey, supabaseUrl, supabaseKey);
    supabase = createClient(supabaseUrl, supabaseKey);

    // Create test data
    testConsumerId = 'test-consumer-' + Date.now();
    testBusinessId = 'test-business-' + Date.now();

    // Create test lead
    const { data: lead } = await supabase
      .from('leads')
      .insert({
        user_id: testConsumerId,
        problem_text: 'Need emergency plumber for water heater leak',
        service_category: 'plumbing',
        urgency: 'emergency',
        budget_max: 800,
        location_zip: '46032',
        quality_score: 8.5,
        status: 'matched',
      })
      .select()
      .single();

    testLeadId = lead?.id || '';
  });

  afterAll(async () => {
    // Cleanup
    if (testLeadId) {
      await supabase.from('leads').delete().eq('id', testLeadId);
    }
  });

  describe('System Prompt Generation', () => {
    it('should generate appropriate prompt for lead qualification call', () => {
      const context = {
        call_id: 'test-call-1',
        lead_id: testLeadId,
        business_id: testBusinessId,
        objective: 'Qualify lead for ABC Plumbing',
        call_type: 'qualify_lead' as const,
        lead_details: {
          service_category: 'plumbing',
          problem_text: 'Water heater leaking badly',
          urgency: 'emergency',
          budget_max: 800,
          location_zip: '46032',
        },
        business_details: {
          name: 'ABC Plumbing',
          phone_number: '+15551234567',
        },
        consumer_details: {
          phone_number: '+15559876543',
        },
      };

      const prompt = callAgent.generateSystemPrompt(context);

      // Verify prompt contains key elements
      expect(prompt).toContain('AI assistant');
      expect(prompt).toContain('ABC Plumbing');
      expect(prompt).toContain('plumbing');
      expect(prompt).toContain('emergency');
      expect(prompt).toContain('$800');
      expect(prompt).toContain('46032');
      expect(prompt.length).toBeGreaterThan(500); // Detailed prompt
    });

    it('should generate different prompts for different call types', () => {
      const baseContext = {
        call_id: 'test-call-2',
        lead_id: testLeadId,
        objective: 'Test call',
        lead_details: {
          service_category: 'plumbing',
          problem_text: 'Water heater issue',
          urgency: 'normal',
          budget_max: 500,
          location_zip: '46032',
        },
        business_details: {
          name: 'Test Plumbing',
          phone_number: '+15551111111',
        },
      };

      const qualifyPrompt = callAgent.generateSystemPrompt({
        ...baseContext,
        call_type: 'qualify_lead',
      });

      const confirmPrompt = callAgent.generateSystemPrompt({
        ...baseContext,
        call_type: 'confirm_appointment',
      });

      const followUpPrompt = callAgent.generateSystemPrompt({
        ...baseContext,
        call_type: 'follow_up',
      });

      // Each should be unique
      expect(qualifyPrompt).not.toBe(confirmPrompt);
      expect(confirmPrompt).not.toBe(followUpPrompt);

      // Verify specific keywords
      expect(qualifyPrompt).toContain('qualify');
      expect(confirmPrompt).toContain('confirm');
      expect(followUpPrompt).toContain('follow up');
    });
  });

  describe('Call Summary Generation', () => {
    it('should generate structured summary from transcript', async () => {
      const context = {
        call_id: 'test-call-3',
        lead_id: testLeadId,
        objective: 'Qualify plumbing lead',
        call_type: 'qualify_lead' as const,
        lead_details: {
          service_category: 'plumbing',
          problem_text: 'Water heater leaking',
          urgency: 'emergency',
          budget_max: 800,
          location_zip: '46032',
        },
      };

      const transcript = `AI: Hi, this is an AI assistant calling from LeadFlip on behalf of ABC Plumbing. Is this a good time for a quick 2-minute call about your plumbing request?
User: Yes, I need help urgently.
AI: Great! Can you tell me more about the water heater issue?
User: It's leaking badly and I need someone today. My budget is up to $800.
AI: Perfect. ABC Plumbing can help with emergency repairs. They'll reach out within the next hour at this number. Expect a call from 555-123-4567.
User: Sounds good, thank you!
AI: You're welcome! Have a great day.`;

      const outcome = await callAgent.generateCallSummary(context, transcript);

      expect(outcome.status).toBe('goal_achieved');
      expect(outcome.summary).toBeDefined();
      expect(outcome.summary.length).toBeGreaterThan(20);
      expect(outcome.consumer_interest_level).toBeOneOf(['high', 'medium', 'low', 'none']);
      expect(outcome.transcript).toBe(transcript);
    }, 15000);

    it('should detect voicemail outcome from transcript', async () => {
      const context = {
        call_id: 'test-call-4',
        lead_id: testLeadId,
        objective: 'Qualify lead',
        call_type: 'qualify_lead' as const,
        lead_details: {
          service_category: 'plumbing',
          problem_text: 'Water heater',
          urgency: 'normal',
          budget_max: 500,
          location_zip: '46032',
        },
      };

      const transcript = `AI: Hi, this is an AI assistant calling from LeadFlip.
Voicemail: You've reached John Smith. Please leave a message after the beep.
AI: Hi, this is an AI assistant from LeadFlip calling about your plumbing request. ABC Plumbing is interested in helping. Please call back at 555-000-0000 or we'll try again later. Thanks!`;

      const outcome = await callAgent.generateCallSummary(context, transcript);

      expect(outcome.status).toBe('voicemail');
      expect(outcome.summary).toContain('voicemail');
    }, 15000);

    it('should detect declined outcome', async () => {
      const context = {
        call_id: 'test-call-5',
        lead_id: testLeadId,
        objective: 'Qualify lead',
        call_type: 'qualify_lead' as const,
        lead_details: {
          service_category: 'plumbing',
          problem_text: 'Water heater',
          urgency: 'normal',
          budget_max: 500,
          location_zip: '46032',
        },
      };

      const transcript = `AI: Hi, this is an AI assistant calling from LeadFlip about your plumbing request.
User: I'm not interested anymore. Please remove me from your list.
AI: No problem! I'll remove you from the list right away. Thanks for letting me know.`;

      const outcome = await callAgent.generateCallSummary(context, transcript);

      expect(outcome.status).toBe('declined');
      expect(outcome.consumer_interest_level).toBe('none');
    }, 15000);
  });

  describe('Voicemail Detection', () => {
    it('should detect voicemail from common patterns', () => {
      const patterns = [
        'Please leave a message after the beep',
        'You have reached the voicemail box of',
        'I am not available to take your call',
        'Please leave your name and number after the tone',
        "The person you're trying to reach is unavailable",
      ];

      patterns.forEach((pattern) => {
        const isVoicemail = callAgent.detectVoicemail(pattern);
        expect(isVoicemail).toBe(true);
      });
    });

    it('should not detect voicemail from normal conversation', () => {
      const normalPatterns = [
        'Hello, this is John speaking',
        'Yes, I need help with plumbing',
        'Can you tell me more about the service?',
        'Thank you for calling',
      ];

      normalPatterns.forEach((pattern) => {
        const isVoicemail = callAgent.detectVoicemail(pattern);
        expect(isVoicemail).toBe(false);
      });
    });
  });

  describe('Call Statistics', () => {
    it('should calculate call statistics', async () => {
      const stats = await callAgent.getCallStats(30);

      expect(stats).toHaveProperty('totalCalls');
      expect(stats).toHaveProperty('goalAchieved');
      expect(stats).toHaveProperty('noAnswer');
      expect(stats).toHaveProperty('voicemail');
      expect(stats).toHaveProperty('declined');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('avgDuration');

      expect(typeof stats.totalCalls).toBe('number');
      expect(stats.successRate).toMatch(/%$/);
    }, 10000);
  });

  describe('Job Queuing', () => {
    it('should queue call job successfully', async () => {
      const jobData = {
        call_id: 'test-job-1',
        lead_id: testLeadId,
        business_id: testBusinessId,
        phone_number: '+15559876543',
        call_type: 'qualify_lead' as const,
        objective: 'Qualify lead for plumbing service',
        system_prompt: 'Test system prompt',
        attempt_number: 1,
      };

      const jobId = await queueCall(jobData);

      expect(jobId).toBe(jobData.call_id);
    }, 10000);

    it('should handle scheduled calls with delay', async () => {
      const scheduledTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

      const jobData = {
        call_id: 'test-job-2',
        lead_id: testLeadId,
        phone_number: '+15559876543',
        call_type: 'confirm_appointment' as const,
        objective: 'Confirm appointment',
        system_prompt: 'Test prompt',
        scheduled_time: scheduledTime,
        attempt_number: 1,
      };

      const jobId = await queueCall(jobData);

      expect(jobId).toBe(jobData.call_id);
    }, 10000);
  });

  describe('Reasoning Requests', () => {
    it('should handle mid-call reasoning requests', async () => {
      const request = {
        conversation_history: [
          { role: 'assistant' as const, content: 'Hi, is this a good time to talk?' },
          { role: 'user' as const, content: 'Yes, but I need to understand your pricing first' },
        ],
        current_situation: 'Consumer asked about pricing before I could qualify the lead',
        question: 'Should I provide generic pricing info or redirect to qualification questions?',
      };

      const reasoning = await callAgent.requestReasoning(request);

      expect(reasoning).toBeDefined();
      expect(typeof reasoning).toBe('string');
      expect(reasoning.length).toBeGreaterThan(10);
    }, 15000);
  });
});

// Helper matchers
expect.extend({
  toBeOneOf(received: any, validOptions: any[]) {
    const pass = validOptions.includes(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be one of ${validOptions.join(', ')}`
          : `expected ${received} to be one of ${validOptions.join(', ')}`,
      pass,
    };
  },
});
