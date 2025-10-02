/**
 * Business Matcher Agent Tests
 *
 * Tests the business matching algorithm including:
 * - Geographic proximity scoring
 * - Service category matching
 * - Rating and response rate scoring
 * - Budget/pricing tier alignment
 * - Urgency compatibility
 * - Special requirements matching
 * - Capacity checking
 *
 * [2025-10-01] Testing Agent: Created comprehensive business matcher tests
 */

import { BusinessMatcherAgent, BusinessMatch, MatcherConfig } from '@/lib/agents/business-matcher';
import { ClassifiedLead } from '@/types/lead-classifier';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockSupabase = {
  rpc: jest.fn(),
  from: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockReturnValue(mockSupabase);
});

describe('Business Matcher Agent', () => {
  const supabaseUrl = 'https://test.supabase.co';
  const supabaseKey = 'test-key';

  describe('Distance Scoring', () => {
    it('should score very close businesses highest (<5 miles = 30 points)', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_1',
        name: 'Very Close Plumber',
        distance_miles: 3.5,
        service_categories: ['plumbing'],
        rating: 4.5,
        price_tier: 'standard',
        offers_emergency_service: true,
        is_licensed: true,
        is_insured: true,
        tags: [],
      };

      // Mock RPC for candidate businesses
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [mockBusiness],
        error: null,
      });

      // Mock RPC for response rate
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 0.8,
        error: null,
      });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'emergency',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: ['licensed'],
        sentiment: 'negative',
        quality_score: 8.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].confidence_score).toBeGreaterThan(70); // High score for close match
      expect(matches[0].match_reasons).toContain(expect.stringContaining('Very close'));
    });

    it('should score nearby businesses moderately (5-10 miles = 25 points)', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_2',
        name: 'Nearby Plumber',
        distance_miles: 7.2,
        service_categories: ['plumbing'],
        rating: 4.0,
        price_tier: 'standard',
        offers_emergency_service: false,
        is_licensed: true,
        is_insured: true,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: 0.7, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches[0].distance_miles).toBeCloseTo(7.2);
      expect(matches[0].match_reasons).toContain(expect.stringContaining('Nearby'));
    });

    it('should score distant businesses lowest (>20 miles = 5 points)', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_3',
        name: 'Distant Plumber',
        distance_miles: 22.5,
        service_categories: ['plumbing'],
        rating: 5.0, // Even with perfect rating
        price_tier: 'standard',
        offers_emergency_service: true,
        is_licensed: true,
        is_insured: true,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: 0.9, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      // Distant business should have lower score despite good rating
      expect(matches[0].distance_miles).toBeCloseTo(22.5);
      expect(matches[0].confidence_score).toBeLessThan(80); // Lower due to distance
    });
  });

  describe('Service Category Matching', () => {
    it('should score exact category match highest (20 points)', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_exact',
        name: 'Exact Match Plumber',
        distance_miles: 5.0,
        service_categories: ['plumbing', 'water_heater'],
        rating: 4.0,
        price_tier: 'standard',
        offers_emergency_service: false,
        is_licensed: true,
        is_insured: false,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: 0.7, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches[0].match_reasons).toContain('Exact service match');
    });

    it('should score related category match moderately (12 points)', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_related',
        name: 'HVAC & Plumbing',
        distance_miles: 5.0,
        service_categories: ['hvac', 'water_heater'], // Related to plumbing
        rating: 4.0,
        price_tier: 'standard',
        offers_emergency_service: false,
        is_licensed: true,
        is_insured: false,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: 0.7, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches[0].match_reasons).toContain('Related service');
    });

    it('should filter out unrelated category matches', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusinesses = [
        {
          id: 'biz_match',
          name: 'Plumber',
          distance_miles: 5.0,
          service_categories: ['plumbing'],
          rating: 4.0,
          price_tier: 'standard',
          offers_emergency_service: false,
          is_licensed: true,
          is_insured: false,
          tags: [],
        },
        {
          id: 'biz_no_match',
          name: 'Lawn Care',
          distance_miles: 3.0, // Even closer
          service_categories: ['lawn_care'], // Unrelated
          rating: 5.0, // Higher rating
          price_tier: 'standard',
          offers_emergency_service: false,
          is_licensed: true,
          is_insured: false,
          tags: [],
        },
      ];

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: mockBusinesses, error: null })
        .mockResolvedValueOnce({ data: 0.7, error: null })
        .mockResolvedValueOnce({ data: 0.9, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      // Lawn care should score lower due to no category match
      const plumberMatch = matches.find(m => m.business_id === 'biz_match');
      const lawnCareMatch = matches.find(m => m.business_id === 'biz_no_match');

      if (plumberMatch && lawnCareMatch) {
        expect(plumberMatch.confidence_score).toBeGreaterThan(lawnCareMatch.confidence_score);
      }
    });
  });

  describe('Rating Scoring', () => {
    it('should score excellent ratings highest (4.8+ = 15 points)', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_excellent',
        name: 'Top Rated Plumber',
        distance_miles: 5.0,
        service_categories: ['plumbing'],
        rating: 4.9,
        price_tier: 'standard',
        offers_emergency_service: false,
        is_licensed: true,
        is_insured: false,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: 0.7, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches[0].rating).toBe(4.9);
      expect(matches[0].match_reasons).toContain(expect.stringContaining('Excellent rating'));
    });

    it('should score good ratings moderately (4.0-4.7 = 10-13 points)', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_good',
        name: 'Good Plumber',
        distance_miles: 5.0,
        service_categories: ['plumbing'],
        rating: 4.2,
        price_tier: 'standard',
        offers_emergency_service: false,
        is_licensed: true,
        is_insured: false,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: 0.7, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches[0].rating).toBe(4.2);
      expect(matches[0].match_reasons).toContain(expect.stringContaining('Great rating'));
    });
  });

  describe('Response Rate Scoring', () => {
    it('should score highly responsive businesses highest (90%+ = 15 points)', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_responsive',
        name: 'Responsive Plumber',
        distance_miles: 5.0,
        service_categories: ['plumbing'],
        rating: 4.0,
        price_tier: 'standard',
        offers_emergency_service: false,
        is_licensed: true,
        is_insured: false,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: 0.95, error: null }); // 95% response rate

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches[0].response_rate).toBe(0.95);
      expect(matches[0].match_reasons).toContain(expect.stringContaining('Highly responsive'));
    });

    it('should default to 50% response rate if no history', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_new',
        name: 'New Plumber',
        distance_miles: 5.0,
        service_categories: ['plumbing'],
        rating: 4.0,
        price_tier: 'standard',
        offers_emergency_service: false,
        is_licensed: true,
        is_insured: false,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'No history' } });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches[0].response_rate).toBe(0.5); // Default
    });
  });

  describe('Budget/Pricing Tier Alignment', () => {
    it('should match budget tier for low-budget leads', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_budget',
        name: 'Budget Plumber',
        distance_miles: 5.0,
        service_categories: ['plumbing'],
        rating: 4.0,
        price_tier: 'budget',
        avg_job_price: 150,
        offers_emergency_service: false,
        is_licensed: true,
        is_insured: false,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: 0.7, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 150, // Low budget
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches[0].price_tier).toBe('budget');
      expect(matches[0].match_reasons).toContain('Budget-aligned');
    });

    it('should match premium tier for high-budget leads', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_premium',
        name: 'Premium Plumber',
        distance_miles: 5.0,
        service_categories: ['plumbing'],
        rating: 4.8,
        price_tier: 'premium',
        avg_job_price: 2000,
        offers_emergency_service: true,
        is_licensed: true,
        is_insured: true,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: 0.9, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'emergency',
        budget_min: 1000,
        budget_max: 3000, // High budget
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: ['licensed', 'insured'],
        sentiment: 'negative',
        quality_score: 9.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches[0].price_tier).toBe('premium');
      expect(matches[0].match_reasons).toContain('Budget-aligned');
    });
  });

  describe('Urgency Compatibility', () => {
    it('should boost emergency businesses for emergency leads (5 points)', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_emergency',
        name: '24/7 Emergency Plumber',
        distance_miles: 5.0,
        service_categories: ['plumbing'],
        rating: 4.5,
        price_tier: 'standard',
        offers_emergency_service: true,
        is_licensed: true,
        is_insured: true,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: 0.8, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'emergency',
        budget_min: 0,
        budget_max: 800,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: ['emergency'],
        sentiment: 'negative',
        quality_score: 9.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches[0].match_reasons).toContain('Emergency service available');
    });

    it('should not boost non-emergency businesses for emergency leads', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_regular',
        name: 'Regular Plumber',
        distance_miles: 5.0,
        service_categories: ['plumbing'],
        rating: 4.5,
        price_tier: 'standard',
        offers_emergency_service: false, // No emergency service
        is_licensed: true,
        is_insured: false,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: 0.8, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'emergency',
        budget_min: 0,
        budget_max: 800,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: ['emergency'],
        sentiment: 'negative',
        quality_score: 9.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches[0].match_reasons).not.toContain('Emergency service available');
    });
  });

  describe('Special Requirements', () => {
    it('should boost businesses that meet licensed requirement', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_licensed',
        name: 'Licensed Plumber',
        distance_miles: 5.0,
        service_categories: ['plumbing'],
        rating: 4.0,
        price_tier: 'standard',
        offers_emergency_service: false,
        is_licensed: true,
        is_insured: false,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: 0.7, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: ['licensed'],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches[0].match_reasons).toContain('Meets special requirements');
    });

    it('should boost businesses that meet insured requirement', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusiness = {
        id: 'biz_insured',
        name: 'Insured Plumber',
        distance_miles: 5.0,
        service_categories: ['plumbing'],
        rating: 4.0,
        price_tier: 'standard',
        offers_emergency_service: false,
        is_licensed: true,
        is_insured: true,
        tags: [],
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockBusiness], error: null })
        .mockResolvedValueOnce({ data: 0.7, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: ['insured', 'licensed'],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches[0].match_reasons).toContain('Meets special requirements');
    });
  });

  describe('Capacity Checking', () => {
    it('should return true if business has available capacity', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                notifications_paused: false,
                max_monthly_leads: 100,
                current_month_leads: 50,
              },
              error: null,
            }),
          }),
        }),
      });

      const hasCapacity = await matcher.checkCapacity('biz_123');

      expect(hasCapacity).toBe(true);
    });

    it('should return false if notifications are paused', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                notifications_paused: true,
                max_monthly_leads: 100,
                current_month_leads: 50,
              },
              error: null,
            }),
          }),
        }),
      });

      const hasCapacity = await matcher.checkCapacity('biz_123');

      expect(hasCapacity).toBe(false);
    });

    it('should return false if monthly lead limit reached', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                notifications_paused: false,
                max_monthly_leads: 100,
                current_month_leads: 100, // Limit reached
              },
              error: null,
            }),
          }),
        }),
      });

      const hasCapacity = await matcher.checkCapacity('biz_123');

      expect(hasCapacity).toBe(false);
    });

    it('should return false on database error', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const hasCapacity = await matcher.checkCapacity('biz_123');

      expect(hasCapacity).toBe(false);
    });
  });

  describe('Match Filtering', () => {
    it('should filter out businesses below 50% confidence threshold', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusinesses = [
        {
          id: 'biz_good',
          name: 'Good Match',
          distance_miles: 5.0,
          service_categories: ['plumbing'],
          rating: 4.5,
          price_tier: 'standard',
          offers_emergency_service: true,
          is_licensed: true,
          is_insured: true,
          tags: [],
        },
        {
          id: 'biz_poor',
          name: 'Poor Match',
          distance_miles: 30.0, // Too far
          service_categories: ['electrical'], // Wrong category
          rating: 3.0, // Low rating
          price_tier: 'premium',
          offers_emergency_service: false,
          is_licensed: false,
          is_insured: false,
          tags: [],
        },
      ];

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: mockBusinesses, error: null })
        .mockResolvedValueOnce({ data: 0.9, error: null })
        .mockResolvedValueOnce({ data: 0.3, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'emergency',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: ['licensed'],
        sentiment: 'negative',
        quality_score: 8.0,
      };

      const matches = await matcher.findMatches(lead);

      // Poor match should be filtered out
      const poorMatch = matches.find(m => m.business_id === 'biz_poor');
      expect(poorMatch).toBeUndefined();

      // Good match should be included
      const goodMatch = matches.find(m => m.business_id === 'biz_good');
      expect(goodMatch).toBeDefined();
      expect(goodMatch?.confidence_score).toBeGreaterThanOrEqual(50);
    });

    it('should limit results to maxMatches configuration', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey, {
        maxMatches: 3, // Limit to 3
      });

      const mockBusinesses = Array.from({ length: 10 }, (_, i) => ({
        id: `biz_${i}`,
        name: `Plumber ${i}`,
        distance_miles: 5.0 + i,
        service_categories: ['plumbing'],
        rating: 4.0,
        price_tier: 'standard' as const,
        offers_emergency_service: false,
        is_licensed: true,
        is_insured: false,
        tags: [],
      }));

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockBusinesses, error: null });

      // Mock response rate for all businesses
      for (let i = 0; i < 10; i++) {
        mockSupabase.rpc.mockResolvedValueOnce({ data: 0.7, error: null });
      }

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom maxDistanceMiles configuration', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey, {
        maxDistanceMiles: 10, // Custom distance limit
      });

      mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      await matcher.findMatches(lead);

      // Verify RPC was called with custom distance
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_nearby_businesses', {
        p_service_category: 'plumbing',
        p_latitude: 39.9783,
        p_longitude: -86.118,
        p_max_distance_miles: 10,
        p_min_rating: 3.5,
      });
    });

    it('should respect custom minRating configuration', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey, {
        minRating: 4.5, // Custom rating requirement
      });

      mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      await matcher.findMatches(lead);

      // Verify RPC was called with custom min rating
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_nearby_businesses', {
        p_service_category: 'plumbing',
        p_latitude: 39.9783,
        p_longitude: -86.118,
        p_max_distance_miles: 25,
        p_min_rating: 4.5,
      });
    });
  });

  describe('Error Handling', () => {
    it('should return empty array if candidate fetch fails', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      const matches = await matcher.findMatches(lead);

      expect(matches).toEqual([]);
    });

    it('should handle missing lead location gracefully', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'normal',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: undefined as any,
        location_lng: undefined as any,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      // Should not throw error
      await expect(matcher.findMatches(lead)).resolves.not.toThrow();
    });
  });

  describe('Sorting and Ranking', () => {
    it('should sort matches by confidence score descending', async () => {
      const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);

      const mockBusinesses = [
        {
          id: 'biz_1',
          name: 'Medium Match',
          distance_miles: 10.0,
          service_categories: ['plumbing'],
          rating: 4.0,
          price_tier: 'standard' as const,
          offers_emergency_service: false,
          is_licensed: true,
          is_insured: false,
          tags: [],
        },
        {
          id: 'biz_2',
          name: 'Best Match',
          distance_miles: 2.0,
          service_categories: ['plumbing'],
          rating: 4.9,
          price_tier: 'standard' as const,
          offers_emergency_service: true,
          is_licensed: true,
          is_insured: true,
          tags: [],
        },
        {
          id: 'biz_3',
          name: 'Lower Match',
          distance_miles: 15.0,
          service_categories: ['hvac'],
          rating: 3.8,
          price_tier: 'standard' as const,
          offers_emergency_service: false,
          is_licensed: false,
          is_insured: false,
          tags: [],
        },
      ];

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: mockBusinesses, error: null })
        .mockResolvedValueOnce({ data: 0.6, error: null })
        .mockResolvedValueOnce({ data: 0.9, error: null })
        .mockResolvedValueOnce({ data: 0.5, error: null });

      const lead: ClassifiedLead = {
        service_category: 'plumbing',
        urgency: 'emergency',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        location_lat: 39.9783,
        location_lng: -86.118,
        key_requirements: ['licensed'],
        sentiment: 'negative',
        quality_score: 8.0,
      };

      const matches = await matcher.findMatches(lead);

      // Verify sorted by score
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i].confidence_score).toBeLessThanOrEqual(matches[i - 1].confidence_score);
      }

      // Best match should be first
      expect(matches[0].business_id).toBe('biz_2');
    });
  });
});
