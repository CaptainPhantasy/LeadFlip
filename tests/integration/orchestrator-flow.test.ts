/**
 * Main Orchestrator Integration Tests
 *
 * End-to-end tests for the complete lead processing flow:
 * - Lead submission → Classification → Matching → Notification
 *
 * [2025-10-01 8:45 PM] Agent 3: Created orchestrator flow integration tests
 */

import { MainOrchestratorAgent, processConsumerLead } from '@/lib/agents/main-orchestrator';
import { classifyLead } from '@/lib/agents/lead-classifier';
import { BusinessMatcherAgent } from '@/lib/agents/business-matcher';
import { ResponseGeneratorAgent } from '@/lib/agents/response-generator';
import { sendEmail } from '@/lib/email/sendgrid-client';
import { sendSMS } from '@/lib/sms/signalwire-client';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// Mock all external dependencies
jest.mock('@/lib/agents/lead-classifier');
jest.mock('@/lib/agents/business-matcher');
jest.mock('@/lib/agents/response-generator');
jest.mock('@/lib/email/sendgrid-client');
jest.mock('@/lib/sms/signalwire-client');
jest.mock('@supabase/supabase-js');
jest.mock('@anthropic-ai/sdk');

const mockClassifyLead = classifyLead as jest.MockedFunction<typeof classifyLead>;
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockSendSMS = sendSMS as jest.MockedFunction<typeof sendSMS>;

const mockSupabase = {
  from: jest.fn(),
};

const mockBusinessMatcher = {
  findMatches: jest.fn(),
  checkCapacity: jest.fn(),
};

const mockResponseGenerator = {
  generateResponse: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockReturnValue(mockSupabase);
  (BusinessMatcherAgent as jest.Mock).mockImplementation(() => mockBusinessMatcher);
  (ResponseGeneratorAgent as jest.Mock).mockImplementation(() => mockResponseGenerator);
});

describe('Main Orchestrator - Complete Lead Flow', () => {
  describe('High Quality Lead - Full Success Path', () => {
    it('should process emergency lead end-to-end successfully', async () => {
      const submission = {
        consumer_id: 'user_consumer_123',
        problem_text: "Water heater leaking badly, need emergency plumber in Carmel 46032, budget $500",
        contact_phone: '+13175551234',
        contact_email: 'consumer@example.com',
      };

      // Mock classification
      const classifiedLead = {
        service_category: 'plumbing' as const,
        urgency: 'emergency' as const,
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        key_requirements: ['water heater', 'emergency', 'licensed'],
        sentiment: 'negative' as const,
        quality_score: 8.5,
      };
      mockClassifyLead.mockResolvedValue(classifiedLead);

      // Mock lead save
      const leadId = 'lead_123';
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: leadId },
              error: null,
            }),
          }),
        }),
      });

      // Mock business matching
      const matches = [
        {
          business_id: 'business_1',
          business_name: 'ABC Plumbing',
          confidence_score: 92,
          distance_miles: 3.2,
          rating: 4.8,
          response_rate: 0.95,
          price_tier: 'standard' as const,
          match_reasons: ['Very close', 'Emergency service available', 'Excellent rating'],
        },
        {
          business_id: 'business_2',
          business_name: 'XYZ Plumbing',
          confidence_score: 85,
          distance_miles: 5.1,
          rating: 4.5,
          response_rate: 0.85,
          price_tier: 'standard' as const,
          match_reasons: ['Nearby', 'Emergency service available'],
        },
      ];
      mockBusinessMatcher.findMatches.mockResolvedValue(matches);

      // Mock save matches
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      // Mock capacity check (both have capacity)
      mockBusinessMatcher.checkCapacity.mockResolvedValue(true);

      // Mock get business details
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'business_1',
                name: 'ABC Plumbing',
                rating: 4.8,
                years_in_business: 15,
                service_categories: ['plumbing', 'water_heater'],
                completed_jobs: 850,
                email: 'abc@plumbing.com',
                phone_number: '+13175559999',
                notification_preferences: { email_enabled: true, sms_enabled: true },
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock response generation
      mockResponseGenerator.generateResponse.mockResolvedValue({
        subject: '🚨 EMERGENCY: Water heater emergency in Carmel',
        message: 'Customer in Carmel 46032 needs emergency water heater repair. Budget $500. Licensed plumber required.',
        call_to_action: 'Respond Now',
      });

      // Mock lead fetch for notification
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: leadId,
                classified_data: classifiedLead,
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock notifications
      mockSendEmail.mockResolvedValue({
        success: true,
        channel: 'email',
        message_id: 'email_123',
        sent_at: new Date().toISOString(),
      });

      mockSendSMS.mockResolvedValue({
        success: true,
        channel: 'sms',
        message_id: 'sms_123',
        sent_at: new Date().toISOString(),
      });

      // Mock notification log save
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      // Mock update lead status
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      // Execute
      const orchestrator = new MainOrchestratorAgent();
      const result = await orchestrator.processLead(submission);

      // Assertions
      expect(result.status).toBe('matched');
      expect(result.lead_id).toBe(leadId);
      expect(result.classified_lead).toEqual(classifiedLead);
      expect(result.quality_score).toBe(8.5);
      expect(result.matches).toEqual(matches);
      expect(result.notifications_sent).toBeGreaterThan(0);

      // Verify classification was called
      expect(mockClassifyLead).toHaveBeenCalledWith(submission.problem_text);

      // Verify business matching was called
      expect(mockBusinessMatcher.findMatches).toHaveBeenCalledWith(classifiedLead);

      // Verify notifications were sent
      expect(mockSendEmail).toHaveBeenCalled();
      expect(mockSendSMS).toHaveBeenCalled();
    });
  });

  describe('Low Quality Lead - Rejection Path', () => {
    it('should reject lead with quality score below threshold', async () => {
      const submission = {
        consumer_id: 'user_consumer_123',
        problem_text: "need help with stuff",
        contact_phone: '+13175551234',
        contact_email: 'consumer@example.com',
      };

      // Mock low quality classification
      const classifiedLead = {
        service_category: 'other' as const,
        urgency: 'low' as const,
        budget_min: 0,
        budget_max: null,
        location_zip: null,
        key_requirements: [],
        sentiment: 'neutral' as const,
        quality_score: 3.0,
      };
      mockClassifyLead.mockResolvedValue(classifiedLead);

      // Mock lead save (status: low_quality)
      const leadId = 'lead_456';
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: leadId },
              error: null,
            }),
          }),
        }),
      });

      const orchestrator = new MainOrchestratorAgent({ minQualityScore: 5.0 });
      const result = await orchestrator.processLead(submission);

      expect(result.status).toBe('low_quality');
      expect(result.quality_score).toBe(3.0);
      expect(result.matches).toEqual([]);
      expect(result.notifications_sent).toBe(0);

      // Should NOT call business matcher
      expect(mockBusinessMatcher.findMatches).not.toHaveBeenCalled();

      // Should NOT send notifications
      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(mockSendSMS).not.toHaveBeenCalled();
    });

    it('should save low quality lead to database for analysis', async () => {
      const submission = {
        consumer_id: 'user_consumer_123',
        problem_text: "test",
        contact_phone: '+13175551234',
        contact_email: 'consumer@example.com',
      };

      const classifiedLead = {
        service_category: 'other' as const,
        urgency: 'low' as const,
        budget_min: 0,
        budget_max: null,
        location_zip: null,
        key_requirements: [],
        sentiment: 'neutral' as const,
        quality_score: 2.0,
      };
      mockClassifyLead.mockResolvedValue(classifiedLead);

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'lead_low_123' },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: mockInsert,
      });

      const orchestrator = new MainOrchestratorAgent();
      await orchestrator.processLead(submission);

      // Verify lead was saved with low_quality status
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'low_quality',
          quality_score: 2.0,
        })
      );
    });
  });

  describe('No Matches Found - Edge Case', () => {
    it('should handle lead with no business matches gracefully', async () => {
      const submission = {
        consumer_id: 'user_consumer_123',
        problem_text: "Need specialized aerospace engineering in rural area 99999",
        contact_phone: '+13175551234',
        contact_email: 'consumer@example.com',
      };

      const classifiedLead = {
        service_category: 'other' as const,
        urgency: 'medium' as const,
        budget_min: 0,
        budget_max: 5000,
        location_zip: '99999',
        key_requirements: ['aerospace', 'specialized'],
        sentiment: 'neutral' as const,
        quality_score: 6.5,
      };
      mockClassifyLead.mockResolvedValue(classifiedLead);

      // Mock lead save
      const leadId = 'lead_no_match_123';
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: leadId },
              error: null,
            }),
          }),
        }),
      });

      // Mock no matches
      mockBusinessMatcher.findMatches.mockResolvedValue([]);

      // Mock update status
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const orchestrator = new MainOrchestratorAgent();
      const result = await orchestrator.processLead(submission);

      expect(result.status).toBe('no_matches');
      expect(result.matches).toEqual([]);
      expect(result.notifications_sent).toBe(0);

      // Should still save lead
      expect(result.lead_id).toBe(leadId);
    });
  });

  describe('Business Capacity Filtering', () => {
    it('should skip businesses with no capacity', async () => {
      const submission = {
        consumer_id: 'user_consumer_123',
        problem_text: "Need lawn mowing in Fishers 46038",
        contact_phone: '+13175551234',
        contact_email: 'consumer@example.com',
      };

      const classifiedLead = {
        service_category: 'lawn_care' as const,
        urgency: 'medium' as const,
        budget_min: 50,
        budget_max: 100,
        location_zip: '46038',
        key_requirements: ['mowing'],
        sentiment: 'neutral' as const,
        quality_score: 7.0,
      };
      mockClassifyLead.mockResolvedValue(classifiedLead);

      // Mock lead save
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'lead_123' },
              error: null,
            }),
          }),
        }),
      });

      // Mock matches
      const matches = [
        {
          business_id: 'business_full',
          business_name: 'Full Capacity Lawn Care',
          confidence_score: 85,
          distance_miles: 2.0,
          rating: 4.5,
          response_rate: 0.9,
          price_tier: 'standard' as const,
          match_reasons: ['Very close'],
        },
      ];
      mockBusinessMatcher.findMatches.mockResolvedValue(matches);

      // Mock save matches
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      // Mock NO capacity
      mockBusinessMatcher.checkCapacity.mockResolvedValue(false);

      // Mock update status
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const orchestrator = new MainOrchestratorAgent();
      const result = await orchestrator.processLead(submission);

      expect(result.notifications_sent).toBe(0);
      expect(mockBusinessMatcher.checkCapacity).toHaveBeenCalledWith('business_full');

      // Should NOT send notifications
      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(mockSendSMS).not.toHaveBeenCalled();
    });
  });

  describe('Notification Batching', () => {
    it('should process notifications in batches of 5', async () => {
      const submission = {
        consumer_id: 'user_consumer_123',
        problem_text: "Need plumber in Indianapolis 46220",
        contact_phone: '+13175551234',
        contact_email: 'consumer@example.com',
      };

      const classifiedLead = {
        service_category: 'plumbing' as const,
        urgency: 'medium' as const,
        budget_min: 0,
        budget_max: 300,
        location_zip: '46220',
        key_requirements: [],
        sentiment: 'neutral' as const,
        quality_score: 7.0,
      };
      mockClassifyLead.mockResolvedValue(classifiedLead);

      // Mock lead save
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'lead_batch_123' },
              error: null,
            }),
          }),
        }),
      });

      // Mock 8 matches (should batch as 5 + 3)
      const matches = Array.from({ length: 8 }, (_, i) => ({
        business_id: `business_${i}`,
        business_name: `Business ${i}`,
        confidence_score: 80 - i,
        distance_miles: 5.0,
        rating: 4.5,
        response_rate: 0.8,
        price_tier: 'standard' as const,
        match_reasons: ['Match'],
      }));
      mockBusinessMatcher.findMatches.mockResolvedValue(matches);

      // Mock save matches
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: `business_0`,
                name: 'Business 0',
                email: 'business@example.com',
                phone_number: '+13175559999',
                notification_preferences: { email_enabled: true, sms_enabled: false },
              },
              error: null,
            }),
          }),
        }),
      });

      // All have capacity
      mockBusinessMatcher.checkCapacity.mockResolvedValue(true);

      // Mock response generation
      mockResponseGenerator.generateResponse.mockResolvedValue({
        subject: 'New Lead',
        message: 'Customer needs plumbing service',
        call_to_action: 'View Lead',
      });

      mockSendEmail.mockResolvedValue({
        success: true,
        channel: 'email',
        message_id: 'email_123',
        sent_at: new Date().toISOString(),
      });

      const orchestrator = new MainOrchestratorAgent();
      const result = await orchestrator.processLead(submission);

      // All 8 businesses should receive notifications
      expect(result.notifications_sent).toBe(8);
    });
  });

  describe('Error Handling', () => {
    it('should handle classification error gracefully', async () => {
      const submission = {
        consumer_id: 'user_consumer_123',
        problem_text: "Test lead",
        contact_phone: '+13175551234',
        contact_email: 'consumer@example.com',
      };

      mockClassifyLead.mockRejectedValue(new Error('Anthropic API unavailable'));

      const orchestrator = new MainOrchestratorAgent();
      const result = await orchestrator.processLead(submission);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Anthropic API unavailable');
      expect(result.matches).toEqual([]);
    });

    it('should handle database save error', async () => {
      const submission = {
        consumer_id: 'user_consumer_123',
        problem_text: "Need plumber",
        contact_phone: '+13175551234',
        contact_email: 'consumer@example.com',
      };

      mockClassifyLead.mockResolvedValue({
        service_category: 'plumbing' as const,
        urgency: 'medium' as const,
        budget_min: 0,
        budget_max: 300,
        location_zip: '46032',
        key_requirements: [],
        sentiment: 'neutral' as const,
        quality_score: 7.0,
      });

      // Mock database error
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          }),
        }),
      });

      const orchestrator = new MainOrchestratorAgent();
      const result = await orchestrator.processLead(submission);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to save lead');
    });
  });

  describe('Standalone Function', () => {
    it('should work via processConsumerLead helper function', async () => {
      const submission = {
        consumer_id: 'user_consumer_123',
        problem_text: "Need electrician in Carmel 46032",
        contact_phone: '+13175551234',
        contact_email: 'consumer@example.com',
      };

      const classifiedLead = {
        service_category: 'electrical' as const,
        urgency: 'high' as const,
        budget_min: 0,
        budget_max: 400,
        location_zip: '46032',
        key_requirements: ['licensed'],
        sentiment: 'neutral' as const,
        quality_score: 7.5,
      };
      mockClassifyLead.mockResolvedValue(classifiedLead);

      // Mock all necessary database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'lead_helper_123' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      mockBusinessMatcher.findMatches.mockResolvedValue([]);

      const result = await processConsumerLead(submission);

      expect(result.lead_id).toBe('lead_helper_123');
      expect(result.classified_lead).toEqual(classifiedLead);
    });
  });
});
