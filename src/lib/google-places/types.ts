/**
 * Google Places API Types
 *
 * These types extend the base types from @googlemaps/google-maps-services-js
 * with additional LeadFlip-specific types for business discovery.
 */

/**
 * Google Places API result from nearbySearch
 * Matches the structure returned by Google Places Nearby Search API
 */
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

/**
 * Parameters for nearbySearch function
 */
export interface NearbySearchParams {
  location: {
    lat: number;
    lng: number;
  };
  radius: number; // in meters (max 50000)
  type: string; // Google Places type (e.g., 'plumber', 'electrician')
  keyword?: string; // Optional search keyword
}

/**
 * Parameters for placeDetails function
 */
export interface PlaceDetailsParams {
  placeId: string;
}

/**
 * Response from nearbySearch
 */
export interface NearbySearchResponse {
  results: GooglePlacesResult[];
  next_page_token?: string;
  status: string;
}

/**
 * Response from placeDetails
 */
export interface PlaceDetailsResponse {
  result: GooglePlacesResult;
  status: string;
}

/**
 * Error response from Google Places API
 */
export interface GooglePlacesError {
  error_message?: string;
  status: string;
}

/**
 * Service category types supported by LeadFlip
 * Will be imported from src/types/discovery.ts once Agent 1 creates it
 */
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

/**
 * Mapping of service categories to Google Places types
 */
export const GOOGLE_PLACES_TYPE_MAP: Record<ServiceCategory, string> = {
  plumbing: 'plumber',
  hvac: 'hvac_contractor',
  electrical: 'electrician',
  roofing: 'roofing_contractor',
  landscaping: 'landscaper',
  pest_control: 'pest_control_service',
  cleaning: 'house_cleaning_service',
  painting: 'painter',
  carpentry: 'carpenter',
  appliance_repair: 'appliance_repair_service',
  general_contractor: 'general_contractor',
};

/**
 * Fields to request from Google Places API
 */
export const PLACE_DETAILS_FIELDS = [
  'place_id',
  'name',
  'formatted_address',
  'formatted_phone_number',
  'international_phone_number',
  'website',
  'geometry',
  'rating',
  'user_ratings_total',
  'price_level',
  'business_status',
  'types',
] as const;
