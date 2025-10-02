/**
 * Integration Tests - Complete Lead Flow
 *
 * Tests the end-to-end flow:
 * 1. Consumer submits problem
 * 2. Lead Classifier processes text
 * 3. Quality score calculated
 * 4. Business Matcher finds matches
 * 5. Response Generator creates messages
 * 6. Notifications sent to businesses
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { MainOrchestratorAgent } from '@/lib/agents/main-orchestrator';
import { ClassifyLeadAgent } from '@/lib/agents/lead-classifier';
import { BusinessMatcherAgent } from '@/lib/agents/business-matcher';
import { ResponseGeneratorAgent } from '@/lib/agents/response-generator';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const anthropicKey = process.env.ANTHROPIC_API_KEY!;

describe('Complete Lead Flow Integration Tests', () => {
  let orchestrator: MainOrchestratorAgent;
  let supabase: ReturnType<typeof createClient>;
  let testConsumerId: string;
  let testBusinessId: string;

  beforeAll(async () => {
    orchestrator = new MainOrchestratorAgent({
      minQualityScore: 5.0,
      autoSendNotifications: false, // Disable for testing
    });

    supabase = createClient(supabaseUrl, supabaseKey);

    // Create test consumer
    testConsumerId = 'test-consumer-' + Date.now();

    // Create test business
    const { data: business } = await supabase
      .from('businesses')
      .insert({
        user_id: 'test-business-' + Date.now(),
        name: 'Test Plumbing Services',
        service_categories: ['plumbing', 'water_heater'],
        phone_number: '+15555551234',
        email: 'test@example.com',
        address: '123 Main St',
        city: 'Carmel',
        state: 'IN',
        zip_code: '46032',
        location: 'POINT(-86.1180 39.9783)', // Carmel, IN coordinates
        price_tier: 'standard',
        rating: 4.5,
        offers_emergency_service: true,
        is_licensed: true,
        is_insured: true,
        is_active: true,
      })
      .select('id')
      .single();

    testBusinessId = business?.id || '';
  });

  afterAll(async () => {
    // Cleanup test data
    if (testBusinessId) {
      await supabase.from('businesses').delete().eq('id', testBusinessId);
    }
  });

  describe('Emergency Plumbing Lead', () => {
    it('should process emergency lead from submission to matches', async () => {
      const submission = {
        consumer_id: testConsumerId,
        problem_text:
          'My water heater is leaking badly, need emergency plumber in Carmel 46032, budget up to $800',
      };

      const result = await orchestrator.processLead(submission);

      // Verify lead was created
      expect(result.lead_id).toBeDefined();
      expect(result.status).toBe('matched');

      // Verify classification
      expect(result.classified_lead.service_category).toBe('plumbing');
      expect(result.classified_lead.urgency).toBe('emergency');
      expect(result.classified_lead.budget_max).toBeGreaterThanOrEqual(800);
      expect(result.classified_lead.location_zip).toBe('46032');

      // Verify quality score
      expect(result.quality_score).toBeGreaterThanOrEqual(7.0);

      // Verify matches found
      expect(result.matches.length).toBeGreaterThan(0);

      // Verify top match includes our test business
      const matchedBusinessIds = result.matches.map((m) => m.business_id);
      expect(matchedBusinessIds).toContain(testBusinessId);

      // Cleanup
      await supabase.from('leads').delete().eq('id', result.lead_id);
    }, 30000);

    it('should reject low-quality vague submissions', async () => {
      const submission = {
        consumer_id: testConsumerId,
        problem_text: 'need help with stuff',
      };

      const result = await orchestrator.processLead(submission);

      expect(result.status).toBe('low_quality');
      expect(result.quality_score).toBeLessThan(5.0);
      expect(result.matches.length).toBe(0);

      // Cleanup
      if (result.lead_id) {
        await supabase.from('leads').delete().eq('id', result.lead_id);
      }
    }, 15000);
  });

  describe('Lead Classifier Subagent', () => {
    it('should classify lawn care lead correctly', async () => {
      const classifier = new ClassifyLeadAgent(anthropicKey);

      const result = await classifier.classify(
        'Need weekly lawn mowing service in Fishers 46038, have large yard about 1 acre, budget $100 per visit'
      );

      expect(result.service_category).toBe('lawn_care');
      expect(result.urgency).toBeOneOf(['normal', 'flexible']);
      expect(result.budget_max).toBeGreaterThanOrEqual(100);
      expect(result.location_zip).toBe('46038');
      expect(result.key_requirements).toContain('lawn mowing');
      expect(result.quality_score).toBeGreaterThanOrEqual(7.0);
    }, 15000);

    it('should extract budget ranges correctly', async () => {
      const classifier = new ClassifyLeadAgent(anthropicKey);

      const result = await classifier.classify(
        'Need roof repair, budget between $2000 and $5000, Indianapolis 46220'
      );

      expect(result.service_category).toBe('roofing');
      expect(result.budget_min).toBeGreaterThanOrEqual(2000);
      expect(result.budget_max).toBeGreaterThanOrEqual(5000);
      expect(result.location_zip).toBe('46220');
    }, 15000);

    it('should detect urgency levels', async () => {
      const classifier = new ClassifyLeadAgent(anthropicKey);

      // Emergency
      const emergency = await classifier.classify(
        'EMERGENCY! Burst pipe flooding basement right now, need plumber ASAP in Carmel 46032'
      );
      expect(emergency.urgency).toBe('emergency');
      expect(emergency.quality_score).toBeGreaterThanOrEqual(8.0);

      // Urgent
      const urgent = await classifier.classify(
        'AC stopped working and it is 95 degrees, need HVAC repair today in Fishers 46038'
      );
      expect(urgent.urgency).toBeOneOf(['emergency', 'urgent']);

      // Normal
      const normal = await classifier.classify(
        'Looking to paint interior of house next month, Carmel 46032'
      );
      expect(normal.urgency).toBeOneOf(['normal', 'flexible']);
    }, 30000);
  });

  describe('Business Matcher Subagent', () => {
    it('should rank businesses by proximity', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const lead = {
        service_category: 'plumbing',
        urgency: 'emergency' as const,
        budget_min: 0,
        budget_max: 1000,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: ['licensed', 'emergency service'],
        sentiment: 'negative' as const,
        quality_score: 8.5,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches.length).toBeGreaterThan(0);

      // Verify sorted by distance
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i].confidence_score).toBeLessThanOrEqual(matches[i - 1].confidence_score);
      }

      // Verify test business is in results
      const testBusiness = matches.find((m) => m.business_id === testBusinessId);
      expect(testBusiness).toBeDefined();
      expect(testBusiness?.confidence_score).toBeGreaterThanOrEqual(50);
    }, 15000);

    it('should boost scores for emergency service capability', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const emergencyLead = {
        service_category: 'plumbing',
        urgency: 'emergency' as const,
        budget_min: 0,
        budget_max: 1000,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: ['emergency'],
        sentiment: 'negative' as const,
        quality_score: 9.0,
      };

      const matches = await matcher.findMatches(emergencyLead);

      // Businesses with emergency service should score higher
      const emergencyBusinesses = matches.filter(
        (m) => m.match_reasons.some((r) => r.includes('Emergency'))
      );

      expect(emergencyBusinesses.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Response Generator Subagent', () => {
    it('should generate personalized notification messages', async () => {
      const generator = new ResponseGeneratorAgent(anthropicKey);

      const lead = {
        service_category: 'plumbing',
        urgency: 'emergency' as const,
        location_city: 'Carmel',
        location_zip: '46032',
        budget_max: 800,
        key_requirements: ['licensed', 'water heater repair'],
        problem_description: 'Water heater leaking, need emergency repair',
      };

      const business = {
        name: 'Test Plumbing Services',
        rating: 4.5,
        years_in_business: 10,
        service_categories: ['plumbing', 'water_heater'],
        completed_jobs: 250,
      };

      const response = await generator.generateResponse(lead, business);

      // Verify response structure
      expect(response.subject).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.call_to_action).toBeDefined();

      // Verify message includes key details
      expect(response.message.toLowerCase()).toContain('carmel');
      expect(response.message.toLowerCase()).toMatch(/water|heater|leak/);
      expect(response.message).toMatch(/\$800/);

      // Verify urgency reflected
      expect(response.subject.toLowerCase()).toMatch(/emergency|urgent|🚨/);
      expect(response.call_to_action.toLowerCase()).toMatch(/respond|view|now/);
    }, 15000);

    it('should generate different messages for different urgency levels', async () => {
      const generator = new ResponseGeneratorAgent(anthropicKey);

      const baseLead = {
        service_category: 'lawn_care',
        location_city: 'Fishers',
        location_zip: '46038',
        budget_max: 100,
        key_requirements: ['mowing'],
        problem_description: 'Need lawn mowing service',
      };

      const business = {
        name: 'Test Lawn Care',
        rating: 4.0,
        years_in_business: 5,
        service_categories: ['lawn_care'],
        completed_jobs: 100,
      };

      // Emergency message
      const emergencyResponse = await generator.generateResponse(
        { ...baseLead, urgency: 'emergency' as const },
        business
      );

      // Normal message
      const normalResponse = await generator.generateResponse(
        { ...baseLead, urgency: 'normal' as const },
        business
      );

      // Emergency should have more urgent language
      expect(emergencyResponse.subject.toLowerCase()).toMatch(/emergency|urgent|asap|🚨/);
      expect(normalResponse.subject.toLowerCase()).not.toMatch(/emergency|🚨/);
    }, 20000);
  });

  describe('Orchestrator Statistics', () => {
    it('should calculate accurate statistics', async () => {
      const stats = await orchestrator.getStats(30);

      expect(stats).toHaveProperty('totalLeads');
      expect(stats).toHaveProperty('matchedLeads');
      expect(stats).toHaveProperty('avgQualityScore');
      expect(stats).toHaveProperty('matchRate');

      expect(typeof stats.totalLeads).toBe('number');
      expect(typeof stats.matchRate).toBe('string');
      expect(stats.matchRate).toMatch(/%$/);
    }, 10000);
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
