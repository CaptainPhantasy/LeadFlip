/**
 * Lead Classifier Types
 * Type definitions for the Lead Classifier subagent output
 */

export type ServiceCategory =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'lawn_care'
  | 'landscaping'
  | 'cleaning'
  | 'pest_control'
  | 'roofing'
  | 'painting'
  | 'handyman'
  | 'appliance_repair'
  | 'carpentry'
  | 'flooring'
  | 'snow_removal'
  | 'moving'
  | 'other';

export type Urgency = 'emergency' | 'high' | 'medium' | 'low';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface ClassifiedLead {
  service_category: ServiceCategory;
  urgency: Urgency;
  budget_min: number;
  budget_max: number | null;
  location_zip: string | null;
  location_lat?: number;
  location_lng?: number;
  key_requirements: string[];
  sentiment: Sentiment;
  quality_score: number;
}

export interface LeadClassificationError {
  error: string;
  rawText: string;
  timestamp: string;
}

export type LeadClassificationResult = ClassifiedLead | LeadClassificationError;
