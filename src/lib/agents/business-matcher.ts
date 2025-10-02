/**
 * Business Matcher Subagent
 *
 * Purpose: Intelligent matching of leads with local businesses beyond simple proximity
 *
 * Matching Criteria:
 * 1. Geographic proximity (<10 miles priority)
 * 2. Service category match (exact or related)
 * 3. Business rating (prefer 4+ stars)
 * 4. Historical response rate (prefer >70%)
 * 5. Current capacity (check if paused notifications)
 * 6. Pricing tier match (budget alignment)
 * 7. Special requirements (e.g., "pet-friendly", "licensed plumber")
 */

import { createClient } from '@supabase/supabase-js';
import type { ClassifiedLead } from '@/types/lead-classifier';

export type { ClassifiedLead };

export interface BusinessMatch {
  business_id: string;
  business_name: string;
  confidence_score: number;
  distance_miles: number;
  rating: number;
  response_rate: number;
  price_tier: 'budget' | 'standard' | 'premium';
  match_reasons: string[];
}

export interface MatcherConfig {
  maxMatches?: number;
  maxDistanceMiles?: number;
  minRating?: number;
  minResponseRate?: number;
  requireExactCategory?: boolean;
}

const DEFAULT_CONFIG: Required<MatcherConfig> = {
  maxMatches: 10,
  maxDistanceMiles: 25,
  minRating: 3.5,
  minResponseRate: 0.5,
  requireExactCategory: false,
};

export class BusinessMatcherAgent {
  private supabase;
  private config: Required<MatcherConfig>;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: MatcherConfig = {}
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main matching function - finds best businesses for a classified lead
   */
  async findMatches(lead: ClassifiedLead): Promise<BusinessMatch[]> {
    // 1. Get candidate businesses based on service category
    const candidates = await this.getCandidateBusinesses(lead);

    // 2. Calculate scores for each candidate
    const scoredMatches = await Promise.all(
      candidates.map(async (business: any) => {
        const score = await this.calculateMatchScore(lead, business);
        return {
          business_id: business.id,
          business_name: business.name,
          confidence_score: score.total,
          distance_miles: score.distance,
          rating: business.rating,
          response_rate: score.responseRate,
          price_tier: business.price_tier,
          match_reasons: score.reasons,
        };
      })
    );

    // 3. Sort by confidence score and return top matches
    const topMatches = scoredMatches
      .filter((m) => m.confidence_score >= 50) // Minimum 50% confidence
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, this.config.maxMatches);

    return topMatches;
  }

  /**
   * Get candidate businesses from database
   */
  private async getCandidateBusinesses(lead: ClassifiedLead) {
    const { data, error } = await this.supabase.rpc('get_nearby_businesses', {
      p_service_category: lead.service_category,
      p_latitude: lead.location_lat,
      p_longitude: lead.location_lng,
      p_max_distance_miles: this.config.maxDistanceMiles,
      p_min_rating: this.config.minRating,
    });

    if (error) {
      console.error('Error fetching candidate businesses:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Calculate comprehensive match score for a business
   */
  private async calculateMatchScore(lead: ClassifiedLead, business: any) {
    const reasons: string[] = [];
    let totalScore = 0;

    // 1. Geographic proximity (30 points max)
    const distanceScore = this.calculateDistanceScore(business.distance_miles);
    totalScore += distanceScore;
    if (distanceScore >= 25) {
      reasons.push(`Very close (${business.distance_miles.toFixed(1)} mi)`);
    } else if (distanceScore >= 15) {
      reasons.push(`Nearby (${business.distance_miles.toFixed(1)} mi)`);
    }

    // 2. Service category match (20 points max)
    const categoryScore = this.calculateCategoryScore(
      lead.service_category,
      business.service_categories
    );
    totalScore += categoryScore;
    if (categoryScore === 20) {
      reasons.push('Exact service match');
    } else if (categoryScore >= 10) {
      reasons.push('Related service');
    }

    // 3. Business rating (15 points max)
    const ratingScore = this.calculateRatingScore(business.rating);
    totalScore += ratingScore;
    if (business.rating >= 4.5) {
      reasons.push(`Excellent rating (${business.rating.toFixed(1)}⭐)`);
    } else if (business.rating >= 4.0) {
      reasons.push(`Great rating (${business.rating.toFixed(1)}⭐)`);
    }

    // 4. Response rate (15 points max)
    const responseRate = await this.getResponseRate(business.id);
    const responseScore = this.calculateResponseScore(responseRate);
    totalScore += responseScore;
    if (responseRate >= 0.8) {
      reasons.push(`Highly responsive (${(responseRate * 100).toFixed(0)}%)`);
    }

    // 5. Pricing tier match (10 points max)
    const pricingScore = this.calculatePricingScore(lead, business);
    totalScore += pricingScore;
    if (pricingScore >= 8) {
      reasons.push('Budget-aligned');
    }

    // 6. Urgency compatibility (5 points max)
    const urgencyScore = this.calculateUrgencyScore(lead, business);
    totalScore += urgencyScore;
    if (urgencyScore === 5 && lead.urgency === 'emergency') {
      reasons.push('Emergency service available');
    }

    // 7. Special requirements (5 points max)
    const requirementsScore = this.calculateRequirementsScore(lead, business);
    totalScore += requirementsScore;
    if (requirementsScore >= 3) {
      reasons.push('Meets special requirements');
    }

    return {
      total: totalScore,
      distance: business.distance_miles,
      responseRate,
      reasons,
    };
  }

  /**
   * Distance scoring: Closer = Higher score
   * <5 miles: 30 points
   * 5-10 miles: 25 points
   * 10-15 miles: 15 points
   * 15-20 miles: 10 points
   * >20 miles: 5 points
   */
  private calculateDistanceScore(distanceMiles: number): number {
    if (distanceMiles < 5) return 30;
    if (distanceMiles < 10) return 25;
    if (distanceMiles < 15) return 15;
    if (distanceMiles < 20) return 10;
    return 5;
  }

  /**
   * Category scoring: Exact match > Related > Unrelated
   */
  private calculateCategoryScore(
    leadCategory: string,
    businessCategories: string[]
  ): number {
    // Exact match
    if (businessCategories.includes(leadCategory)) {
      return 20;
    }

    // Related categories (e.g., "plumbing" matches "hvac")
    const relatedCategories = this.getRelatedCategories(leadCategory);
    const hasRelated = businessCategories.some((cat) =>
      relatedCategories.includes(cat)
    );

    if (hasRelated) {
      return 12;
    }

    return 0;
  }

  /**
   * Get related service categories
   */
  private getRelatedCategories(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      plumbing: ['hvac', 'water_heater', 'drain_cleaning'],
      hvac: ['plumbing', 'electrical', 'furnace_repair'],
      electrical: ['hvac', 'solar', 'generator_installation'],
      landscaping: ['lawn_care', 'tree_service', 'irrigation'],
      lawn_care: ['landscaping', 'pest_control', 'fertilization'],
      roofing: ['gutter_cleaning', 'siding', 'chimney_repair'],
      painting: ['drywall_repair', 'carpentry', 'pressure_washing'],
    };

    return categoryMap[category] || [];
  }

  /**
   * Rating scoring: Higher ratings = Higher score
   */
  private calculateRatingScore(rating: number): number {
    if (rating >= 4.8) return 15;
    if (rating >= 4.5) return 13;
    if (rating >= 4.0) return 10;
    if (rating >= 3.5) return 6;
    return 0;
  }

  /**
   * Get historical response rate for a business
   */
  private async getResponseRate(businessId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc(
      'calculate_response_rate',
      {
        p_business_id: businessId,
        p_days_back: 90,
      }
    );

    if (error || !data) {
      return 0.5; // Default 50% if no history
    }

    return data;
  }

  /**
   * Response rate scoring
   */
  private calculateResponseScore(responseRate: number): number {
    if (responseRate >= 0.9) return 15;
    if (responseRate >= 0.8) return 13;
    if (responseRate >= 0.7) return 10;
    if (responseRate >= 0.6) return 7;
    if (responseRate >= 0.5) return 5;
    return 0;
  }

  /**
   * Pricing tier compatibility
   */
  private calculatePricingScore(lead: ClassifiedLead, business: any): number {
    const leadBudgetMid = (lead.budget_min + (lead.budget_max ?? lead.budget_min * 2)) / 2;

    // Estimate business pricing tier based on historical data
    const businessAvgPrice = business.avg_job_price || 0;

    // Budget tier alignment
    if (business.price_tier === 'budget' && leadBudgetMid < 200) return 10;
    if (business.price_tier === 'standard' && leadBudgetMid >= 200 && leadBudgetMid <= 1000) return 10;
    if (business.price_tier === 'premium' && leadBudgetMid > 1000) return 10;

    // Partial match
    if (Math.abs(businessAvgPrice - leadBudgetMid) < leadBudgetMid * 0.3) {
      return 6;
    }

    return 0;
  }

  /**
   * Urgency compatibility scoring
   */
  private calculateUrgencyScore(lead: ClassifiedLead, business: any): number {
    if (lead.urgency === 'emergency') {
      // Check if business offers emergency services
      return business.offers_emergency_service ? 5 : 0;
    }

    if (lead.urgency === 'high') {
      // Check if business has fast response time
      return business.avg_response_hours < 24 ? 5 : 3;
    }

    // Normal/flexible urgency - all businesses get points
    return 3;
  }

  /**
   * Special requirements matching
   */
  private calculateRequirementsScore(
    lead: ClassifiedLead,
    business: any
  ): number {
    let score = 0;
    const businessTags = business.tags || [];

    // Check if business meets key requirements
    for (const requirement of lead.key_requirements) {
      const req = requirement.toLowerCase();

      // Licensed/certified requirements
      if (req.includes('licensed') && business.is_licensed) score += 2;
      if (req.includes('insured') && business.is_insured) score += 2;

      // Special capabilities
      if (businessTags.some((tag: string) => req.includes(tag.toLowerCase()))) {
        score += 1;
      }
    }

    return Math.min(score, 5); // Max 5 points
  }

  /**
   * Check if business has available capacity
   */
  async checkCapacity(businessId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('businesses')
      .select('notifications_paused, max_monthly_leads, current_month_leads')
      .eq('id', businessId)
      .single();

    if (error || !data) return false;

    // Check if notifications are paused
    if (data.notifications_paused) return false;

    // Check if monthly lead limit reached
    if (
      data.max_monthly_leads &&
      data.current_month_leads >= data.max_monthly_leads
    ) {
      return false;
    }

    return true;
  }
}

/**
 * Standalone function for quick matching (used by orchestrator)
 */
export async function matchBusinessesToLead(
  lead: ClassifiedLead,
  config?: MatcherConfig
): Promise<BusinessMatch[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey, config);
  return matcher.findMatches(lead);
}
