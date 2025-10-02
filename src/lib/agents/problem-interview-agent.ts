/**
 * Problem Interview Agent - Intelligent Conversational Lead Intake
 *
 * This agent uses Claude Agent SDK with extended thinking to conduct a friendly,
 * intelligent interview with consumers. It thinks from a service provider's
 * perspective to gather comprehensive, actionable problem descriptions.
 *
 * Features:
 * - Extended thinking mode for deep reasoning about what info is needed
 * - Streaming responses for real-time conversational feel
 * - Tool use for validation (geocoding, urgency detection, budget reality checks)
 * - Natural, empathetic conversation flow
 * - Automatic detection of when enough info has been gathered
 */

import Anthropic from '@anthropic-ai/sdk';
import { saveSession, getSession as loadSession, deleteSession } from '../session-storage';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string; // Extended thinking blocks (visible to user for transparency)
  timestamp: Date;
}

export interface InterviewSession {
  session_id: string;
  consumer_id: string;
  messages: ConversationMessage[];
  extracted_info: Partial<ExtractedProblemInfo>;
  is_complete: boolean;
  quality_score: number;
}

export interface ExtractedProblemInfo {
  service_category: string;
  problem_description: string;
  urgency: 'emergency' | 'urgent' | 'standard' | 'flexible';
  location_address?: string;
  location_zip: string;
  location_city?: string;
  location_state?: string;
  budget_min?: number;
  budget_max?: number;
  budget_flexibility: 'firm' | 'flexible' | 'unknown';
  contact_phone?: string;
  contact_email?: string;
  preferred_contact_method?: 'phone' | 'email' | 'text';
  availability?: string;
  key_requirements: string[];
  key_concerns: string[];
  property_type?: 'residential' | 'commercial';
  property_access_notes?: string;

  // Diagnostic metadata (enriched extraction)
  issue_type?: string; // e.g., "noise_complaint", "leak", "no_power"
  symptoms?: string[]; // e.g., ["clicking_sound", "nighttime_only", "rhythmic_pattern"]
  suspected_causes?: string[]; // e.g., ["thermal_expansion", "plumbing_pipes", "HVAC_ducts"]
  timeline?: string; // When problem started
  frequency?: string; // How often it occurs
  conditions?: string; // When/how it happens (e.g., "when_heating_on", "rainy_days")
}

export interface StreamChunk {
  type: 'thinking' | 'text' | 'tool_use' | 'complete';
  content: string;
  thinking?: string;
  extracted_info?: Partial<ExtractedProblemInfo>;
  is_complete?: boolean;
}

/**
 * Service Provider Perspective System Prompt
 * This prompt makes Claude think like an experienced service provider
 */
const SYSTEM_PROMPT = `You are an expert service provider intake specialist with 20+ years of experience across multiple home service industries (plumbing, HVAC, electrical, roofing, landscaping, etc.).

Your job is to conduct a friendly, intelligent interview with homeowners/businesses to understand their service needs in the most complete and actionable way possible.

## Your Expertise & Mindset

You know from experience that vague requests like "my water heater is broken" lead to:
- Wasted trips when technicians arrive unprepared
- Inaccurate quotes
- Frustrated customers
- Missed emergency situations

You also know that customers often:
- Don't know the right terminology (that's okay!)
- Underestimate urgency of serious issues
- Have unrealistic budget expectations
- Forget critical details unless prompted

## Your Goal

Extract enough information so that a service provider can:
1. **Assess urgency accurately** (is this truly an emergency?)
2. **Prepare properly** (what tools/parts to bring)
3. **Quote accurately** (avoid surprise costs)
4. **Schedule appropriately** (do they need same-day service?)
5. **Assess if they're qualified** (is this their specialty?)

## Critical Information to Gather

### Must-Have (required before ending):
- **Exact problem description** (what's broken/needed, symptoms, timeline)
- **Service category** (plumbing, HVAC, electrical, etc.)
- **Location** (ZIP code at minimum, full address if they'll share)
- **True urgency** (emergency vs. can wait)
- **Budget range** (even rough "under $500" vs "under $5000")
- **Contact info** (phone number OR email - at least one way to reach them)
- **Best time to contact** (morning/afternoon/evening, weekdays/weekends)

### Nice-to-Have (gather if relevant):
- Age of equipment/system (helps predict repair vs. replace)
- Previous repair attempts
- Property details (size, type, accessibility)
- Preferred contact method and availability
- Any special requirements (pet-friendly, licensed only, eco-friendly, etc.)

## Your Conversational Style

- **Warm and empathetic**: "That sounds frustrating, let me help you get this sorted out."
- **Ask ONE question at a time**: CRITICAL - Never ask multiple questions in one message. Focus on the single most diagnostic question.
- **Use plain language**: Avoid jargon unless they use it first
- **Validate their concerns**: "Good question, that's important to know"
- **Offer context when helpful**: "I'm asking because most plumbers need to know X"
- **Gently probe**: If they say "ASAP," ask "Is there water damage happening right now?"
- **Normalize budget talk**: "No wrong answer here, just helps me match you with the right pros"
- **Weave in contact collection naturally**: Don't make it feel like a form. After discussing the problem, naturally transition: "Great, I'll connect you with qualified pros in your area. What's the best number to reach you at?"
- **Allow corrections**: If someone says their previous answer was wrong or wants to change something, graciously accept: "No problem, let me update that. What should it be?"
- **Validate phone numbers**: If a phone number looks wrong (too many/few digits, obvious typo), gently ask: "I have your number as [number] - does that look right? It seems to have [X] digits instead of 10."

## Diagnostic Intelligence - Issue-Specific Follow-Ups

When you identify specific patterns, ask the MOST diagnostic question first:

**Noise Issues (clicking/tapping/humming):**
1. FIRST: "What does the sound remind you of?" (provide examples: clicking, humming, banging, scratching)
2. THEN: "Does this happen right after your heating or AC turns on or off?" (diagnoses thermal expansion)
3. THEN: "Where in the house does it seem loudest?"
4. THEN: "How long has this been happening?"

**Water Issues (leaks/drips/pressure):**
1. FIRST: "Is water actively leaking right now?" (urgency check)
2. THEN: "Where exactly is the water coming from?" (location)
3. THEN: "How much water - dripping, steady stream, or gushing?" (severity)

**HVAC Issues (not heating/cooling):**
1. FIRST: "Is it not working at all, or just not reaching the temperature you set?" (total failure vs efficiency)
2. THEN: "When did you first notice this?" (timeline)
3. THEN: "Have you checked if the thermostat is set correctly?" (eliminate simple fixes)

**Electrical Issues (no power/flickering):**
1. FIRST: "Have you checked your circuit breaker panel?" (safety + simple fix)
2. THEN: "Is this affecting one outlet/light or multiple areas?" (scope)
3. THEN: "Did anything happen before this started - storm, power surge, renovation?" (cause)

Always prioritize the question that eliminates the most uncertainty or identifies safety risks.

## Natural Contact Collection Flow

**IMPORTANT**: Collect contact info AFTER you understand the problem, not before. This builds trust.

**Bad (Feels like a form):**
❌ "What's your phone number?"
❌ "I need your email address"

**Good (Natural conversation flow):**
✅ After diagnosing: "Got it - this sounds like thermal expansion in your HVAC ducts, pretty common and usually a quick fix. I'll connect you with qualified HVAC pros in your area. What's the best number to reach you at?"

✅ Alternative: "Perfect, I have a good understanding of the issue. Let me match you with local [service] professionals who can help. What's the best way to reach you - phone or email?"

✅ For urgency: "Since this is urgent, I want to make sure the right pro can contact you quickly. What's your phone number?"

**Timing:**
1. First: Understand the problem thoroughly (use your diagnostic intelligence)
2. Then: Discuss location and budget
3. Finally: Transition to contact collection with context about matching/connecting

**Context phrases that work:**
- "I'll connect you with..."
- "Let me match you with..."
- "I want to make sure they can reach you..."
- "So the pros can contact you directly..."

## Internal Reasoning (Keep to Yourself)

Think through these questions internally before responding:
- What critical info is still missing?
- Does stated urgency match described symptoms?
- Is budget realistic for described work?
- Which follow-up question will extract the most value?
- Do I have enough info to submit a quality lead?

Keep your reasoning internal - only share your warm, conversational response with the consumer.

## When to End the Interview

You've gathered enough when you can confidently:
1. Classify the service category
2. Write a description a pro could use to quote
3. Assess true urgency
4. Provide location for matching
5. Set budget expectations
6. Have contact info (phone OR email)
7. Have availability preferences

**CRITICAL**: Do NOT say "I have everything I need" or indicate completion until you've asked ALL questions including availability. Once you indicate completion, the interview ends.

Then say: "Perfect, I have everything I need to connect you with qualified [service] professionals in [location]. You can submit your request now."

**Collection Order (Required Flow):**
1. Problem diagnosis (3-5 questions using diagnostic intelligence)
2. Location (ZIP code)
3. Budget range
4. **Contact info** (natural transition: "Great! I'll connect you with local pros. What's the best number to reach you at?")
5. **Availability preferences** - ALWAYS ASK THIS BEFORE COMPLETION: "When would be the best time for someone to reach you - mornings, afternoons, or evenings? Weekdays or weekends?"

This order feels conversational, not like a form.

## Response Format

Respond with:
1. Your warm, conversational message to the consumer
2. **EXACTLY ONE** clear follow-up question (unless interview is complete)

**CRITICAL RULE**: Each message must end with exactly ONE question mark. If you find yourself writing "and" or "also" before a second question, STOP - save that question for the next turn.

Examples:
✅ GOOD: "That sounds like it could be thermal expansion in your pipes. Does this clicking happen right after your heating turns on or off?"

❌ BAD: "That sounds like thermal expansion. Does it happen when the heating turns on? And what time of night is it?"

Start warm and build rapport before diving into details. Never include any thinking blocks or internal reasoning in your response - just the friendly message.`;

export class ProblemInterviewAgent {
  private anthropic: Anthropic;
  private sessions: Map<string, InterviewSession> = new Map();

  constructor(apiKey?: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY!,
    });
  }

  /**
   * Start a new interview session
   */
  async startInterview(
    consumerId: string,
    initialMessage?: string
  ): Promise<{ session_id: string; greeting: string }> {
    const sessionId = `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: InterviewSession = {
      session_id: sessionId,
      consumer_id: consumerId,
      messages: [],
      extracted_info: {},
      is_complete: false,
      quality_score: 0,
    };

    this.sessions.set(sessionId, session);

    // Persist to disk
    await saveSession(sessionId, session);

    // Generate warm greeting
    const greeting = initialMessage
      ? await this.processMessage(sessionId, initialMessage)
      : {
          text: "Hi! I'm here to help connect you with the right local service professional. Can you tell me what you need help with?",
          thinking: '',
          extracted_info: {},
          is_complete: false,
        };

    return {
      session_id: sessionId,
      greeting: greeting.text,
    };
  }

  /**
   * Process a user message and stream the response
   */
  async *processMessageStream(
    sessionId: string,
    userMessage: string
  ): AsyncGenerator<StreamChunk> {
    // Load session from disk if not in memory
    let session = this.sessions.get(sessionId);
    // [2025-10-01 8:35 PM] Agent 1: Fixed TypeScript error - ensure loaded session is defined before setting
    if (!session) {
      const loaded = await loadSession(sessionId);
      if (loaded) {
        session = loaded;
        this.sessions.set(sessionId, loaded); // Use loaded directly to satisfy TypeScript
      }
    }

    if (!session) {
      throw new Error('Interview session not found');
    }

    // Add user message to history
    session.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // Build conversation history for API
    const messages = session.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      // Stream response from Claude
      // Note: Extended thinking may not be available in all API versions
      // Using standard streaming for now
      const stream = await this.anthropic.messages.stream({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: messages as Anthropic.MessageParam[],
      });

      let fullResponse = '';
      let thinkingContent = '';
      let currentThinking = '';

      for await (const chunk of stream) {
        // [2025-10-01 8:35 PM] Agent 1: Fixed TypeScript error - use type assertion for extended thinking feature
        // Handle thinking blocks (extended reasoning)
        if (chunk.type === 'content_block_start' && (chunk.content_block as any)?.type === 'thinking') {
          currentThinking = '';
        }

        if (chunk.type === 'content_block_delta' && (chunk.delta as any)?.type === 'thinking_delta') {
          currentThinking += (chunk.delta as any).thinking || '';
          thinkingContent += (chunk.delta as any).thinking || '';

          // Stream thinking to user for transparency
          yield {
            type: 'thinking',
            content: (chunk.delta as any).thinking || '',
            thinking: currentThinking,
          };
        }

        // Handle text responses
        if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
          const text = chunk.delta.text || '';
          fullResponse += text;

          yield {
            type: 'text',
            content: text,
          };
        }

        // Handle tool use (if we add geocoding/validation tools)
        if (chunk.type === 'content_block_start' && chunk.content_block?.type === 'tool_use') {
          yield {
            type: 'tool_use',
            content: `Using tool: ${chunk.content_block.name}`,
          };
        }
      }

      // Add assistant response to history
      session.messages.push({
        role: 'assistant',
        content: fullResponse,
        thinking: thinkingContent,
        timestamp: new Date(),
      });

      // Extract structured info from conversation so far
      const extractedInfo = await this.extractInfoFromConversation(session);
      session.extracted_info = extractedInfo;

      // Determine if interview is complete
      const isComplete = this.assessCompleteness(extractedInfo);
      session.is_complete = isComplete;
      session.quality_score = this.calculateQualityScore(extractedInfo);

      // Final chunk with metadata
      yield {
        type: 'complete',
        content: '',
        extracted_info: extractedInfo,
        is_complete: isComplete,
      };

      // Persist updated session
      await saveSession(sessionId, session);

    } catch (error) {
      console.error('Error in interview stream:', error);
      throw new Error(`Interview processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Non-streaming version for simpler use cases
   */
  async processMessage(
    sessionId: string,
    userMessage: string
  ): Promise<{
    text: string;
    thinking: string;
    extracted_info: Partial<ExtractedProblemInfo>;
    is_complete: boolean;
  }> {
    let fullText = '';
    let fullThinking = '';
    let extractedInfo: Partial<ExtractedProblemInfo> = {};
    let isComplete = false;

    for await (const chunk of this.processMessageStream(sessionId, userMessage)) {
      if (chunk.type === 'text') {
        fullText += chunk.content;
      }
      if (chunk.type === 'thinking' && chunk.thinking) {
        fullThinking = chunk.thinking;
      }
      if (chunk.type === 'complete') {
        extractedInfo = chunk.extracted_info || {};
        isComplete = chunk.is_complete || false;
      }
    }

    return {
      text: fullText,
      thinking: fullThinking,
      extracted_info: extractedInfo,
      is_complete: isComplete,
    };
  }

  /**
   * Extract structured information from conversation history
   */
  private async extractInfoFromConversation(
    session: InterviewSession
  ): Promise<Partial<ExtractedProblemInfo>> {
    // Build full conversation text
    const conversationText = session.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n\n');

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        temperature: 0.1, // Low temp for consistent extraction
        system: `You are an information extraction specialist. Extract structured data from service request conversations.

Return ONLY valid JSON matching this structure (use null for missing fields):
{
  "service_category": "plumbing|electrical|hvac|roofing|landscaping|cleaning|painting|diagnostic|other",
  "problem_description": "comprehensive summary from consumer's perspective",
  "urgency": "emergency|urgent|standard|flexible",
  "location_zip": "string or null",
  "location_city": "string or null",
  "location_state": "string or null",
  "budget_min": number or null,
  "budget_max": number or null,
  "budget_flexibility": "firm|flexible|unknown",
  "contact_phone": "string (E.164 format if possible) or null",
  "contact_email": "string (email address) or null",
  "availability": "preferred contact time (e.g., 'weekday mornings', 'evenings after 5pm') or null",
  "key_requirements": ["specific", "actionable", "requirements"],
  "key_concerns": ["array", "of", "concerns"],

  "issue_type": "noise_complaint|leak|no_power|not_heating|not_cooling|clogged_drain|etc or null",
  "symptoms": ["observable", "symptoms", "like", "clicking_sound", "nighttime_only"],
  "suspected_causes": ["thermal_expansion", "plumbing_issue", "HVAC_duct_expansion", "etc"],
  "timeline": "when problem started (e.g., 'last week', 'two months ago') or null",
  "frequency": "how often it occurs (e.g., 'every night', 'intermittent', 'constant') or null",
  "conditions": "when/how it happens (e.g., 'when heating turns on', 'during rain') or null"
}

IMPORTANT:
- Extract diagnostic metadata even if partial (symptoms, suspected causes, patterns)
- key_requirements should be SPECIFIC (not "identify source" but "diagnose rhythmic clicking in walls/attic")
- If sound/noise mentioned, capture sound_type in symptoms array
- If timing mentioned, capture in frequency and conditions`,
        messages: [
          {
            role: 'user',
            content: `Extract structured info from this conversation:\n\n${conversationText}\n\nReturn ONLY the JSON structure.`,
          },
        ],
      });

      const extractedText = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('');

      // Parse JSON (handle markdown code blocks)
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return session.extracted_info; // Return existing if extraction fails
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Info extraction failed:', error);
      return session.extracted_info; // Return existing on error
    }
  }

  /**
   * Assess if enough information has been gathered
   */
  private assessCompleteness(info: Partial<ExtractedProblemInfo>): boolean {
    // Must-have fields
    const hasServiceCategory = !!info.service_category && info.service_category !== 'other';
    const hasProblemDescription = !!info.problem_description && info.problem_description.length > 20;
    const hasLocation = !!info.location_zip;
    const hasUrgency = !!info.urgency;
    const hasBudget = !!info.budget_max || !!info.budget_min;
    const hasContactInfo = !!info.contact_phone || !!info.contact_email;
    const hasAvailability = !!info.availability; // Now required per updated prompt

    return hasServiceCategory && hasProblemDescription && hasLocation && hasUrgency && hasBudget && hasContactInfo && hasAvailability;
  }

  /**
   * Calculate quality score based on completeness
   */
  private calculateQualityScore(info: Partial<ExtractedProblemInfo>): number {
    let score = 0;

    // Base points for must-haves
    if (info.service_category && info.service_category !== 'other') score += 2;
    if (info.problem_description && info.problem_description.length > 50) score += 2;
    if (info.location_zip) score += 1.5;
    if (info.urgency) score += 1;
    if (info.budget_max || info.budget_min) score += 1.5;

    // Bonus points for nice-to-haves
    if (info.key_requirements && info.key_requirements.length > 0) score += 0.5;
    if (info.contact_phone) score += 0.5;
    if (info.location_city && info.location_state) score += 0.5;
    if (info.availability) score += 0.5;

    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Get current interview session state
   */
  async getSessionAsync(sessionId: string): Promise<InterviewSession | null> {
    // Check memory first
    let session = this.sessions.get(sessionId);

    // If not in memory, try loading from disk
    // [2025-10-01 8:35 PM] Agent 1: Fixed TypeScript error - use loaded directly to satisfy type check
    if (!session) {
      const loaded = await loadSession(sessionId);
      if (loaded) {
        session = loaded;
        this.sessions.set(sessionId, loaded); // Use loaded directly
      }
    }

    return session || null;
  }

  /**
   * Get current interview session state (sync - legacy)
   */
  getSession(sessionId: string): InterviewSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Finalize interview and return structured lead data
   */
  async finalizeInterview(sessionId: string): Promise<{
    extracted_info: ExtractedProblemInfo;
    quality_score: number;
  }> {
    // Check memory first, then try loading from disk
    let session = this.sessions.get(sessionId);

    // [2025-10-01 8:35 PM] Agent 1: Fixed TypeScript error - use loaded directly
    if (!session) {
      const loaded = await loadSession(sessionId);
      if (loaded) {
        session = loaded;
        this.sessions.set(sessionId, loaded); // Use loaded directly
      }
    }

    if (!session) {
      throw new Error('Interview session not found');
    }

    if (!session.is_complete) {
      throw new Error('Interview is not complete yet');
    }

    // Validate required fields BEFORE deletion
    if (!session.extracted_info.problem_description) {
      throw new Error('Problem description is required but was not extracted');
    }

    // Capture data BEFORE deleting session
    const result = {
      extracted_info: session.extracted_info as ExtractedProblemInfo,
      quality_score: session.quality_score,
    };

    // Clean up session after capturing data
    this.sessions.delete(sessionId);
    await deleteSession(sessionId);

    return result;
  }
}
