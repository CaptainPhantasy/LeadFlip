/**
 * Lead Classifier Agent Tests
 *
 * Tests the lead classification functionality including:
 * - Valid lead classification
 * - Vague/low-quality lead handling
 * - JSON extraction from markdown
 * - Error handling
 *
 * [2025-10-01 8:35 PM] Agent 3: Created lead classifier tests
 */

import { classifyLead, classifyLeadSafe, classifyLeadBatch } from '@/lib/agents/lead-classifier';

// Mock the entire module implementation
jest.mock('@anthropic-ai/sdk');

// Import after mocking
import Anthropic from '@anthropic-ai/sdk';

const mockCreate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  // Setup mock implementation
  (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
    () =>
      ({
        messages: {
          create: mockCreate,
        },
      } as any)
  );
});

describe('Lead Classifier Agent', () => {
  describe('classifyLead - Valid Emergency Lead', () => {
    it('should classify emergency plumbing lead correctly', async () => {
      const validClassification = {
        service_category: 'plumbing',
        urgency: 'emergency',
        budget_min: 0,
        budget_max: 500,
        location_zip: '46032',
        key_requirements: ['water heater', 'leak repair', 'licensed plumber'],
        sentiment: 'negative',
        quality_score: 8.5,
      };

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(validClassification),
          },
        ],
      });

      const input = "My water heater is leaking badly, need someone ASAP in Carmel 46032, budget $500 max, must be licensed";
      const result = await classifyLead(input);

      expect(result).toMatchObject({
        service_category: 'plumbing',
        urgency: 'emergency',
        budget_max: 500,
        location_zip: '46032',
        quality_score: expect.any(Number),
      });

      expect(result.quality_score).toBeGreaterThan(7);
      expect(result.key_requirements).toContain('water heater');
      expect(result.sentiment).toBe('negative');
    });

    it('should extract JSON from markdown code blocks', async () => {
      const validClassification = {
        service_category: 'lawn_care',
        urgency: 'medium',
        budget_min: 50,
        budget_max: 100,
        location_zip: '46038',
        key_requirements: ['lawn mowing', 'weekly service'],
        sentiment: 'neutral',
        quality_score: 7.0,
      };

      // Claude often wraps JSON in markdown code blocks
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `Here's the classification:\n\n\`\`\`json\n${JSON.stringify(validClassification, null, 2)}\n\`\`\``,
          },
        ],
      });

      const input = "Need lawn mowed weekly in Fishers 46038, around $100 per visit";
      const result = await classifyLead(input);

      expect(result.service_category).toBe('lawn_care');
      expect(result.urgency).toBe('medium');
      expect(result.budget_max).toBe(100);
    });
  });

  describe('classifyLead - Low Quality Leads', () => {
    it('should handle vague submissions with low quality score', async () => {
      const vagueClassification = {
        service_category: 'other',
        urgency: 'low',
        budget_min: 0,
        budget_max: null,
        location_zip: null,
        key_requirements: [],
        sentiment: 'neutral',
        quality_score: 3.0,
      };

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(vagueClassification),
          },
        ],
      });

      const input = "need help with stuff";
      const result = await classifyLead(input);

      expect(result.quality_score).toBeLessThan(5);
      expect(result.service_category).toBe('other');
      expect(result.location_zip).toBeNull();
    });

    it('should assign low quality score for incomplete information', async () => {
      const incompleteClassification = {
        service_category: 'plumbing',
        urgency: 'medium',
        budget_min: 0,
        budget_max: null,
        location_zip: null,
        key_requirements: ['help'],
        sentiment: 'neutral',
        quality_score: 4.5,
      };

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(incompleteClassification),
          },
        ],
      });

      const input = "I think I need a plumber maybe";
      const result = await classifyLead(input);

      expect(result.quality_score).toBeLessThan(6);
    });
  });

  describe('classifyLead - Error Handling', () => {
    it('should throw error for empty input', async () => {
      await expect(classifyLead('')).rejects.toThrow('Lead text cannot be empty');
    });

    it('should throw error for whitespace-only input', async () => {
      await expect(classifyLead('   ')).rejects.toThrow('Lead text cannot be empty');
    });

    it('should throw error if Anthropic API fails', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      const input = "Need plumber in Carmel";
      await expect(classifyLead(input)).rejects.toThrow('Lead classification failed');
    });

    it('should throw error for invalid JSON response', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'This is not valid JSON',
          },
        ],
      });

      const input = "Need plumber";
      await expect(classifyLead(input)).rejects.toThrow();
    });

    it('should throw error for invalid classification structure', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              service_category: 'plumbing',
              // Missing required fields
            }),
          },
        ],
      });

      const input = "Need plumber";
      await expect(classifyLead(input)).rejects.toThrow('Invalid classification structure');
    });
  });

  describe('classifyLeadSafe - Safe Wrapper', () => {
    it('should return null on classification failure', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      const input = "Need plumber";
      const result = await classifyLeadSafe(input);

      expect(result).toBeNull();
    });

    it('should return classified lead on success', async () => {
      const validClassification = {
        service_category: 'electrical',
        urgency: 'high',
        budget_min: 200,
        budget_max: 500,
        location_zip: '46032',
        key_requirements: ['outlet repair'],
        sentiment: 'neutral',
        quality_score: 7.5,
      };

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(validClassification),
          },
        ],
      });

      const input = "Outlet sparking, need electrician today, Carmel 46032, budget $200-500";
      const result = await classifyLeadSafe(input);

      expect(result).not.toBeNull();
      expect(result?.service_category).toBe('electrical');
    });
  });

  describe('classifyLeadBatch - Batch Processing', () => {
    it('should classify multiple leads sequentially', async () => {
      const classifications = [
        {
          service_category: 'plumbing',
          urgency: 'emergency',
          budget_min: 0,
          budget_max: 500,
          location_zip: '46032',
          key_requirements: ['leak repair'],
          sentiment: 'negative',
          quality_score: 8.0,
        },
        {
          service_category: 'lawn_care',
          urgency: 'medium',
          budget_min: 50,
          budget_max: 100,
          location_zip: '46038',
          key_requirements: ['mowing'],
          sentiment: 'neutral',
          quality_score: 7.0,
        },
      ];

      mockCreate
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify(classifications[0]) }],
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify(classifications[1]) }],
        });

      const inputs = [
        "Water leak emergency in Carmel 46032, budget $500",
        "Need lawn mowed in Fishers 46038, $100 budget",
      ];

      const results = await classifyLeadBatch(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].service_category).toBe('plumbing');
      expect(results[1].service_category).toBe('lawn_care');
    });

    it('should fail entire batch if one classification fails', async () => {
      mockCreate
        .mockResolvedValueOnce({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                service_category: 'plumbing',
                urgency: 'emergency',
                budget_min: 0,
                budget_max: 500,
                location_zip: '46032',
                key_requirements: [],
                sentiment: 'negative',
                quality_score: 8.0,
              }),
            },
          ],
        })
        .mockRejectedValueOnce(new Error('API error'));

      const inputs = [
        "Water leak in Carmel",
        "Need lawn care",
      ];

      await expect(classifyLeadBatch(inputs)).rejects.toThrow();
    });
  });
});
