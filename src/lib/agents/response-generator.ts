/**
 * Response Generator Subagent
 *
 * Purpose: Create personalized notification messages for matched businesses
 *
 * Output: Professional 3-sentence response template (50-100 words)
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Urgency } from '@/types/lead-classifier';

export interface LeadSummary {
  service_category: string;
  urgency: Urgency;
  location_city: string;
  location_zip: string | null;
  budget_max: number | null;
  key_requirements: string[];
  problem_description: string;
}

export interface BusinessProfile {
  name: string;
  rating: number;
  years_in_business: number;
  service_categories: string[];
  completed_jobs: number;
}

export interface GeneratedResponse {
  subject: string;
  message: string;
  call_to_action: string;
}

export class ResponseGeneratorAgent {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Generate personalized notification message for a business
   */
  async generateResponse(
    lead: LeadSummary,
    business: BusinessProfile
  ): Promise<GeneratedResponse> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(lead, business);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseResponse(content.text);
    } catch (error) {
      console.error('Error generating response:', error);
      // Fallback to template-based response
      return this.generateFallbackResponse(lead, business);
    }
  }

  /**
   * Build system prompt for response generation
   */
  private buildSystemPrompt(): string {
    return `You are a professional notification writer for LeadFlip, a reverse marketplace for local services.

Your job is to write compelling, personalized messages to local businesses when they've been matched with a potential customer lead.

REQUIREMENTS:
1. Keep it professional and concise (50-100 words)
2. Create excitement about the opportunity
3. Highlight urgency if applicable
4. Include key lead details (location, budget, requirements)
5. End with clear call-to-action
6. Use business name naturally in the message
7. Avoid generic phrases like "great opportunity" or "perfect fit"

OUTPUT FORMAT (JSON):
{
  "subject": "Brief subject line (5-8 words)",
  "message": "3-sentence professional message body",
  "call_to_action": "Clear action button text (2-4 words)"
}

TONE: Professional, enthusiastic, action-oriented

EXAMPLES OF GOOD MESSAGES:
- "A homeowner in Carmel needs emergency plumbing repair for a leaking water heater today. Budget is $500 max. They specifically requested a licensed plumber."
- "Fishers resident is ready to hire for lawn mowing service starting this week. Weekly recurring service, $100 per visit budget. They've used lawn services before and have a large yard."

EXAMPLES OF BAD MESSAGES:
- "Great opportunity for your business!" (too generic)
- "Someone needs help with something" (not specific enough)
- Long paragraphs with unnecessary filler`;
  }

  /**
   * Build user prompt with lead and business details
   */
  private buildUserPrompt(lead: LeadSummary, business: BusinessProfile): string {
    const urgencyText =
      lead.urgency === 'emergency'
        ? 'EMERGENCY - needs immediate attention'
        : lead.urgency === 'high'
        ? 'URGENT - needs service within 24 hours'
        : lead.urgency === 'medium'
        ? 'Standard timeline'
        : 'Flexible timeline';

    return `Generate a notification message for this matched lead:

BUSINESS DETAILS:
- Name: ${business.name}
- Rating: ${business.rating}/5 stars
- Experience: ${business.years_in_business} years in business
- Completed jobs: ${business.completed_jobs}
- Services: ${business.service_categories.join(', ')}

LEAD DETAILS:
- Service needed: ${lead.service_category}
- Location: ${lead.location_city}, ${lead.location_zip}
- Urgency: ${urgencyText}
- Budget: Up to $${lead.budget_max}
- Requirements: ${lead.key_requirements.join(', ')}
- Problem description: "${lead.problem_description}"

Generate a personalized notification message that will make ${business.name} excited to respond to this lead. Output JSON only.`;
  }

  /**
   * Parse Claude's response into structured format
   */
  private parseResponse(rawResponse: string): GeneratedResponse {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(rawResponse);
      return {
        subject: parsed.subject || 'New Lead Match',
        message: parsed.message || rawResponse,
        call_to_action: parsed.call_to_action || 'View Lead',
      };
    } catch {
      // If not JSON, treat as plain text message
      return {
        subject: 'New Lead Match Available',
        message: rawResponse.trim(),
        call_to_action: 'View Details',
      };
    }
  }

  /**
   * Generate fallback response using templates (if API fails)
   */
  private generateFallbackResponse(
    lead: LeadSummary,
    business: BusinessProfile
  ): GeneratedResponse {
    const urgencyPrefix =
      lead.urgency === 'emergency'
        ? '🚨 EMERGENCY: '
        : lead.urgency === 'high'
        ? '⚡ URGENT: '
        : '';

    const subject = `${urgencyPrefix}New ${lead.service_category} lead in ${lead.location_city}`;

    const urgencyText =
      lead.urgency === 'emergency'
        ? 'needs immediate attention'
        : lead.urgency === 'high'
        ? 'needs service within 24 hours'
        : 'is ready to hire';

    const message = `A customer in ${lead.location_city} ${urgencyText} for ${lead.service_category} services. Budget is up to $${lead.budget_max}. ${lead.key_requirements.length > 0 ? `Requirements: ${lead.key_requirements.join(', ')}.` : ''} Respond quickly to secure this lead.`;

    const call_to_action =
      lead.urgency === 'emergency' ? 'Respond Now' : 'View Lead';

    return { subject, message, call_to_action };
  }

  /**
   * Generate batch responses for multiple businesses
   */
  async generateBatchResponses(
    lead: LeadSummary,
    businesses: BusinessProfile[]
  ): Promise<Map<string, GeneratedResponse>> {
    const responses = new Map<string, GeneratedResponse>();

    // Generate responses in parallel (max 5 at a time to avoid rate limits)
    const batchSize = 5;
    for (let i = 0; i < businesses.length; i += batchSize) {
      const batch = businesses.slice(i, i + batchSize);
      const batchPromises = batch.map(async (business) => {
        const response = await this.generateResponse(lead, business);
        return { businessName: business.name, response };
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ businessName, response }) => {
        responses.set(businessName, response);
      });
    }

    return responses;
  }
}

/**
 * Standalone function for quick response generation (used by orchestrator)
 */
export async function generateNotificationMessage(
  lead: LeadSummary,
  business: BusinessProfile
): Promise<GeneratedResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const generator = new ResponseGeneratorAgent(apiKey);
  return generator.generateResponse(lead, business);
}
