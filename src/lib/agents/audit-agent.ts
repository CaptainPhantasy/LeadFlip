/**
 * Audit Agent Subagent
 *
 * Purpose: Weekly analysis of platform performance and optimization recommendations
 *
 * Schedule: Runs via cron every Sunday at 2am
 *
 * Tasks:
 * 1. Analyze low-converting leads (<5/10 quality score)
 * 2. Identify spam patterns
 * 3. Evaluate business response rates
 * 4. Generate recommendations for intake form improvements
 * 5. Update CLAUDE.md memory with new patterns
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export interface AuditConfig {
  daysBack?: number;
  includeSpamAnalysis?: boolean;
  includeBusinessPerformance?: boolean;
  includeSeasonalRecommendations?: boolean;
  generateMemoryUpdates?: boolean;
}

const DEFAULT_CONFIG: Required<AuditConfig> = {
  daysBack: 7,
  includeSpamAnalysis: true,
  includeBusinessPerformance: true,
  includeSeasonalRecommendations: true,
  generateMemoryUpdates: true,
};

export interface AuditReport {
  reportId: string;
  generatedAt: string;
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  leadQuality: {
    totalLeads: number;
    avgQualityScore: number;
    lowQualityCount: number;
    lowQualityPercentage: string;
    commonIssues: string[];
    recommendations: string[];
  };
  spamAnalysis: {
    suspectedSpamCount: number;
    spamPatterns: Array<{
      pattern: string;
      occurrences: number;
      probability: number;
    }>;
    ipBlacklist: string[];
    recommendations: string[];
  };
  businessPerformance: {
    totalBusinesses: number;
    topPerformers: Array<{
      businessId: string;
      businessName: string;
      responseRate: number;
      conversionRate: number;
      avgResponseTime: number;
    }>;
    underperformers: Array<{
      businessId: string;
      businessName: string;
      responseRate: number;
      reason: string;
    }>;
    recommendations: string[];
  };
  conversionStats: {
    byCategory: Array<{
      category: string;
      totalLeads: number;
      conversionRate: number;
      avgJobValue: number;
    }>;
    seasonalTrends: string[];
    recommendations: string[];
  };
  memoryUpdates: {
    newPatterns: string[];
    updatedRules: string[];
    seasonalAdjustments: string[];
  };
  actionItems: string[];
}

export class AuditAgentSubagent {
  private anthropic: Anthropic;
  private supabase;
  private config: Required<AuditConfig>;

  constructor(
    apiKey: string,
    supabaseUrl: string,
    supabaseKey: string,
    config: AuditConfig = {}
  ) {
    this.anthropic = new Anthropic({ apiKey });
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main audit execution
   */
  async runAudit(): Promise<AuditReport> {
    console.log('📊 Starting platform audit...');

    const now = new Date();
    const startDate = new Date(now.getTime() - this.config.daysBack * 24 * 60 * 60 * 1000);

    const report: AuditReport = {
      reportId: `audit-${now.getTime()}`,
      generatedAt: now.toISOString(),
      period: {
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        days: this.config.daysBack,
      },
      leadQuality: {} as AuditReport['leadQuality'],
      spamAnalysis: {} as AuditReport['spamAnalysis'],
      businessPerformance: {} as AuditReport['businessPerformance'],
      conversionStats: {} as AuditReport['conversionStats'],
      memoryUpdates: {
        newPatterns: [],
        updatedRules: [],
        seasonalAdjustments: [],
      },
      actionItems: [],
    };

    // Run analyses in parallel
    const [leadQuality, spamAnalysis, businessPerformance, conversionStats] = await Promise.all([
      this.analyzeLeadQuality(startDate),
      this.config.includeSpamAnalysis ? this.analyzeSpamPatterns(startDate) : null,
      this.config.includeBusinessPerformance ? this.analyzeBusinessPerformance(startDate) : null,
      this.analyzeConversionStats(startDate),
    ]);

    report.leadQuality = leadQuality;
    if (spamAnalysis) report.spamAnalysis = spamAnalysis;
    if (businessPerformance) report.businessPerformance = businessPerformance;
    report.conversionStats = conversionStats;

    // Generate memory updates
    if (this.config.generateMemoryUpdates) {
      report.memoryUpdates = await this.generateMemoryUpdates(report);
    }

    // Generate action items
    report.actionItems = this.generateActionItems(report);

    console.log('✅ Audit complete');
    return report;
  }

  /**
   * Analyze lead quality
   */
  private async analyzeLeadQuality(startDate: Date) {
    const { data: leads } = await this.supabase
      .from('leads')
      .select('*')
      .gte('created_at', startDate.toISOString());

    const totalLeads = leads?.length || 0;
    const avgQualityScore =
      leads?.reduce((sum, l) => sum + (l.quality_score || 0), 0) / totalLeads || 0;
    const lowQualityLeads = leads?.filter((l) => l.quality_score < 5) || [];
    const lowQualityCount = lowQualityLeads.length;

    // Analyze common issues in low-quality leads
    const commonIssues = await this.identifyCommonIssues(lowQualityLeads);

    // Generate recommendations
    const recommendations = await this.generateLeadQualityRecommendations(
      lowQualityLeads,
      commonIssues
    );

    return {
      totalLeads,
      avgQualityScore: parseFloat(avgQualityScore.toFixed(2)),
      lowQualityCount,
      lowQualityPercentage: ((lowQualityCount / totalLeads) * 100).toFixed(1) + '%',
      commonIssues,
      recommendations,
    };
  }

  /**
   * Identify common issues in low-quality leads
   */
  private async identifyCommonIssues(lowQualityLeads: Array<{ problem_text: string; quality_score?: number }>): Promise<string[]> {
    if (lowQualityLeads.length === 0) return [];

    const sampleProblems = lowQualityLeads.slice(0, 20).map((l) => l.problem_text);

    const prompt = `Analyze these low-quality lead submissions and identify common issues:

${sampleProblems.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

Identify patterns and issues such as:
- Too vague/generic
- Missing location
- Missing budget
- Incomplete descriptions
- Spam indicators
- Wrong category

Return as JSON array of strings: ["issue 1", "issue 2", ...]`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 300,
        temperature: 0.5,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return [];

      return JSON.parse(content.text);
    } catch (error) {
      console.error('Failed to identify common issues:', error);
      return ['Analysis failed'];
    }
  }

  /**
   * Generate lead quality recommendations
   */
  private async generateLeadQualityRecommendations(
    lowQualityLeads: Array<{ problem_text: string; quality_score?: number }>,
    commonIssues: string[]
  ): Promise<string[]> {
    const prompt = `Based on these common issues in low-quality leads:
${commonIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

Generate 3-5 specific, actionable recommendations to improve lead quality at intake.

Examples:
- "Add required field: 'Describe your problem in at least 20 words'"
- "Show location autocomplete to encourage specific addresses"
- "Add budget range selector with minimum $50 threshold"

Return as JSON array of strings.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 400,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return [];

      return JSON.parse(content.text);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return [];
    }
  }

  /**
   * Analyze spam patterns
   */
  private async analyzeSpamPatterns(startDate: Date) {
    const { data: patterns } = await this.supabase.rpc('detect_spam_patterns', {
      p_days_back: this.config.daysBack,
    });

    const spamPatterns = patterns || [];
    const suspectedSpamCount = spamPatterns.reduce(
      (sum: number, p: { occurrences: number }) => sum + p.occurrences,
      0
    );

    // Get IPs to blacklist (>90% spam probability)
    // TODO: Track IP addresses in leads table for blacklisting
    const ipBlacklist: string[] = [];

    const recommendations = await this.generateSpamRecommendations(spamPatterns);

    return {
      suspectedSpamCount,
      spamPatterns,
      ipBlacklist,
      recommendations,
    };
  }

  /**
   * Generate spam prevention recommendations
   */
  private async generateSpamRecommendations(patterns: Array<{ pattern: string; occurrences: number; spam_probability: number }>): Promise<string[]> {
    if (patterns.length === 0) {
      return ['No significant spam patterns detected'];
    }

    const prompt = `These spam patterns were detected:
${patterns.map((p) => `- ${p.pattern}: ${p.occurrences} times (${(p.spam_probability * 100).toFixed(0)}% confidence)`).join('\n')}

Generate 3-5 specific recommendations to prevent these spam patterns.

Examples:
- "Block submissions containing repeated text pattern X"
- "Add stricter rate limiting for phone number Y"
- "Require CAPTCHA for submissions with keywords: ..."

Return as JSON array of strings.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 400,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return [];

      return JSON.parse(content.text);
    } catch (error) {
      console.error('Failed to generate spam recommendations:', error);
      return [];
    }
  }

  /**
   * Analyze business performance
   */
  private async analyzeBusinessPerformance(startDate: Date) {
    const { data: performance } = await this.supabase.rpc('get_business_performance', {
      p_days_back: this.config.daysBack,
    });

    if (!performance || performance.length === 0) {
      return {
        totalBusinesses: 0,
        topPerformers: [],
        underperformers: [],
        recommendations: ['Insufficient data for business performance analysis'],
      };
    }

    const topPerformers = performance
      .filter((b: { response_rate: number; total_matches: number }) => b.response_rate >= 0.7 && b.total_matches >= 5)
      .slice(0, 10)
      .map((b: { business_id: string; business_name: string; response_rate: number; conversion_rate: number; avg_response_time_hours?: number }) => ({
        businessId: b.business_id,
        businessName: b.business_name,
        responseRate: parseFloat((b.response_rate * 100).toFixed(1)),
        conversionRate: parseFloat((b.conversion_rate * 100).toFixed(1)),
        avgResponseTime: Math.round(b.avg_response_time_hours || 0),
      }));

    const underperformers = performance
      .filter((b: { response_rate: number; total_matches: number }) => b.response_rate < 0.5 && b.total_matches >= 5)
      .slice(0, 10)
      .map((b: { business_id: string; business_name: string; response_rate: number; avg_response_time_hours?: number }) => ({
        businessId: b.business_id,
        businessName: b.business_name,
        responseRate: parseFloat((b.response_rate * 100).toFixed(1)),
        reason:
          b.response_rate === 0
            ? 'Never responds to leads'
            : (b.avg_response_time_hours ?? 0) > 48
            ? 'Response time too slow (>48 hours)'
            : 'Low response rate',
      }));

    const recommendations = this.generateBusinessRecommendations(topPerformers, underperformers);

    return {
      totalBusinesses: performance.length,
      topPerformers,
      underperformers,
      recommendations,
    };
  }

  /**
   * Generate business performance recommendations
   */
  private generateBusinessRecommendations(topPerformers: Array<{ responseRate: number; avgResponseTime: number }>, underperformers: Array<{ businessId: string; businessName: string; responseRate: number }>): string[] {
    const recommendations: string[] = [];

    if (topPerformers.length > 0) {
      recommendations.push(
        `Highlight top ${topPerformers.length} performers in marketing materials (avg ${topPerformers[0].responseRate}% response rate)`
      );
    }

    if (underperformers.length > 0) {
      recommendations.push(
        `Send re-engagement email to ${underperformers.length} underperforming businesses`
      );
      recommendations.push(
        `Consider pausing notifications for businesses with <30% response rate after 30 days`
      );
    }

    const avgResponseTime =
      topPerformers.reduce((sum, b) => sum + b.avgResponseTime, 0) / topPerformers.length;

    if (avgResponseTime < 2) {
      recommendations.push(
        `Emphasize fast response time in lead notifications (top businesses respond in ${Math.round(avgResponseTime)} hours)`
      );
    }

    return recommendations;
  }

  /**
   * Analyze conversion statistics
   */
  private async analyzeConversionStats(startDate: Date) {
    const { data: stats } = await this.supabase.rpc('get_conversion_stats', {
      p_days_back: this.config.daysBack,
    });

    const byCategory = (stats || []).map((s: { service_category: string; total_leads: number; conversion_rate: number; avg_job_value?: number }) => ({
      category: s.service_category,
      totalLeads: s.total_leads,
      conversionRate: parseFloat((s.conversion_rate * 100).toFixed(1)),
      avgJobValue: s.avg_job_value ? parseFloat(s.avg_job_value.toFixed(2)) : 0,
    }));

    // Detect seasonal trends
    const seasonalTrends = this.detectSeasonalTrends(byCategory);

    // Generate recommendations
    const recommendations = await this.generateConversionRecommendations(
      byCategory,
      seasonalTrends
    );

    return {
      byCategory,
      seasonalTrends,
      recommendations,
    };
  }

  /**
   * Detect seasonal trends
   */
  private detectSeasonalTrends(byCategory: Array<{ category: string; conversionRate: number }>): string[] {
    const trends: string[] = [];
    const month = new Date().getMonth(); // 0-11

    // Seasonal categories
    const summerCategories = ['lawn_care', 'landscaping', 'pool_service', 'ac_repair'];
    const winterCategories = ['snow_removal', 'furnace_repair', 'hvac'];
    const springCategories = ['roofing', 'painting', 'deck_building'];

    const isSummer = month >= 5 && month <= 8; // Jun-Sep
    const isWinter = month >= 11 || month <= 2; // Dec-Mar
    const isSpring = month >= 2 && month <= 5; // Mar-Jun

    byCategory.forEach((cat) => {
      if (isSummer && summerCategories.includes(cat.category) && cat.conversionRate > 70) {
        trends.push(`${cat.category} performing well in summer season (${cat.conversionRate}% conversion)`);
      }

      if (isWinter && winterCategories.includes(cat.category) && cat.conversionRate > 70) {
        trends.push(`${cat.category} high demand in winter (${cat.conversionRate}% conversion)`);
      }

      if (isSpring && springCategories.includes(cat.category) && cat.conversionRate > 70) {
        trends.push(`${cat.category} peak season in spring (${cat.conversionRate}% conversion)`);
      }
    });

    return trends;
  }

  /**
   * Generate conversion recommendations
   */
  private async generateConversionRecommendations(
    byCategory: Array<{ category: string; conversionRate: number; avgJobValue: number }>,
    seasonalTrends: string[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Find best and worst performing categories
    const sorted = [...byCategory].sort((a, b) => b.conversionRate - a.conversionRate);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    if (best && best.conversionRate > 70) {
      recommendations.push(
        `Increase marketing budget for ${best.category} (${best.conversionRate}% conversion, $${best.avgJobValue} avg)`
      );
    }

    if (worst && worst.conversionRate < 30) {
      recommendations.push(
        `Investigate ${worst.category} low conversion (${worst.conversionRate}%) - improve matching or qualification`
      );
    }

    // Seasonal recommendations
    if (seasonalTrends.length > 0) {
      recommendations.push(
        `Capitalize on seasonal trends: ${seasonalTrends.length} categories peaking this season`
      );
    }

    return recommendations;
  }

  /**
   * Generate memory updates for CLAUDE.md
   */
  private async generateMemoryUpdates(report: AuditReport) {
    const newPatterns: string[] = [];
    const updatedRules: string[] = [];
    const seasonalAdjustments: string[] = [];

    // Extract high-conversion patterns
    report.conversionStats.byCategory
      .filter((c) => c.conversionRate > 80)
      .forEach((c) => {
        newPatterns.push(
          `${c.category} leads converting at ${c.conversionRate}% (avg $${c.avgJobValue})`
        );
      });

    // Extract spam patterns
    if (report.spamAnalysis) {
      report.spamAnalysis.spamPatterns
        .filter((p) => p.probability > 0.8)
        .forEach((p) => {
          updatedRules.push(`Auto-flag leads with pattern: ${p.pattern}`);
        });
    }

    // Extract seasonal trends
    report.conversionStats.seasonalTrends.forEach((trend) => {
      seasonalAdjustments.push(trend);
    });

    return {
      newPatterns,
      updatedRules,
      seasonalAdjustments,
    };
  }

  /**
   * Generate prioritized action items
   */
  private generateActionItems(report: AuditReport): string[] {
    const actions: string[] = [];

    // Critical: High spam rate
    if (
      report.spamAnalysis &&
      (report.spamAnalysis.suspectedSpamCount / report.leadQuality.totalLeads) * 100 > 10
    ) {
      actions.push(
        `🚨 CRITICAL: ${((report.spamAnalysis.suspectedSpamCount / report.leadQuality.totalLeads) * 100).toFixed(1)}% spam rate - implement stricter validation`
      );
    }

    // High priority: Low lead quality
    if (parseFloat(report.leadQuality.lowQualityPercentage) > 30) {
      actions.push(
        `⚠️  HIGH: ${report.leadQuality.lowQualityPercentage} low-quality leads - improve intake form`
      );
    }

    // High priority: Business underperformance
    if (report.businessPerformance && report.businessPerformance.underperformers.length > 5) {
      actions.push(
        `⚠️  HIGH: ${report.businessPerformance.underperformers.length} underperforming businesses - send re-engagement campaign`
      );
    }

    // Medium: Conversion optimization
    const worstCategory = report.conversionStats.byCategory.sort(
      (a, b) => a.conversionRate - b.conversionRate
    )[0];
    if (worstCategory && worstCategory.conversionRate < 30) {
      actions.push(
        `📊 MEDIUM: ${worstCategory.category} only ${worstCategory.conversionRate}% conversion - improve matching algorithm`
      );
    }

    // Low: Update memory with new patterns
    if (report.memoryUpdates.newPatterns.length > 0) {
      actions.push(
        `📝 LOW: Update CLAUDE.md with ${report.memoryUpdates.newPatterns.length} new conversion patterns`
      );
    }

    return actions;
  }

  /**
   * Save audit report to file
   */
  async saveReport(report: AuditReport): Promise<string> {
    const reportDir = join(process.cwd(), 'reports');
    const fileName = `lead-audit-${new Date().toISOString().split('T')[0]}.json`;
    const filePath = join(reportDir, fileName);

    try {
      await writeFile(filePath, JSON.stringify(report, null, 2));
      console.log(`✅ Report saved: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Failed to save report:', error);
      throw error;
    }
  }

  /**
   * Generate markdown summary for Slack/email
   */
  generateMarkdownSummary(report: AuditReport): string {
    return `# 📊 LeadFlip Weekly Audit Report

**Period:** ${new Date(report.period.startDate).toLocaleDateString()} - ${new Date(report.period.endDate).toLocaleDateString()} (${report.period.days} days)

## 🎯 Lead Quality
- **Total Leads:** ${report.leadQuality.totalLeads}
- **Avg Quality Score:** ${report.leadQuality.avgQualityScore}/10
- **Low Quality:** ${report.leadQuality.lowQualityPercentage} (${report.leadQuality.lowQualityCount} leads)

**Common Issues:**
${report.leadQuality.commonIssues.map((issue) => `- ${issue}`).join('\n')}

**Recommendations:**
${report.leadQuality.recommendations.map((rec) => `- ${rec}`).join('\n')}

${
  report.spamAnalysis
    ? `## 🚫 Spam Analysis
- **Suspected Spam:** ${report.spamAnalysis.suspectedSpamCount} submissions
- **Patterns Detected:** ${report.spamAnalysis.spamPatterns.length}

**Recommendations:**
${report.spamAnalysis.recommendations.map((rec) => `- ${rec}`).join('\n')}
`
    : ''
}

${
  report.businessPerformance
    ? `## 🏢 Business Performance
- **Total Businesses:** ${report.businessPerformance.totalBusinesses}
- **Top Performers:** ${report.businessPerformance.topPerformers.length}
- **Underperformers:** ${report.businessPerformance.underperformers.length}

**Top 3 Performers:**
${report.businessPerformance.topPerformers
  .slice(0, 3)
  .map(
    (b) => `- ${b.businessName}: ${b.responseRate}% response rate, ${b.conversionRate}% conversion`
  )
  .join('\n')}

**Recommendations:**
${report.businessPerformance.recommendations.map((rec) => `- ${rec}`).join('\n')}
`
    : ''
}

## 💰 Conversion Stats
**By Category:**
${report.conversionStats.byCategory
  .map((c) => `- ${c.category}: ${c.conversionRate}% conversion, $${c.avgJobValue} avg job`)
  .join('\n')}

**Seasonal Trends:**
${report.conversionStats.seasonalTrends.length > 0 ? report.conversionStats.seasonalTrends.map((t) => `- ${t}`).join('\n') : '- No significant seasonal trends detected'}

## ✅ Action Items
${report.actionItems.map((action, i) => `${i + 1}. ${action}`).join('\n')}

---
*Generated at ${new Date(report.generatedAt).toLocaleString()}*`;
  }
}

/**
 * Standalone function for quick audit execution
 */
export async function runWeeklyAudit(config?: AuditConfig): Promise<AuditReport> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const auditAgent = new AuditAgentSubagent(apiKey, supabaseUrl, supabaseKey, config);
  const report = await auditAgent.runAudit();

  // Save report
  await auditAgent.saveReport(report);

  return report;
}
