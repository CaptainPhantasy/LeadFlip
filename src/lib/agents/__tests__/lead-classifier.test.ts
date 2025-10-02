/**
 * Lead Classifier Subagent Unit Tests
 *
 * Tests the Lead Classifier subagent according to specifications in CLAUDE.md
 * Requires Jest to be installed: npm install --save-dev jest @types/jest ts-jest
 */

import { classifyLead, classifyLeadBatch, classifyLeadSafe } from '../lead-classifier';
import type { ClassifiedLead, ServiceCategory, Urgency, Sentiment } from '@/types/lead-classifier';

// Mock the Claude Agent SDK to avoid real API calls during tests
jest.mock('@anthropic-ai/claude-agent-sdk', () => {
  return {
    ClaudeSDKClient: jest.fn().mockImplementation(() => ({
      query: jest.fn(),
      receiveResponse: jest.fn(async function* () {
        // Return mock response based on the query
        const mockResponse = {
          content: [{
            text: JSON.stringify({
              service_category: 'plumbing',
              urgency: 'emergency',
              budget_min: 0,
              budget_max: 500,
              location_zip: '46032',
              key_requirements: ['water heater', 'leak repair'],
              sentiment: 'negative',
              quality_score: 8.5
            })
          }]
        };
        yield mockResponse;
      }),
    })),
  };
});

describe('Lead Classifier Subagent', () => {
  describe('classifyLead', () => {
    it('should classify emergency plumbing lead correctly', async () => {
      const input = "My water heater is leaking, need someone ASAP in Carmel 46032, budget $500 max";
      const result = await classifyLead(input);

      // Verify all required fields are present
      expect(result).toBeDefined();
      expect(result.service_category).toBe('plumbing');
      expect(result.urgency).toBe('emergency');
      expect(result.budget_min).toBe(0);
      expect(result.budget_max).toBe(500);
      expect(result.location_zip).toBe('46032');
      expect(result.key_requirements).toEqual(['water heater', 'leak repair']);
      expect(result.sentiment).toBe('negative');
      expect(result.quality_score).toBeGreaterThan(7);
    });

    it('should handle vague submissions with low quality score', async () => {
      // Override mock for this test
      const { ClaudeSDKClient } = require('@anthropic-ai/claude-agent-sdk');
      ClaudeSDKClient.mockImplementationOnce(() => ({
        query: jest.fn(),
        receiveResponse: jest.fn(async function* () {
          yield {
            content: [{
              text: JSON.stringify({
                service_category: 'other',
                urgency: 'low',
                budget_min: 0,
                budget_max: null,
                location_zip: null,
                key_requirements: [],
                sentiment: 'neutral',
                quality_score: 2.0
              })
            }]
          };
        }),
      }));

      const input = "need help with stuff";
      const result = await classifyLead(input);

      expect(result.service_category).toBe('other');
      expect(result.quality_score).toBeLessThan(5);
    });

    it('should throw error for empty input', async () => {
      await expect(classifyLead('')).rejects.toThrow('Lead text cannot be empty');
      await expect(classifyLead('   ')).rejects.toThrow('Lead text cannot be empty');
    });

    it('should handle lawn care service lead', async () => {
      const { ClaudeSDKClient } = require('@anthropic-ai/claude-agent-sdk');
      ClaudeSDKClient.mockImplementationOnce(() => ({
        query: jest.fn(),
        receiveResponse: jest.fn(async function* () {
          yield {
            content: [{
              text: JSON.stringify({
                service_category: 'lawn_care',
                urgency: 'medium',
                budget_min: 0,
                budget_max: 100,
                location_zip: null,
                key_requirements: ['lawn mowing', 'Fishers area'],
                sentiment: 'neutral',
                quality_score: 6.5
              })
            }]
          };
        }),
      }));

      const input = "Looking for lawn mowing service in Fishers area, about $100, next week works";
      const result = await classifyLead(input);

      expect(result.service_category).toBe('lawn_care');
      expect(result.urgency).toBe('medium');
      expect(result.budget_max).toBe(100);
      expect(result.quality_score).toBeGreaterThanOrEqual(6);
      expect(result.quality_score).toBeLessThan(8);
    });

    it('should handle JSON in markdown code blocks', async () => {
      const { ClaudeSDKClient } = require('@anthropic-ai/claude-agent-sdk');
      ClaudeSDKClient.mockImplementationOnce(() => ({
        query: jest.fn(),
        receiveResponse: jest.fn(async function* () {
          yield {
            content: [{
              text: '```json\n{"service_category":"plumbing","urgency":"emergency","budget_min":0,"budget_max":500,"location_zip":"46032","key_requirements":["water heater"],"sentiment":"negative","quality_score":8.5}\n```'
            }]
          };
        }),
      }));

      const input = "Water heater emergency";
      const result = await classifyLead(input);

      expect(result.service_category).toBe('plumbing');
      expect(result.quality_score).toBe(8.5);
    });
  });

  describe('Type Validation', () => {
    it('should return properly typed ClassifiedLead object', async () => {
      const input = "HVAC repair needed urgently in 46038, budget $300-$800";
      const result = await classifyLead(input);

      // Type checks
      expect(typeof result.service_category).toBe('string');
      expect(typeof result.urgency).toBe('string');
      expect(typeof result.budget_min).toBe('number');
      expect(typeof result.budget_max === 'number' || result.budget_max === null).toBe(true);
      expect(typeof result.location_zip === 'string' || result.location_zip === null).toBe(true);
      expect(Array.isArray(result.key_requirements)).toBe(true);
      expect(typeof result.sentiment).toBe('string');
      expect(typeof result.quality_score).toBe('number');

      // Value range checks
      expect(result.quality_score).toBeGreaterThanOrEqual(0);
      expect(result.quality_score).toBeLessThanOrEqual(10);
      expect(result.budget_min).toBeGreaterThanOrEqual(0);

      if (result.location_zip) {
        expect(result.location_zip).toMatch(/^\d{5}$/);
      }
    });

    it('should validate service category enum values', async () => {
      const validCategories: ServiceCategory[] = [
        'plumbing', 'electrical', 'hvac', 'lawn_care', 'landscaping',
        'cleaning', 'pest_control', 'roofing', 'painting', 'handyman',
        'appliance_repair', 'carpentry', 'flooring', 'snow_removal', 'moving', 'other'
      ];

      const input = "Need plumbing service";
      const result = await classifyLead(input);

      expect(validCategories).toContain(result.service_category);
    });

    it('should validate urgency enum values', async () => {
      const validUrgencies: Urgency[] = ['emergency', 'high', 'medium', 'low'];

      const input = "Need service ASAP";
      const result = await classifyLead(input);

      expect(validUrgencies).toContain(result.urgency);
    });

    it('should validate sentiment enum values', async () => {
      const validSentiments: Sentiment[] = ['positive', 'neutral', 'negative'];

      const input = "Happy to find a service";
      const result = await classifyLead(input);

      expect(validSentiments).toContain(result.sentiment);
    });
  });

  describe('classifyLeadBatch', () => {
    it('should process multiple leads sequentially', async () => {
      const inputs = [
        "Plumbing emergency in 46032",
        "Lawn care needed next week",
        "HVAC maintenance required"
      ];

      const results = await classifyLeadBatch(inputs);

      expect(results).toHaveLength(3);
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      expect(results[2]).toBeDefined();

      // Verify each result has proper structure
      results.forEach(result => {
        expect(result.service_category).toBeDefined();
        expect(result.quality_score).toBeGreaterThanOrEqual(0);
      });
    });

    it('should maintain order of results', async () => {
      const inputs = [
        "First lead - plumbing",
        "Second lead - electrical",
        "Third lead - lawn care"
      ];

      const results = await classifyLeadBatch(inputs);

      expect(results).toHaveLength(3);
      // Results should be in same order as inputs
      // (This is a structural test - actual values depend on mock)
    });
  });

  describe('classifyLeadSafe', () => {
    it('should return null on error instead of throwing', async () => {
      const { ClaudeSDKClient } = require('@anthropic-ai/claude-agent-sdk');
      ClaudeSDKClient.mockImplementationOnce(() => ({
        query: jest.fn().mockRejectedValue(new Error('API Error')),
        receiveResponse: jest.fn(),
      }));

      const input = "Some lead text";
      const result = await classifyLeadSafe(input);

      expect(result).toBeNull();
    });

    it('should return classified lead on success', async () => {
      const input = "Water heater emergency";
      const result = await classifyLeadSafe(input);

      expect(result).not.toBeNull();
      expect(result?.service_category).toBeDefined();
    });
  });

  describe('Quality Score Guidelines (from CLAUDE.md)', () => {
    it('should score high-quality leads between 8-10', async () => {
      const { ClaudeSDKClient } = require('@anthropic-ai/claude-agent-sdk');
      ClaudeSDKClient.mockImplementationOnce(() => ({
        query: jest.fn(),
        receiveResponse: jest.fn(async function* () {
          yield {
            content: [{
              text: JSON.stringify({
                service_category: 'plumbing',
                urgency: 'emergency',
                budget_min: 300,
                budget_max: 800,
                location_zip: '46032',
                key_requirements: ['water heater', 'leak', 'licensed plumber'],
                sentiment: 'neutral',
                quality_score: 9.0
              })
            }]
          };
        }),
      }));

      const input = "Need licensed plumber for water heater leak in 46032, budget $300-800, ASAP, call me at 555-1234";
      const result = await classifyLead(input);

      expect(result.quality_score).toBeGreaterThanOrEqual(8);
      expect(result.quality_score).toBeLessThanOrEqual(10);
    });

    it('should score medium-quality leads between 5-7', async () => {
      const { ClaudeSDKClient } = require('@anthropic-ai/claude-agent-sdk');
      ClaudeSDKClient.mockImplementationOnce(() => ({
        query: jest.fn(),
        receiveResponse: jest.fn(async function* () {
          yield {
            content: [{
              text: JSON.stringify({
                service_category: 'lawn_care',
                urgency: 'medium',
                budget_min: 0,
                budget_max: 100,
                location_zip: null,
                key_requirements: ['lawn mowing'],
                sentiment: 'neutral',
                quality_score: 6.0
              })
            }]
          };
        }),
      }));

      const input = "Looking for lawn mowing service, about $100";
      const result = await classifyLead(input);

      expect(result.quality_score).toBeGreaterThanOrEqual(5);
      expect(result.quality_score).toBeLessThan(8);
    });

    it('should score low-quality/spam leads between 0-4', async () => {
      const { ClaudeSDKClient } = require('@anthropic-ai/claude-agent-sdk');
      ClaudeSDKClient.mockImplementationOnce(() => ({
        query: jest.fn(),
        receiveResponse: jest.fn(async function* () {
          yield {
            content: [{
              text: JSON.stringify({
                service_category: 'other',
                urgency: 'low',
                budget_min: 0,
                budget_max: null,
                location_zip: null,
                key_requirements: [],
                sentiment: 'neutral',
                quality_score: 1.5
              })
            }]
          };
        }),
      }));

      const input = "test";
      const result = await classifyLead(input);

      expect(result.quality_score).toBeLessThanOrEqual(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leads with multiple service types', async () => {
      const { ClaudeSDKClient } = require('@anthropic-ai/claude-agent-sdk');
      ClaudeSDKClient.mockImplementationOnce(() => ({
        query: jest.fn(),
        receiveResponse: jest.fn(async function* () {
          yield {
            content: [{
              text: JSON.stringify({
                service_category: 'handyman',
                urgency: 'medium',
                budget_min: 0,
                budget_max: 500,
                location_zip: '46032',
                key_requirements: ['drywall repair', 'painting', 'door installation'],
                sentiment: 'neutral',
                quality_score: 7.5
              })
            }]
          };
        }),
      }));

      const input = "Need handyman for drywall repair, painting, and door installation in 46032, budget $500";
      const result = await classifyLead(input);

      expect(result.key_requirements.length).toBeGreaterThan(1);
    });

    it('should handle leads with budget ranges', async () => {
      const { ClaudeSDKClient } = require('@anthropic-ai/claude-agent-sdk');
      ClaudeSDKClient.mockImplementationOnce(() => ({
        query: jest.fn(),
        receiveResponse: jest.fn(async function* () {
          yield {
            content: [{
              text: JSON.stringify({
                service_category: 'hvac',
                urgency: 'high',
                budget_min: 300,
                budget_max: 800,
                location_zip: '46038',
                key_requirements: ['HVAC repair'],
                sentiment: 'neutral',
                quality_score: 8.0
              })
            }]
          };
        }),
      }));

      const input = "HVAC repair needed, budget $300-$800";
      const result = await classifyLead(input);

      expect(result.budget_min).toBeLessThan(result.budget_max || Infinity);
    });

    it('should handle international zip codes gracefully', async () => {
      const { ClaudeSDKClient } = require('@anthropic-ai/claude-agent-sdk');
      ClaudeSDKClient.mockImplementationOnce(() => ({
        query: jest.fn(),
        receiveResponse: jest.fn(async function* () {
          yield {
            content: [{
              text: JSON.stringify({
                service_category: 'plumbing',
                urgency: 'emergency',
                budget_min: 0,
                budget_max: 500,
                location_zip: null,
                key_requirements: ['plumbing', 'emergency'],
                sentiment: 'negative',
                quality_score: 7.0
              })
            }]
          };
        }),
      }));

      const input = "Emergency plumbing needed in SW1A 1AA London";
      const result = await classifyLead(input);

      // Should extract location info in key_requirements even if not US zip
      expect(result.key_requirements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw descriptive error when API fails', async () => {
      const { ClaudeSDKClient } = require('@anthropic-ai/claude-agent-sdk');
      ClaudeSDKClient.mockImplementationOnce(() => ({
        query: jest.fn().mockRejectedValue(new Error('API timeout')),
        receiveResponse: jest.fn(),
      }));

      const input = "Plumbing service needed";
      await expect(classifyLead(input)).rejects.toThrow(/Lead classification failed/);
    });

    it('should throw error when response is empty', async () => {
      const { ClaudeSDKClient } = require('@anthropic-ai/claude-agent-sdk');
      ClaudeSDKClient.mockImplementationOnce(() => ({
        query: jest.fn(),
        receiveResponse: jest.fn(async function* () {
          yield { content: [] };
        }),
      }));

      const input = "Plumbing service needed";
      await expect(classifyLead(input)).rejects.toThrow('No response received');
    });

    it('should throw error for invalid JSON structure', async () => {
      const { ClaudeSDKClient } = require('@anthropic-ai/claude-agent-sdk');
      ClaudeSDKClient.mockImplementationOnce(() => ({
        query: jest.fn(),
        receiveResponse: jest.fn(async function* () {
          yield {
            content: [{
              text: JSON.stringify({
                // Missing required fields
                service_category: 'plumbing'
              })
            }]
          };
        }),
      }));

      const input = "Plumbing service needed";
      await expect(classifyLead(input)).rejects.toThrow(/Invalid classification structure/);
    });
  });
});
