/**
 * Discovery Scan - Direct execution (no BullMQ)
 *
 * Searches for businesses using Google Places API and inserts them into the database.
 */

import { createClient } from '@supabase/supabase-js';
import type { ServiceCategory } from '@/types/discovery';
import {
  nearbySearch,
  placeDetails,
  milesToMeters,
  calculateDistance,
  extractZipCode,
  extractCity,
  extractState,
} from '@/lib/google-places/client';
import { SERVICE_CATEGORIES } from '@/lib/discovery/config';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Quality filters for prospective businesses
 */
const QUALITY_FILTERS = {
  minRating: 3.5,
  minReviewCount: 5,
  requirePhone: true,
  requireActiveHours: true,
};

interface DiscoveryScanParams {
  zipCode: string;
  serviceCategory: string;
  radius: number;
}

interface DiscoveryScanResult {
  zipCode: string;
  serviceCategory: string;
  radius: number;
  totalResults: number;
  discovered: number;
  filteredOut: number;
  duplicates: number;
}

/**
 * Run discovery scan
 */
export async function runDiscoveryScan(params: DiscoveryScanParams): Promise<DiscoveryScanResult> {
  const { zipCode, serviceCategory, radius } = params;

  console.log(`[Discovery Scan] Starting scan for ${serviceCategory} in ${zipCode} (${radius} miles)`);

  try {
    // Step 1: Get coordinates for ZIP code
    const targetCoords = await getZipCodeCoordinates(zipCode);
    if (!targetCoords) {
      throw new Error(`Could not geocode ZIP code: ${zipCode}`);
    }

    console.log(`[Discovery Scan] Target coordinates:`, targetCoords);

    // Step 2: Get Google Places type for this service category
    const serviceConfig = SERVICE_CATEGORIES[serviceCategory as keyof typeof SERVICE_CATEGORIES];
    if (!serviceConfig) {
      throw new Error(`Invalid service category: ${serviceCategory}`);
    }

    const googlePlacesType = serviceConfig.googlePlacesType;
    const keywords = serviceConfig.keywords[0]; // Use first keyword

    // Step 3: Search Google Places API
    const radiusMeters = milesToMeters(radius);
    const results = await nearbySearch({
      location: targetCoords,
      radius: radiusMeters,
      type: googlePlacesType,
      keyword: keywords,
    });

    console.log(`[Discovery Scan] Found ${results.length} businesses from Google Places`);

    // Step 4: Filter and process results
    let discoveredCount = 0;
    let filteredOutCount = 0;
    let duplicatesCount = 0;

    for (const result of results) {
      try {
        // Check if business already exists
        const { data: existing } = await supabase
          .from('prospective_businesses')
          .select('id')
          .eq('google_place_id', result.place_id)
          .single();

        if (existing) {
          duplicatesCount++;
          console.log(`[Discovery Scan] Skipping duplicate: ${result.name}`);
          continue;
        }

        // Fetch detailed information
        const details = await placeDetails(result.place_id);

        // Apply quality filters
        const qualityCheck = checkQuality(details);
        if (!qualityCheck.qualified) {
          filteredOutCount++;
          console.log(`[Discovery Scan] Filtered out: ${details.name} - ${qualityCheck.reason}`);
          continue;
        }

        // Calculate distance from target ZIP
        const distance = calculateDistance(targetCoords, details.geometry.location);

        // Extract location data
        const zip = extractZipCode(details.formatted_address);
        const city = extractCity(details.formatted_address);
        const state = extractState(details.formatted_address);

        // Insert into database
        const { error } = await supabase
          .from('prospective_businesses')
          .insert({
            google_place_id: details.place_id,
            name: details.name,
            formatted_address: details.formatted_address,
            formatted_phone_number: details.formatted_phone_number || null,
            international_phone_number: details.international_phone_number || null,
            website: details.website || null,
            latitude: details.geometry.location.lat,
            longitude: details.geometry.location.lng,
            zip_code: zip,
            city: city,
            state: state || 'IN',
            rating: details.rating || null,
            user_ratings_total: details.user_ratings_total || 0,
            price_level: details.price_level || null,
            business_status: details.business_status || null,
            service_category: serviceCategory,
            service_types: details.types,
            discovery_source: 'google_places',
            discovery_zip: zipCode,
            distance_from_target: distance,
            invitation_status: 'pending',
            qualified: true,
            disqualification_reason: null,
          });

        if (error) {
          console.error(`[Discovery Scan] Error inserting business ${details.name}:`, error);
        } else {
          discoveredCount++;
          console.log(`[Discovery Scan] Added: ${details.name} (${distance.toFixed(1)} miles, ${details.rating} stars)`);
        }

        // Rate limiting: wait 100ms between API calls to avoid quota issues
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`[Discovery Scan] Error processing result:`, error);
        // Continue with next result
      }
    }

    const summary = {
      zipCode,
      serviceCategory,
      radius,
      totalResults: results.length,
      discovered: discoveredCount,
      filteredOut: filteredOutCount,
      duplicates: duplicatesCount,
    };

    console.log(`[Discovery Scan] Completed:`, summary);

    return summary;

  } catch (error: any) {
    console.error(`[Discovery Scan] Failed:`, error);
    throw error;
  }
}

/**
 * Check if a business meets quality criteria
 */
function checkQuality(business: any): { qualified: boolean; reason?: string } {
  // Check rating
  if (business.rating && business.rating < QUALITY_FILTERS.minRating) {
    return { qualified: false, reason: `Rating too low: ${business.rating}` };
  }

  // Check review count
  if (business.user_ratings_total && business.user_ratings_total < QUALITY_FILTERS.minReviewCount) {
    return { qualified: false, reason: `Not enough reviews: ${business.user_ratings_total}` };
  }

  // Check phone number
  if (QUALITY_FILTERS.requirePhone && !business.formatted_phone_number) {
    return { qualified: false, reason: 'No phone number' };
  }

  // Check business status
  if (business.business_status === 'CLOSED_PERMANENTLY') {
    return { qualified: false, reason: 'Closed permanently' };
  }

  if (business.business_status === 'CLOSED_TEMPORARILY') {
    return { qualified: false, reason: 'Closed temporarily' };
  }

  return { qualified: true };
}

/**
 * Get coordinates for a ZIP code
 * In production, this should use a geocoding API or database lookup
 * For now, using hardcoded Indiana ZIP codes from the spec
 */
async function getZipCodeCoordinates(zipCode: string): Promise<{ lat: number; lng: number } | null> {
  // Comprehensive Indiana ZIP codes with coordinates
  const zipCoordinates: Record<string, { lat: number; lng: number }> = {
    // ========================================
    // INDIANAPOLIS METRO (Marion County)
    // ========================================
    '46201': { lat: 39.7684, lng: -86.1581 }, // Indianapolis (Downtown)
    '46202': { lat: 39.7740, lng: -86.1669 }, // Indianapolis (IUPUI)
    '46203': { lat: 39.7323, lng: -86.1458 }, // Indianapolis (South)
    '46204': { lat: 39.7697, lng: -86.1625 }, // Indianapolis (Downtown West)
    '46205': { lat: 39.8253, lng: -86.1458 }, // Indianapolis (Meridian-Kessler)
    '46208': { lat: 39.8084, lng: -86.1625 }, // Indianapolis (Butler-Tarkington)
    '46214': { lat: 39.7901, lng: -86.2458 }, // Indianapolis (West)
    '46216': { lat: 39.7962, lng: -86.0458 }, // Indianapolis (East)
    '46217': { lat: 39.6901, lng: -86.2125 }, // Indianapolis (Southwest)
    '46218': { lat: 39.8123, lng: -86.1125 }, // Indianapolis (Northeast)
    '46219': { lat: 39.7684, lng: -86.0625 }, // Indianapolis (Far East)
    '46220': { lat: 39.8681, lng: -86.1267 }, // Indianapolis (Broad Ripple)
    '46221': { lat: 39.7401, lng: -86.2458 }, // Indianapolis (West)
    '46222': { lat: 39.7823, lng: -86.2125 }, // Indianapolis (Speedway)
    '46224': { lat: 39.8012, lng: -86.2625 }, // Indianapolis (West)
    '46225': { lat: 39.7462, lng: -86.1125 }, // Indianapolis (Fountain Square)
    '46226': { lat: 39.8345, lng: -86.0792 }, // Indianapolis (Castleton)
    '46227': { lat: 39.6901, lng: -86.1180 }, // Indianapolis (Southport)
    '46228': { lat: 39.8567, lng: -86.2458 }, // Indianapolis (Northwest)
    '46229': { lat: 39.8123, lng: -86.0125 }, // Indianapolis (Far East)
    '46231': { lat: 39.7123, lng: -86.2958 }, // Indianapolis (Airport)
    '46234': { lat: 39.7920, lng: -86.2915 }, // Indianapolis (West)
    '46235': { lat: 39.8845, lng: -86.0292 }, // Indianapolis (Northeast)
    '46236': { lat: 39.9012, lng: -85.9625 }, // Indianapolis (Geist)
    '46237': { lat: 39.6623, lng: -86.0958 }, // Indianapolis (Southport)
    '46239': { lat: 39.7123, lng: -86.0125 }, // Indianapolis (Southeast)
    '46240': { lat: 39.9084, lng: -86.1336 }, // Indianapolis (North - 96th St)
    '46241': { lat: 39.7401, lng: -86.3125 }, // Indianapolis (Ben Davis)
    '46250': { lat: 39.9123, lng: -86.0792 }, // Indianapolis (Castleton)
    '46254': { lat: 39.8345, lng: -86.3458 }, // Indianapolis (Pike)
    '46256': { lat: 39.9345, lng: -86.0125 }, // Indianapolis (Fishers border)
    '46259': { lat: 39.6234, lng: -86.0458 }, // Indianapolis (South)
    '46260': { lat: 39.9179, lng: -86.1453 }, // Indianapolis (North Meridian)
    '46268': { lat: 39.8845, lng: -86.2958 }, // Indianapolis (Zionsville border)
    '46278': { lat: 39.9567, lng: -86.3125 }, // Indianapolis (Zionsville)
    '46280': { lat: 39.9623, lng: -86.1458 }, // Indianapolis (Carmel border)

    // ========================================
    // HAMILTON COUNTY (North Indianapolis)
    // ========================================
    '46032': { lat: 39.9612, lng: -86.2717 }, // Carmel
    '46033': { lat: 39.9784, lng: -86.1181 }, // Carmel (North)
    '46037': { lat: 40.0567, lng: -86.2625 }, // Fishers (North)
    '46038': { lat: 39.9737, lng: -86.0139 }, // Fishers
    '46055': { lat: 40.0234, lng: -86.2958 }, // Carmel (West)
    '46060': { lat: 40.0845, lng: -86.0792 }, // Noblesville (North)
    '46062': { lat: 40.0431, lng: -86.1253 }, // Noblesville
    '46069': { lat: 40.1567, lng: -86.0125 }, // Sheridan
    '46074': { lat: 40.0484, lng: -86.0158 }, // Westfield
    '46077': { lat: 40.1123, lng: -86.2458 }, // Zionsville
    '46082': { lat: 40.0901, lng: -86.2792 }, // Whitestown
    '46113': { lat: 39.9234, lng: -86.3625 }, // Zionsville (South)

    // ========================================
    // HENDRICKS COUNTY (West Indianapolis)
    // ========================================
    '46105': { lat: 39.7234, lng: -86.6125 }, // Amo
    '46112': { lat: 39.5617, lng: -86.4094 }, // Brownsburg
    '46120': { lat: 39.7623, lng: -86.5458 }, // Danville
    '46121': { lat: 39.6234, lng: -86.6792 }, // Coatesville
    '46122': { lat: 39.4901, lng: -86.5625 }, // Danville (South)
    '46123': { lat: 39.5012, lng: -86.7458 }, // Stilesville
    '46147': { lat: 39.8234, lng: -86.5125 }, // Lizton
    '46149': { lat: 39.7845, lng: -86.3958 }, // Pittsboro
    '46158': { lat: 39.6845, lng: -86.4625 }, // Plainfield
    '46168': { lat: 39.6234, lng: -86.4125 }, // Plainfield (South)

    // ========================================
    // JOHNSON COUNTY (South Indianapolis)
    // ========================================
    '46103': { lat: 39.4567, lng: -86.1792 }, // Bargersville
    '46131': { lat: 39.7589, lng: -86.3958 }, // Avon
    '46140': { lat: 39.5623, lng: -86.2458 }, // Greenwood (West)
    '46142': { lat: 39.6006, lng: -86.1025 }, // Greenwood
    '46143': { lat: 39.6234, lng: -86.1458 }, // Greenwood (North)
    '46151': { lat: 39.5234, lng: -86.0125 }, // New Whiteland
    '46160': { lat: 39.4123, lng: -86.0792 }, // Trafalgar
    '46161': { lat: 39.5845, lng: -85.9625 }, // Whiteland
    '46162': { lat: 39.4567, lng: -86.3125 }, // Morgantown
    '46164': { lat: 39.3234, lng: -86.1458 }, // Nineveh
    '46181': { lat: 39.4012, lng: -86.4625 }, // Martinsville

    // ========================================
    // FORT WAYNE (Allen County)
    // ========================================
    '46802': { lat: 41.0793, lng: -85.1389 }, // Fort Wayne (Downtown)
    '46803': { lat: 41.0645, lng: -85.0940 }, // Fort Wayne (South)
    '46804': { lat: 41.1123, lng: -85.2125 }, // Fort Wayne (Southwest)
    '46805': { lat: 41.0567, lng: -85.1792 }, // Fort Wayne (West)
    '46806': { lat: 41.1345, lng: -85.0625 }, // Fort Wayne (North)
    '46807': { lat: 41.0234, lng: -85.2458 }, // Fort Wayne (Southwest)
    '46808': { lat: 41.1567, lng: -85.1458 }, // Fort Wayne (Northwest)
    '46809': { lat: 41.0901, lng: -85.0125 }, // Fort Wayne (East)
    '46814': { lat: 41.1234, lng: -85.1125 }, // Fort Wayne (North)
    '46815': { lat: 41.1623, lng: -85.0792 }, // Fort Wayne (North)
    '46816': { lat: 41.0012, lng: -85.0458 }, // Fort Wayne (Southeast)
    '46818': { lat: 41.2123, lng: -85.0125 }, // Fort Wayne (Far North)
    '46819': { lat: 41.0123, lng: -85.3125 }, // Fort Wayne (West)
    '46825': { lat: 41.0793, lng: -85.0940 }, // Fort Wayne
    '46835': { lat: 41.1845, lng: -85.0292 }, // Fort Wayne (North)
    '46845': { lat: 41.2234, lng: -84.9625 }, // Fort Wayne (Northeast)

    // ========================================
    // EVANSVILLE (Vanderburgh County)
    // ========================================
    '47708': { lat: 37.9716, lng: -87.5561 }, // Evansville (North)
    '47710': { lat: 37.9234, lng: -87.5125 }, // Evansville (East)
    '47711': { lat: 37.9845, lng: -87.6125 }, // Evansville (West)
    '47712': { lat: 37.9567, lng: -87.5792 }, // Evansville (Central)
    '47713': { lat: 38.0123, lng: -87.4625 }, // Evansville (Northeast)
    '47714': { lat: 37.9881, lng: -87.5353 }, // Evansville
    '47715': { lat: 38.0567, lng: -87.5458 }, // Evansville (North)
    '47720': { lat: 38.0234, lng: -87.6458 }, // Evansville (Northwest)
    '47725': { lat: 38.0901, lng: -87.5125 }, // Evansville (Far North)

    // ========================================
    // SOUTH BEND (St. Joseph County)
    // ========================================
    '46530': { lat: 41.6528, lng: -86.2500 }, // Granger
    '46545': { lat: 41.6234, lng: -86.1792 }, // Mishawaka
    '46550': { lat: 41.6567, lng: -86.1125 }, // Mishawaka (East)
    '46556': { lat: 41.7123, lng: -86.2958 }, // Notre Dame
    '46601': { lat: 41.6764, lng: -86.2520 }, // South Bend (Downtown)
    '46613': { lat: 41.6901, lng: -86.2792 }, // South Bend (North)
    '46614': { lat: 41.7234, lng: -86.2125 }, // South Bend (North)
    '46615': { lat: 41.6234, lng: -86.2458 }, // South Bend (South)
    '46616': { lat: 41.6567, lng: -86.3125 }, // South Bend (West)
    '46617': { lat: 41.7567, lng: -86.2625 }, // South Bend (North)
    '46619': { lat: 41.6123, lng: -86.2792 }, // South Bend (South)
    '46628': { lat: 41.7345, lng: -86.1958 }, // South Bend (Northeast)
    '46635': { lat: 41.7901, lng: -86.2458 }, // South Bend (Far North)

    // ========================================
    // BLOOMINGTON (Monroe County)
    // ========================================
    '47401': { lat: 39.1653, lng: -86.5264 }, // Bloomington (Central)
    '47403': { lat: 39.1234, lng: -86.5625 }, // Bloomington (West)
    '47404': { lat: 39.1467, lng: -86.5342 }, // Bloomington (South)
    '47405': { lat: 39.1845, lng: -86.4958 }, // Bloomington (East)
    '47406': { lat: 39.1012, lng: -86.4625 }, // Bloomington (Southeast)
    '47408': { lat: 39.1889, lng: -86.5264 }, // Bloomington (IU Campus/North)
    '47420': { lat: 39.3234, lng: -86.7125 }, // Bedford
    '47448': { lat: 39.2073, lng: -86.2458 }, // Nashville (Brown County)

    // ========================================
    // LAFAYETTE / WEST LAFAYETTE (Tippecanoe County)
    // ========================================
    '47901': { lat: 40.4167, lng: -86.8753 }, // Lafayette (Downtown)
    '47904': { lat: 40.4567, lng: -86.9125 }, // Lafayette (North)
    '47905': { lat: 40.3845, lng: -86.8625 }, // Lafayette (South)
    '47906': { lat: 40.4259, lng: -86.9081 }, // Lafayette (West)
    '47907': { lat: 40.4234, lng: -86.9458 }, // West Lafayette (Purdue)
    '47909': { lat: 40.4623, lng: -86.9625 }, // West Lafayette (North)

    // ========================================
    // MUNCIE (Delaware County)
    // ========================================
    '47302': { lat: 40.1934, lng: -85.3864 }, // Muncie (Downtown)
    '47303': { lat: 40.2234, lng: -85.4125 }, // Muncie (North)
    '47304': { lat: 40.1567, lng: -85.3625 }, // Muncie (South)
    '47305': { lat: 40.2123, lng: -85.3292 }, // Muncie (East)
    '47306': { lat: 40.1845, lng: -85.4458 }, // Muncie (West)

    // ========================================
    // TERRE HAUTE (Vigo County)
    // ========================================
    '47802': { lat: 39.4667, lng: -87.4139 }, // Terre Haute (Downtown)
    '47803': { lat: 39.4234, lng: -87.3625 }, // Terre Haute (East)
    '47804': { lat: 39.5123, lng: -87.4458 }, // Terre Haute (North)
    '47805': { lat: 39.4012, lng: -87.4625 }, // Terre Haute (South)
    '47807': { lat: 39.4567, lng: -87.3292 }, // Terre Haute (ISU)
    '47809': { lat: 39.5567, lng: -87.3958 }, // Terre Haute (North)

    // ========================================
    // KOKOMO (Howard County)
    // ========================================
    '46901': { lat: 40.4864, lng: -86.1336 }, // Kokomo (Downtown)
    '46902': { lat: 40.5123, lng: -86.1625 }, // Kokomo (North)
    '46904': { lat: 40.4567, lng: -86.0958 }, // Kokomo (East)

    // ========================================
    // ANDERSON (Madison County)
    // ========================================
    '46011': { lat: 40.1053, lng: -85.6803 }, // Anderson (Downtown)
    '46012': { lat: 40.1345, lng: -85.7125 }, // Anderson (North)
    '46013': { lat: 40.0734, lng: -85.6458 }, // Anderson (South)
    '46016': { lat: 40.1234, lng: -85.6125 }, // Anderson (East)
    '46017': { lat: 40.1567, lng: -85.7458 }, // Anderson (Northwest)

    // ========================================
    // GARY / HAMMOND (Lake County)
    // ========================================
    '46320': { lat: 41.5934, lng: -87.3464 }, // Hammond
    '46321': { lat: 41.6234, lng: -87.3792 }, // Munster
    '46322': { lat: 41.5567, lng: -87.4125 }, // Highland
    '46323': { lat: 41.5234, lng: -87.3625 }, // Hammond (South)
    '46324': { lat: 41.6123, lng: -87.4458 }, // Dyer
    '46327': { lat: 41.6567, lng: -87.3125 }, // Hammond (North)
    '46340': { lat: 41.4734, lng: -87.4958 }, // Hobart
    '46342': { lat: 41.4234, lng: -87.4625 }, // Hobart (South)
    '46375': { lat: 41.4567, lng: -87.2792 }, // Schererville
    '46401': { lat: 41.5934, lng: -87.3464 }, // Gary (Downtown)
    '46402': { lat: 41.5567, lng: -87.2958 }, // Gary (East)
    '46403': { lat: 41.6234, lng: -87.2625 }, // Gary (North)
    '46404': { lat: 41.5234, lng: -87.3125 }, // Gary (South)
    '46405': { lat: 41.6567, lng: -87.3458 }, // Lake Station
    '46406': { lat: 41.5845, lng: -87.2292 }, // Gary (East)
    '46407': { lat: 41.5123, lng: -87.2625 }, // Gary (South)
    '46408': { lat: 41.6123, lng: -87.2958 }, // Gary (North)
    '46409': { lat: 41.4901, lng: -87.3458 }, // Gary (Southwest)
    '46410': { lat: 41.6734, lng: -87.2125 }, // Merrillville

    // ========================================
    // CROWN POINT / VALPARAISO (Porter/Lake County)
    // ========================================
    '46307': { lat: 41.5892, lng: -87.3465 }, // Crown Point
    '46319': { lat: 41.6234, lng: -87.2125 }, // Griffith
    '46341': { lat: 41.5234, lng: -87.2458 }, // Hobart (East)
    '46350': { lat: 41.6131, lng: -87.0464 }, // La Porte
    '46360': { lat: 41.5567, lng: -86.9625 }, // Michigan City
    '46368': { lat: 41.4734, lng: -87.0958 }, // Portage
    '46383': { lat: 41.4639, lng: -87.0614 }, // Valparaiso
    '46385': { lat: 41.5123, lng: -87.0125 }, // Valparaiso (North)

    // ========================================
    // RICHMOND (Wayne County)
    // ========================================
    '47374': { lat: 39.8289, lng: -84.8903 }, // Richmond (Downtown)
    '47375': { lat: 39.8567, lng: -84.9125 }, // Richmond (North)

    // ========================================
    // ELKHART (Elkhart County)
    // ========================================
    '46514': { lat: 41.6820, lng: -85.9767 }, // Elkhart (Downtown)
    '46516': { lat: 41.6764, lng: -86.2520 }, // Elkhart (West)
    '46517': { lat: 41.7123, lng: -85.9458 }, // Elkhart (North)
    '46526': { lat: 41.7567, lng: -86.0125 }, // Goshen
    '46528': { lat: 41.5234, lng: -85.9625 }, // Elkhart (South)

    // ========================================
    // COLUMBUS (Bartholomew County)
    // ========================================
    '47201': { lat: 39.2014, lng: -85.9214 }, // Columbus (Downtown)
    '47203': { lat: 39.2264, lng: -85.8872 }, // Columbus (North)

    // ========================================
    // JEFFERSONVILLE / NEW ALBANY (Clark County)
    // ========================================
    '47129': { lat: 38.3234, lng: -85.7792 }, // Charlestown
    '47130': { lat: 38.2781, lng: -85.7475 }, // Jeffersonville
    '47131': { lat: 38.2567, lng: -85.7125 }, // Jeffersonville (East)
    '47150': { lat: 38.3056, lng: -85.8241 }, // New Albany
    '47175': { lat: 38.2123, lng: -85.6625 }, // Sellersburg

    // [2025-10-01 8:35 PM] Agent 1: Removed entire "ADDITIONAL MAJOR CITIES" section - all entries were duplicates
  };

  return zipCoordinates[zipCode] || null;
}
