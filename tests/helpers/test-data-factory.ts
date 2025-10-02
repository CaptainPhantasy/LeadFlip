/**
 * Test Data Factory
 *
 * Provides reusable functions to generate test data for integration tests.
 * All data is realistic and matches production schema expectations.
 */

import { randomBytes } from 'crypto';

export interface TestConsumer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface TestBusiness {
  user_id: string;
  name: string;
  service_categories: string[];
  phone_number: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  location: string; // PostGIS POINT
  description?: string;
  price_tier: 'budget' | 'standard' | 'premium';
  rating?: number;
  offers_emergency_service: boolean;
  is_licensed: boolean;
  is_insured: boolean;
  is_active: boolean;
  notifications_paused?: boolean;
  years_in_business?: number;
  completed_jobs?: number;
}

export interface TestLead {
  user_id: string;
  problem_text: string;
  service_category: string;
  urgency: 'emergency' | 'urgent' | 'normal' | 'flexible';
  budget_min?: number;
  budget_max?: number | null;
  location_zip?: string;
  location_city?: string;
  location_lat?: number;
  location_lng?: number;
  quality_score?: number;
  status?: 'pending' | 'matched' | 'no_matches' | 'low_quality' | 'archived';
  contact_phone?: string;
  contact_email?: string;
}

export interface TestCall {
  lead_id: string;
  business_id?: string;
  consumer_id?: string;
  phone_number: string;
  call_type: 'qualify_lead' | 'confirm_appointment' | 'follow_up' | 'consumer_callback';
  objective: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'no_answer' | 'voicemail';
  attempt_number: number;
}

/**
 * Generate unique test ID with prefix
 */
function generateTestId(prefix: string): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return `test-${prefix}-${timestamp}-${random}`;
}

/**
 * Create test consumer with realistic data
 */
export function createTestConsumer(overrides?: Partial<TestConsumer>): TestConsumer {
  const id = generateTestId('consumer');
  const firstName = overrides?.firstName || 'John';
  const lastName = overrides?.lastName || 'Smith';

  return {
    id,
    email: overrides?.email || `${id}@test.leadflip.com`,
    firstName,
    lastName,
    phone: overrides?.phone || '+15551234567',
    ...overrides,
  };
}

/**
 * Create test business with realistic data
 */
export function createTestBusiness(overrides?: Partial<TestBusiness>): TestBusiness {
  const userId = generateTestId('business-user');
  const serviceCategories = overrides?.service_categories || ['plumbing'];

  // Default locations - Carmel, IN area
  const locations = {
    carmel: { lat: 39.9783, lng: -86.1180, zip: '46032', city: 'Carmel' },
    fishers: { lat: 39.9568, lng: -85.9616, zip: '46038', city: 'Fishers' },
    indianapolis: { lat: 39.7684, lng: -86.1581, zip: '46220', city: 'Indianapolis' },
    noblesville: { lat: 40.0456, lng: -86.0086, zip: '46060', city: 'Noblesville' },
  };

  const location = locations.carmel;

  return {
    user_id: userId,
    name: overrides?.name || `Test ${serviceCategories[0]} Services`,
    service_categories: serviceCategories,
    phone_number: overrides?.phone_number || '+15559876543',
    email: overrides?.email || `${userId}@test.leadflip.com`,
    address: overrides?.address || '123 Main St',
    city: overrides?.city || location.city,
    state: overrides?.state || 'IN',
    zip_code: overrides?.zip_code || location.zip,
    location: overrides?.location || `POINT(${location.lng} ${location.lat})`,
    description: overrides?.description,
    price_tier: overrides?.price_tier || 'standard',
    rating: overrides?.rating || 4.5,
    offers_emergency_service: overrides?.offers_emergency_service ?? true,
    is_licensed: overrides?.is_licensed ?? true,
    is_insured: overrides?.is_insured ?? true,
    is_active: overrides?.is_active ?? true,
    notifications_paused: overrides?.notifications_paused ?? false,
    years_in_business: overrides?.years_in_business || 10,
    completed_jobs: overrides?.completed_jobs || 250,
    ...overrides,
  };
}

/**
 * Create test lead with realistic data
 */
export function createTestLead(overrides?: Partial<TestLead>): TestLead {
  const userId = overrides?.user_id || generateTestId('consumer');

  // Realistic problem texts by category
  const problemTexts = {
    plumbing: 'My water heater is leaking badly, need emergency plumber in Carmel 46032, budget up to $800',
    lawn_care: 'Need weekly lawn mowing service in Fishers 46038, large yard about 1 acre, budget $100 per visit',
    hvac: 'AC stopped working and it\'s 95 degrees outside, need HVAC repair today in Indianapolis 46220, budget $1500',
    roofing: 'Need roof inspection and repair for leak, Indianapolis 46220, budget between $2000-$5000',
    electrical: 'Circuit breaker keeps tripping, need electrician in Noblesville 46060, budget $500',
    painting: 'Looking to paint interior of 3-bedroom house next month, Carmel 46032, budget $3000',
  };

  const category = overrides?.service_category || 'plumbing';
  const problemText = overrides?.problem_text || problemTexts[category as keyof typeof problemTexts] || problemTexts.plumbing;

  return {
    user_id: userId,
    problem_text: problemText,
    service_category: category,
    urgency: overrides?.urgency || 'emergency',
    budget_min: overrides?.budget_min ?? 0,
    budget_max: overrides?.budget_max ?? 800,
    location_zip: overrides?.location_zip || '46032',
    location_city: overrides?.location_city || 'Carmel',
    location_lat: overrides?.location_lat || 39.9783,
    location_lng: overrides?.location_lng || -86.1180,
    quality_score: overrides?.quality_score || 8.5,
    status: overrides?.status || 'pending',
    contact_phone: overrides?.contact_phone || '+15551234567',
    contact_email: overrides?.contact_email || `${userId}@test.leadflip.com`,
    ...overrides,
  };
}

/**
 * Create test call record
 */
export function createTestCall(overrides?: Partial<TestCall>): TestCall {
  return {
    lead_id: overrides?.lead_id || generateTestId('lead'),
    business_id: overrides?.business_id || generateTestId('business'),
    consumer_id: overrides?.consumer_id || generateTestId('consumer'),
    phone_number: overrides?.phone_number || '+15551234567',
    call_type: overrides?.call_type || 'qualify_lead',
    objective: overrides?.objective || 'Qualify lead for plumbing service',
    status: overrides?.status || 'queued',
    attempt_number: overrides?.attempt_number || 1,
    ...overrides,
  };
}

/**
 * Create multiple test businesses with variety
 */
export function createTestBusinesses(count: number): TestBusiness[] {
  const categories = ['plumbing', 'lawn_care', 'hvac', 'roofing', 'electrical', 'painting'];
  const tiers: ('budget' | 'standard' | 'premium')[] = ['budget', 'standard', 'premium'];
  const locations = [
    { lat: 39.9783, lng: -86.1180, zip: '46032', city: 'Carmel' },
    { lat: 39.9568, lng: -85.9616, zip: '46038', city: 'Fishers' },
    { lat: 39.7684, lng: -86.1581, zip: '46220', city: 'Indianapolis' },
    { lat: 40.0456, lng: -86.0086, zip: '46060', city: 'Noblesville' },
  ];

  return Array.from({ length: count }, (_, i) => {
    const category = categories[i % categories.length];
    const tier = tiers[i % tiers.length];
    const location = locations[i % locations.length];

    return createTestBusiness({
      service_categories: [category],
      price_tier: tier,
      city: location.city,
      zip_code: location.zip,
      location: `POINT(${location.lng} ${location.lat})`,
      rating: 3.5 + Math.random() * 1.5, // 3.5 to 5.0
      years_in_business: Math.floor(Math.random() * 20) + 1,
      completed_jobs: Math.floor(Math.random() * 500),
      offers_emergency_service: i % 2 === 0,
    });
  });
}

/**
 * Create multiple test leads with variety
 */
export function createTestLeads(count: number): TestLead[] {
  const categories = ['plumbing', 'lawn_care', 'hvac', 'roofing', 'electrical', 'painting'];
  const urgencies: ('emergency' | 'urgent' | 'normal' | 'flexible')[] = ['emergency', 'urgent', 'normal', 'flexible'];

  return Array.from({ length: count }, (_, i) => {
    const category = categories[i % categories.length];
    const urgency = urgencies[i % urgencies.length];

    return createTestLead({
      service_category: category,
      urgency,
      quality_score: 4 + Math.random() * 6, // 4 to 10
      budget_max: 100 + Math.floor(Math.random() * 5000),
    });
  });
}

/**
 * Generate realistic problem text for testing classification
 */
export function generateProblemText(options: {
  category: string;
  urgency: 'emergency' | 'urgent' | 'normal' | 'flexible';
  budget?: number;
  zipCode?: string;
}): string {
  const { category, urgency, budget, zipCode } = options;

  const urgencyPhrases = {
    emergency: ['EMERGENCY!', 'urgent help needed', 'ASAP', 'right now', 'immediately'],
    urgent: ['need today', 'as soon as possible', 'urgent', 'this week'],
    normal: ['need help with', 'looking for', 'need service for'],
    flexible: ['looking to schedule', 'interested in', 'planning to', 'next month'],
  };

  const categoryProblems = {
    plumbing: ['water heater leaking', 'burst pipe', 'toilet clogged', 'no hot water', 'low water pressure'],
    lawn_care: ['lawn mowing', 'yard cleanup', 'landscaping', 'tree trimming', 'hedge trimming'],
    hvac: ['AC not cooling', 'furnace broken', 'heating not working', 'AC maintenance', 'thermostat issue'],
    roofing: ['roof leak', 'shingle repair', 'roof replacement', 'gutter repair', 'roof inspection'],
    electrical: ['circuit breaker tripping', 'outlet not working', 'lights flickering', 'panel upgrade', 'wiring issue'],
    painting: ['interior painting', 'exterior painting', 'deck staining', 'cabinet painting', 'wall repair'],
  };

  const urgencyPhrase = urgencyPhrases[urgency][Math.floor(Math.random() * urgencyPhrases[urgency].length)];
  const problem = categoryProblems[category as keyof typeof categoryProblems]?.[0] || 'service needed';
  const zip = zipCode || '46032';
  const budgetText = budget ? `, budget ${budget < 1000 ? 'up to' : 'between'} $${budget}` : '';

  return `${urgencyPhrase} - ${problem} in ${zip}${budgetText}`;
}
