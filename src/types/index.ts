// Lead Types
export type ServiceCategory =
  | 'lawn_care'
  | 'plumbing'
  | 'hvac'
  | 'electrical'
  | 'landscaping'
  | 'snow_removal'
  | 'cleaning'
  | 'pest_control'
  | 'roofing'
  | 'painting'
  | 'other';

export type Urgency = 'low' | 'medium' | 'high' | 'emergency';

export interface Lead {
  id: string;
  user_id: string;
  problem_text: string;
  service_category?: ServiceCategory;
  urgency?: Urgency;
  budget_min?: number;
  budget_max?: number;
  location_zip?: string;
  location_city?: string;
  location_state?: string;
  key_requirements?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  quality_score?: number;
  status: 'pending' | 'classified' | 'matched' | 'contacted' | 'converted' | 'closed';
  classified_data?: ClassifiedLeadData;
  created_at: string;
  updated_at: string;
}

export interface ClassifiedLeadData {
  service_category: ServiceCategory;
  urgency: Urgency;
  budget_min: number;
  budget_max: number;
  location_zip: string;
  key_requirements: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  quality_score: number;
}

// Business Types
export interface Business {
  id: string;
  user_id: string;
  business_name: string;
  service_categories: ServiceCategory[];
  location_zip: string;
  location_city: string;
  location_state: string;
  location_lat: number;
  location_lng: number;
  phone: string;
  email: string;
  rating_avg?: number;
  response_rate?: number;
  subscription_tier: 'free' | 'starter' | 'professional' | 'enterprise';
  subscription_status: 'active' | 'paused' | 'cancelled';
  notifications_paused: boolean;
  created_at: string;
  updated_at: string;
}

// Match Types
export interface Match {
  id: string;
  lead_id: string;
  business_id: string;
  confidence_score: number;
  distance_miles: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  notified_at?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

// Call Types
export type CallStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type CallOutcome = 'goal_achieved' | 'no_answer' | 'voicemail' | 'declined' | 'error';

export interface Call {
  id: string;
  lead_id?: string;
  business_id?: string;
  initiator_id: string;
  target_phone: string;
  call_objective: string;
  status: CallStatus;
  scheduled_for?: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  transcript?: TranscriptTurn[];
  summary?: string;
  outcome?: CallOutcome;
  recording_url?: string;
  estimated_cost_usd?: number;
  actual_cost_usd?: number;
  cost_breakdown?: {
    twilio: number;
    openai: number;
    claude: number;
  };
  created_at: string;
  updated_at: string;
}

export interface TranscriptTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Agent Types
export interface AgentResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LeadClassificationResult {
  service_category: ServiceCategory;
  urgency: Urgency;
  budget_min: number;
  budget_max: number;
  location_zip: string;
  key_requirements: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  quality_score: number;
}

export interface BusinessMatchResult {
  business_id: string;
  confidence_score: number;
  distance_miles: number;
  reasons: string[];
}
