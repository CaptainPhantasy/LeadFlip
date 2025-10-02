// src/types/discovery.ts
// Shared types for Business Discovery System

export type ServiceCategory =
  | 'plumbing'
  | 'hvac'
  | 'electrical'
  | 'roofing'
  | 'landscaping'
  | 'pest_control'
  | 'cleaning'
  | 'painting'
  | 'carpentry'
  | 'appliance_repair'
  | 'general_contractor';

export type InvitationStatus =
  | 'pending'
  | 'invited'
  | 'clicked'
  | 'activated'
  | 'declined'
  | 'bounced';

export interface ProspectiveBusiness {
  id: string;
  googlePlaceId: string;
  name: string;
  formattedAddress: string | null;
  formattedPhoneNumber: string | null;
  internationalPhoneNumber: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  zipCode: string | null;
  city: string | null;
  state: string;
  rating: number | null;
  userRatingsTotal: number;
  priceLevel: number | null;
  businessStatus: string | null;
  serviceCategory: ServiceCategory;
  serviceTypes: string[] | null;
  discoveredAt: Date;
  discoverySource: string;
  discoveryZip: string;
  distanceFromTarget: number | null;
  invitationStatus: InvitationStatus;
  invitationSentAt: Date | null;
  invitationClickedAt: Date | null;
  followUpCount: number;
  lastFollowUpAt: Date | null;
  activated: boolean;
  activatedAt: Date | null;
  activatedBusinessId: string | null;
  qualified: boolean;
  disqualificationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiscoveryConfig {
  targetMarkets: TargetMarket[];
  serviceCategories: ServiceCategory[];
  qualityFilters: QualityFilters;
  schedule: ScheduleConfig;
}

export interface TargetMarket {
  name: string;
  zipCode: string;
  radius: number; // miles
  priority: 'high' | 'medium' | 'low';
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface QualityFilters {
  minRating: number;
  minReviewCount: number;
  requirePhone: boolean;
  requireActiveHours: boolean;
}

export interface ScheduleConfig {
  discoveryFrequency: 'daily' | 'weekly';
  invitationBatchSize: number;
  followUpDays: number[];
}

export interface GooglePlacesResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  business_status?: string;
  types: string[];
}

export interface DiscoveryStats {
  totalDiscovered: number;
  totalInvited: number;
  totalClicked: number;
  totalActivated: number;
  byMarket: MarketStats[];
  byServiceCategory: ServiceCategoryStats[];
  nextActions: NextAction[];
}

export interface MarketStats {
  zipCode: string;
  name: string;
  discovered: number;
  invited: number;
  activated: number;
}

export interface ServiceCategoryStats {
  category: ServiceCategory;
  displayName: string;
  discovered: number;
  invited: number;
  activated: number;
}

export interface NextAction {
  type: 'invitation' | 'follow_up' | 'clicked_not_activated';
  count: number;
  description: string;
  scheduledFor?: Date;
}
