/**
 * Lead Classifier Subagent
 *
 * This subagent uses Claude Agent SDK to classify unstructured consumer
 * problem descriptions into structured, actionable data for matching with
 * local service businesses.
 *
 * Architecture:
 * - Single-turn classification (maxTurns: 1) for speed
 * - System prompt optimized for JSON output
 * - No external tool access needed (pure NLP task)
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import path from 'path';
import type { ClassifiedLead } from '@/types/lead-classifier';

// Re-export the type for convenience
export type { ClassifiedLead };

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Validates that the classification result matches the expected structure
 */
function isValidClassification(data: unknown): data is ClassifiedLead {
  if (typeof data !== 'object' || data === null) return false;

  const lead = data as Partial<ClassifiedLead>;

  return (
    typeof lead.service_category === 'string' &&
    typeof lead.urgency === 'string' &&
    typeof lead.budget_min === 'number' &&
    (typeof lead.budget_max === 'number' || lead.budget_max === null) &&
    (typeof lead.location_zip === 'string' || lead.location_zip === null) &&
    Array.isArray(lead.key_requirements) &&
    typeof lead.sentiment === 'string' &&
    typeof lead.quality_score === 'number'
  );
}

/**
 * Extracts JSON from text that may contain markdown code blocks
 */
function extractJSON(text: string): unknown {
  // Try to find JSON in markdown code blocks
  const codeBlockMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1]);
  }

  // Try to find JSON without code blocks
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  // If no JSON pattern found, try parsing the whole text
  return JSON.parse(text);
}

/**
 * Classifies a raw consumer problem description into structured data
 *
 * @param rawText - Unstructured consumer problem description
 * @returns Structured lead classification with quality score
 * @throws Error if classification fails or returns invalid data
 *
 * @example
 * ```typescript
 * const result = await classifyLead(
 *   "My water heater is leaking, need someone ASAP in Carmel 46032, budget $500 max"
 * );
 * console.log(result.service_category); // "plumbing"
 * console.log(result.quality_score); // 8.5
 * ```
 */
export async function classifyLead(rawText: string): Promise<ClassifiedLead> {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('Lead text cannot be empty');
  }

  try {
    // Load system prompt from file
    const systemPromptPath = path.join(process.cwd(), '.claude', 'agents', 'lead-classifier.md');
    let systemPrompt = '';

    try {
      systemPrompt = await readFile(systemPromptPath, 'utf-8');
    } catch {
      // Fallback inline prompt if file doesn't exist
      systemPrompt = `You are a lead classification specialist. Extract structured data from consumer service requests.

Return ONLY valid JSON matching this structure:
{
  "service_category": "plumbing|electrical|hvac|lawn_care|roofing|painting|cleaning|other",
  "urgency": "emergency|urgent|standard|flexible",
  "budget_min": number,
  "budget_max": number | null,
  "location_zip": "string" | null,
  "key_requirements": ["array", "of", "strings"],
  "sentiment": "positive|neutral|negative",
  "quality_score": number (0-10)
}`;
    }

    // Send classification request
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Classify this consumer service request:\n\n"${rawText}"\n\nReturn ONLY the JSON structure, no other text.`,
        },
      ],
    });

    // Extract text from response
    const classificationText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('');

    if (!classificationText) {
      throw new Error('No response received from classifier');
    }

    // Parse JSON response
    const classifiedData = extractJSON(classificationText);

    // Validate structure
    if (!isValidClassification(classifiedData)) {
      throw new Error(
        `Invalid classification structure received: ${JSON.stringify(classifiedData)}`
      );
    }

    return classifiedData;

  } catch (error) {
    // Enhanced error handling with context
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Lead classification failed for text "${rawText.substring(0, 50)}...": ${errorMessage}`
    );
  }
}

/**
 * Batch classify multiple leads (processes sequentially to avoid rate limits)
 *
 * @param rawTexts - Array of unstructured consumer problem descriptions
 * @returns Array of classified leads (same order as input)
 * @throws Error if any classification fails
 */
export async function classifyLeadBatch(rawTexts: string[]): Promise<ClassifiedLead[]> {
  const results: ClassifiedLead[] = [];

  for (const text of rawTexts) {
    const result = await classifyLead(text);
    results.push(result);
  }

  return results;
}

/**
 * Classifies a lead with error handling that returns null on failure
 * (Useful for batch processing where you don't want to fail the entire batch)
 *
 * @param rawText - Unstructured consumer problem description
 * @returns Classified lead or null if classification fails
 */
export async function classifyLeadSafe(rawText: string): Promise<ClassifiedLead | null> {
  try {
    return await classifyLead(rawText);
  } catch (error) {
    console.error(`Lead classification failed: ${error}`);
    return null;
  }
}
