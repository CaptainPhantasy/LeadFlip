/**
 * Google Places API Client
 *
 * Wrapper around @googlemaps/google-maps-services-js for business discovery.
 * Provides type-safe functions for searching nearby businesses and fetching details.
 */

import { Client } from '@googlemaps/google-maps-services-js';
import type {
  GooglePlacesResult,
  NearbySearchParams,
  PlaceDetailsParams,
  PLACE_DETAILS_FIELDS,
} from './types';

// Initialize Google Maps client (singleton)
const client = new Client({});

/**
 * Search for businesses near a location using Google Places Nearby Search API
 *
 * @param params - Search parameters including location, radius, type, and optional keyword
 * @returns Array of Google Places results
 * @throws Error if API key is not configured or API call fails
 *
 * @example
 * ```typescript
 * const results = await nearbySearch({
 *   location: { lat: 39.7684, lng: -86.1581 }, // Indianapolis
 *   radius: 16093, // 10 miles in meters
 *   type: 'plumber',
 *   keyword: 'emergency plumber'
 * });
 * ```
 */
export async function nearbySearch(
  params: NearbySearchParams
): Promise<GooglePlacesResult[]> {
  // Validate API key
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    const errorMsg = 'GOOGLE_PLACES_API_KEY is not configured in environment variables';
    console.error('[Google Places] Error:', errorMsg);
    throw new Error(errorMsg);
  }

  // Validate radius (Google Places API max is 50000 meters)
  if (params.radius > 50000) {
    console.warn(
      `[Google Places] Radius ${params.radius}m exceeds max allowed (50000m). Capping at 50000m.`
    );
    params.radius = 50000;
  }

  console.log('[Google Places] nearbySearch called with params:', {
    location: params.location,
    radius: params.radius,
    type: params.type,
    keyword: params.keyword,
  });

  try {
    const response = await client.placesNearby({
      params: {
        location: params.location,
        radius: params.radius,
        type: params.type,
        keyword: params.keyword,
        key: apiKey,
      },
    });

    console.log('[Google Places] nearbySearch response:', {
      status: response.data.status,
      resultCount: response.data.results?.length || 0,
      hasNextPage: !!response.data.next_page_token,
    });

    // Check for API errors
    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      const errorMsg = response.data.error_message || `API returned status: ${response.data.status}`;
      console.error('[Google Places] API error:', {
        status: response.data.status,
        error_message: response.data.error_message,
      });
      throw new Error(`Google Places API error: ${errorMsg}`);
    }

    // Return results (empty array if ZERO_RESULTS)
    return (response.data.results || []) as GooglePlacesResult[];
  } catch (error) {
    console.error('[Google Places] nearbySearch failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred during nearbySearch');
  }
}

/**
 * Fetch detailed information about a specific place using Google Places Details API
 *
 * @param placeId - Google Places ID
 * @returns Detailed place information
 * @throws Error if API key is not configured or API call fails
 *
 * @example
 * ```typescript
 * const details = await placeDetails('ChIJN1t_tDeuEmsRUsoyG83frY4');
 * console.log(details.formatted_phone_number); // "+1 555-123-4567"
 * ```
 */
export async function placeDetails(
  placeId: string
): Promise<GooglePlacesResult> {
  // Validate API key
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    const errorMsg = 'GOOGLE_PLACES_API_KEY is not configured in environment variables';
    console.error('[Google Places] Error:', errorMsg);
    throw new Error(errorMsg);
  }

  // Validate placeId
  if (!placeId || placeId.trim() === '') {
    const errorMsg = 'placeId is required';
    console.error('[Google Places] Error:', errorMsg);
    throw new Error(errorMsg);
  }

  console.log('[Google Places] placeDetails called with placeId:', placeId);

  try {
    const response = await client.placeDetails({
      params: {
        place_id: placeId,
        fields: [
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
        ],
        key: apiKey,
      },
    });

    console.log('[Google Places] placeDetails response:', {
      status: response.data.status,
      placeName: response.data.result?.name,
      hasPhone: !!response.data.result?.formatted_phone_number,
      hasWebsite: !!response.data.result?.website,
    });

    // Check for API errors
    if (response.data.status !== 'OK') {
      const errorMsg = response.data.error_message || `API returned status: ${response.data.status}`;
      console.error('[Google Places] API error:', {
        status: response.data.status,
        error_message: response.data.error_message,
      });
      throw new Error(`Google Places API error: ${errorMsg}`);
    }

    // Validate result exists
    if (!response.data.result) {
      const errorMsg = 'No result found for place ID';
      console.error('[Google Places] Error:', errorMsg);
      throw new Error(errorMsg);
    }

    return response.data.result as GooglePlacesResult;
  } catch (error) {
    console.error('[Google Places] placeDetails failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred during placeDetails');
  }
}

/**
 * Helper function to convert miles to meters for Google Places API
 *
 * @param miles - Distance in miles
 * @returns Distance in meters
 *
 * @example
 * ```typescript
 * const radiusMeters = milesToMeters(10); // 16093
 * ```
 */
export function milesToMeters(miles: number): number {
  return Math.round(miles * 1609.34);
}

/**
 * Helper function to convert meters to miles for display
 *
 * @param meters - Distance in meters
 * @returns Distance in miles (rounded to 2 decimals)
 *
 * @example
 * ```typescript
 * const radiusMiles = metersToMiles(16093); // 10.00
 * ```
 */
export function metersToMiles(meters: number): number {
  return Math.round((meters / 1609.34) * 100) / 100;
}

/**
 * Calculate distance between two geographic points using Haversine formula
 *
 * @param point1 - First location (lat/lng)
 * @param point2 - Second location (lat/lng)
 * @returns Distance in miles (rounded to 2 decimals)
 *
 * @example
 * ```typescript
 * const distance = calculateDistance(
 *   { lat: 39.7684, lng: -86.1581 }, // Indianapolis
 *   { lat: 39.9612, lng: -86.2717 }  // Carmel
 * ); // ~15.23 miles
 * ```
 */
export function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
      Math.cos(toRadians(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Extract ZIP code from formatted address string
 *
 * @param address - Formatted address from Google Places
 * @returns ZIP code or null if not found
 *
 * @example
 * ```typescript
 * const zip = extractZipCode('123 Main St, Indianapolis, IN 46220, USA');
 * // Returns: '46220'
 * ```
 */
export function extractZipCode(address: string): string | null {
  const zipRegex = /\b\d{5}(?:-\d{4})?\b/;
  const match = address.match(zipRegex);
  return match ? match[0].split('-')[0] : null; // Return 5-digit ZIP only
}

/**
 * Extract city from formatted address string
 *
 * @param address - Formatted address from Google Places
 * @returns City name or null if not found
 *
 * @example
 * ```typescript
 * const city = extractCity('123 Main St, Indianapolis, IN 46220, USA');
 * // Returns: 'Indianapolis'
 * ```
 */
export function extractCity(address: string): string | null {
  // Format: "Street, City, State ZIP, Country"
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length >= 3) {
    return parts[1]; // City is typically the second part
  }
  return null;
}

/**
 * Extract state from formatted address string
 *
 * @param address - Formatted address from Google Places
 * @returns State abbreviation or null if not found
 *
 * @example
 * ```typescript
 * const state = extractState('123 Main St, Indianapolis, IN 46220, USA');
 * // Returns: 'IN'
 * ```
 */
export function extractState(address: string): string | null {
  const stateRegex = /\b[A-Z]{2}\b/;
  const match = address.match(stateRegex);
  return match ? match[0] : null;
}
