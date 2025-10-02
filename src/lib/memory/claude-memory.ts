/**
 * CLAUDE.md Memory System
 *
 * Purpose: Learning system that tracks patterns and improves matching/scoring over time
 *
 * Storage: Platform memory stored in database + file system
 * Updates: Automatic from audit agent + manual from admins
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

export interface ConversionPattern {
  serviceCategory: string;
  totalLeads: number;
  conversionRate: number;
  avgJobValue: number;
  avgQualityScore: number;
  keyFactors: string[];
  lastUpdated: string;
}

export interface BusinessPattern {
  businessId: string;
  businessName: string;
  responseRate: number;
  avgResponseHours: number;
  preferredLeadTypes: string[];
  blacklistedKeywords: string[];
  lastUpdated: string;
}

export interface SeasonalAdjustment {
  category: string;
  months: number[];
  adjustment: number; // +/- points to add to quality score
  reason: string;
  lastUpdated: string;
}

export interface SpamPattern {
  pattern: string;
  matchType: 'keyword' | 'regex' | 'repeated_text' | 'phone_number';
  confidence: number; // 0-1
  action: 'flag' | 'reject' | 'manual_review';
  addedAt: string;
}

export interface PlatformMemory {
  version: string;
  lastUpdated: string;
  conversionPatterns: ConversionPattern[];
  businessPatterns: BusinessPattern[];
  seasonalAdjustments: SeasonalAdjustment[];
  spamPatterns: SpamPattern[];
  insights: string[];
}

export class ClaudeMemorySystem {
  private supabase;
  private memoryPath: string;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.memoryPath = join(process.cwd(), '.claude', 'memory.json');
  }

  /**
   * Load memory from file system
   */
  async loadMemory(): Promise<PlatformMemory> {
    try {
      const data = await readFile(this.memoryPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Initialize empty memory if file doesn't exist
      return this.initializeMemory();
    }
  }

  /**
   * Save memory to file system
   */
  async saveMemory(memory: PlatformMemory): Promise<void> {
    try {
      // Ensure directory exists
      await mkdir(join(process.cwd(), '.claude'), { recursive: true });

      memory.lastUpdated = new Date().toISOString();
      await writeFile(this.memoryPath, JSON.stringify(memory, null, 2));
      console.log('✅ Memory saved');
    } catch (error) {
      console.error('Failed to save memory:', error);
      throw error;
    }
  }

  /**
   * Initialize empty memory
   */
  private initializeMemory(): PlatformMemory {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      conversionPatterns: [],
      businessPatterns: [],
      seasonalAdjustments: this.getDefaultSeasonalAdjustments(),
      spamPatterns: [],
      insights: [],
    };
  }

  /**
   * Default seasonal adjustments based on common patterns
   */
  private getDefaultSeasonalAdjustments(): SeasonalAdjustment[] {
    return [
      {
        category: 'lawn_care',
        months: [4, 5, 6, 7, 8, 9], // Apr-Sep
        adjustment: +2,
        reason: 'Peak season for lawn care services',
        lastUpdated: new Date().toISOString(),
      },
      {
        category: 'lawn_care',
        months: [11, 12, 1, 2], // Nov-Feb
        adjustment: -2,
        reason: 'Off-season for lawn care',
        lastUpdated: new Date().toISOString(),
      },
      {
        category: 'snow_removal',
        months: [11, 12, 1, 2, 3], // Nov-Mar
        adjustment: +2,
        reason: 'Winter season for snow removal',
        lastUpdated: new Date().toISOString(),
      },
      {
        category: 'hvac',
        months: [5, 6, 7, 8], // May-Aug (cooling)
        adjustment: +1,
        reason: 'High demand for AC repair in summer',
        lastUpdated: new Date().toISOString(),
      },
      {
        category: 'hvac',
        months: [11, 12, 1, 2], // Nov-Feb (heating)
        adjustment: +1,
        reason: 'High demand for furnace repair in winter',
        lastUpdated: new Date().toISOString(),
      },
      {
        category: 'roofing',
        months: [3, 4, 5, 9, 10], // Mar-May, Sep-Oct
        adjustment: +1,
        reason: 'Ideal weather for roofing projects',
        lastUpdated: new Date().toISOString(),
      },
    ];
  }

  /**
   * Update conversion patterns from audit data
   */
  async updateConversionPatterns(auditData: any[]): Promise<void> {
    const memory = await this.loadMemory();

    auditData.forEach((data) => {
      const existing = memory.conversionPatterns.find(
        (p) => p.serviceCategory === data.service_category
      );

      const newPattern: ConversionPattern = {
        serviceCategory: data.service_category,
        totalLeads: data.total_leads,
        conversionRate: data.conversion_rate,
        avgJobValue: data.avg_job_value || 0,
        avgQualityScore: data.avg_quality_score || 0,
        keyFactors: this.extractKeyFactors(data),
        lastUpdated: new Date().toISOString(),
      };

      if (existing) {
        // Update existing pattern
        Object.assign(existing, newPattern);
      } else {
        // Add new pattern
        memory.conversionPatterns.push(newPattern);
      }
    });

    await this.saveMemory(memory);
  }

  /**
   * Extract key factors from conversion data
   */
  private extractKeyFactors(data: any): string[] {
    const factors: string[] = [];

    if (data.conversion_rate > 0.8) {
      factors.push('high conversion rate');
    }

    if (data.avg_quality_score > 8) {
      factors.push('high quality leads');
    }

    if (data.avg_job_value > 1000) {
      factors.push('high value jobs');
    }

    return factors;
  }

  /**
   * Update business patterns
   */
  async updateBusinessPatterns(performanceData: any[]): Promise<void> {
    const memory = await this.loadMemory();

    performanceData.forEach((data) => {
      const existing = memory.businessPatterns.find((p) => p.businessId === data.business_id);

      const newPattern: BusinessPattern = {
        businessId: data.business_id,
        businessName: data.business_name,
        responseRate: data.response_rate,
        avgResponseHours: data.avg_response_time_hours || 0,
        preferredLeadTypes: [], // TODO: Analyze from historical acceptances
        blacklistedKeywords: [], // TODO: Analyze from historical rejections
        lastUpdated: new Date().toISOString(),
      };

      if (existing) {
        Object.assign(existing, newPattern);
      } else {
        memory.businessPatterns.push(newPattern);
      }
    });

    await this.saveMemory(memory);
  }

  /**
   * Add spam pattern
   */
  async addSpamPattern(pattern: Omit<SpamPattern, 'addedAt'>): Promise<void> {
    const memory = await this.loadMemory();

    const newPattern: SpamPattern = {
      ...pattern,
      addedAt: new Date().toISOString(),
    };

    // Check if pattern already exists
    const exists = memory.spamPatterns.some((p) => p.pattern === pattern.pattern);

    if (!exists) {
      memory.spamPatterns.push(newPattern);
      await this.saveMemory(memory);
      console.log(`✅ Spam pattern added: ${pattern.pattern}`);
    }
  }

  /**
   * Add seasonal adjustment
   */
  async addSeasonalAdjustment(adjustment: Omit<SeasonalAdjustment, 'lastUpdated'>): Promise<void> {
    const memory = await this.loadMemory();

    const newAdjustment: SeasonalAdjustment = {
      ...adjustment,
      lastUpdated: new Date().toISOString(),
    };

    // Check if adjustment already exists
    const existingIndex = memory.seasonalAdjustments.findIndex(
      (a) =>
        a.category === adjustment.category &&
        JSON.stringify(a.months) === JSON.stringify(adjustment.months)
    );

    if (existingIndex >= 0) {
      // Update existing
      memory.seasonalAdjustments[existingIndex] = newAdjustment;
    } else {
      // Add new
      memory.seasonalAdjustments.push(newAdjustment);
    }

    await this.saveMemory(memory);
    console.log(`✅ Seasonal adjustment updated: ${adjustment.category}`);
  }

  /**
   * Add insight
   */
  async addInsight(insight: string): Promise<void> {
    const memory = await this.loadMemory();

    if (!memory.insights.includes(insight)) {
      memory.insights.push(insight);
      await this.saveMemory(memory);
    }
  }

  /**
   * Get quality score adjustment for a lead
   */
  async getQualityScoreAdjustment(
    serviceCategory: string,
    month: number
  ): Promise<{ adjustment: number; reason: string }> {
    const memory = await this.loadMemory();

    // Find applicable seasonal adjustment
    const seasonalAdj = memory.seasonalAdjustments.find(
      (a) => a.category === serviceCategory && a.months.includes(month)
    );

    if (seasonalAdj) {
      return {
        adjustment: seasonalAdj.adjustment,
        reason: seasonalAdj.reason,
      };
    }

    return { adjustment: 0, reason: 'No seasonal adjustment' };
  }

  /**
   * Check if text matches spam patterns
   */
  async checkSpamPatterns(text: string): Promise<{ isSpam: boolean; matchedPattern?: string }> {
    const memory = await this.loadMemory();

    for (const pattern of memory.spamPatterns) {
      if (pattern.matchType === 'keyword') {
        if (text.toLowerCase().includes(pattern.pattern.toLowerCase())) {
          return { isSpam: true, matchedPattern: pattern.pattern };
        }
      } else if (pattern.matchType === 'regex') {
        const regex = new RegExp(pattern.pattern, 'i');
        if (regex.test(text)) {
          return { isSpam: true, matchedPattern: pattern.pattern };
        }
      }
    }

    return { isSpam: false };
  }

  /**
   * Get business preferences
   */
  async getBusinessPreferences(businessId: string): Promise<BusinessPattern | null> {
    const memory = await this.loadMemory();
    return memory.businessPatterns.find((p) => p.businessId === businessId) || null;
  }

  /**
   * Get conversion insights for a category
   */
  async getConversionInsights(serviceCategory: string): Promise<ConversionPattern | null> {
    const memory = await this.loadMemory();
    return memory.conversionPatterns.find((p) => p.serviceCategory === serviceCategory) || null;
  }

  /**
   * Generate CLAUDE.md file content for AI agents
   */
  async generateClaudeMD(): Promise<string> {
    const memory = await this.loadMemory();

    let md = `# LeadFlip Platform Memory

**Last Updated:** ${new Date(memory.lastUpdated).toLocaleString()}
**Version:** ${memory.version}

This file contains learned patterns and rules that inform AI decision-making across the LeadFlip platform.

## Historical Conversion Patterns

`;

    // Sort by conversion rate
    const sortedPatterns = [...memory.conversionPatterns].sort(
      (a, b) => b.conversionRate - a.conversionRate
    );

    sortedPatterns.forEach((pattern) => {
      md += `### ${pattern.serviceCategory}\n`;
      md += `- **Conversion Rate:** ${(pattern.conversionRate * 100).toFixed(1)}%\n`;
      md += `- **Avg Job Value:** $${pattern.avgJobValue.toFixed(2)}\n`;
      md += `- **Avg Quality Score:** ${pattern.avgQualityScore.toFixed(1)}/10\n`;
      md += `- **Total Leads:** ${pattern.totalLeads}\n`;
      if (pattern.keyFactors.length > 0) {
        md += `- **Key Factors:** ${pattern.keyFactors.join(', ')}\n`;
      }
      md += '\n';
    });

    md += `\n## Business Performance Patterns\n\n`;

    memory.businessPatterns
      .filter((b) => b.responseRate > 0.8)
      .forEach((business) => {
        md += `- **${business.businessName}**: ${(business.responseRate * 100).toFixed(0)}% response rate, avg ${business.avgResponseHours}h response time\n`;
      });

    md += `\n## Seasonal Adjustments\n\n`;

    memory.seasonalAdjustments.forEach((adj) => {
      const monthNames = adj.months
        .map((m) => new Date(2000, m - 1, 1).toLocaleString('en-US', { month: 'short' }))
        .join(', ');
      md += `- **${adj.category}** (${monthNames}): ${adj.adjustment > 0 ? '+' : ''}${adj.adjustment} points - ${adj.reason}\n`;
    });

    md += `\n## Spam Patterns\n\n`;

    memory.spamPatterns.forEach((pattern) => {
      md += `- **${pattern.pattern}** (${pattern.matchType}, ${(pattern.confidence * 100).toFixed(0)}% confidence): ${pattern.action}\n`;
    });

    md += `\n## Platform Insights\n\n`;

    memory.insights.forEach((insight) => {
      md += `- ${insight}\n`;
    });

    return md;
  }

  /**
   * Save CLAUDE.md to file system
   */
  async saveClaudeMD(): Promise<void> {
    const content = await this.generateClaudeMD();
    const filePath = join(process.cwd(), '.claude', 'MEMORY.md');

    await mkdir(join(process.cwd(), '.claude'), { recursive: true });
    await writeFile(filePath, content);

    console.log(`✅ MEMORY.md saved to ${filePath}`);
  }

  /**
   * Get memory statistics
   */
  async getStats() {
    const memory = await this.loadMemory();

    return {
      version: memory.version,
      lastUpdated: memory.lastUpdated,
      conversionPatterns: memory.conversionPatterns.length,
      businessPatterns: memory.businessPatterns.length,
      seasonalAdjustments: memory.seasonalAdjustments.length,
      spamPatterns: memory.spamPatterns.length,
      insights: memory.insights.length,
    };
  }
}

/**
 * Standalone function for quick memory access
 */
export async function getMemorySystem(): Promise<ClaudeMemorySystem> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return new ClaudeMemorySystem(supabaseUrl, supabaseKey);
}
