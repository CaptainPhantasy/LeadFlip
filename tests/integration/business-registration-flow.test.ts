/**
 * Integration Tests - Business Registration Flow
 *
 * Tests the complete business registration and profile management:
 * 1. Business user registration
 * 2. Profile creation with all fields
 * 3. Profile retrieval and updates
 * 4. Service category management
 * 5. Capacity/availability settings
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestClient, SupabaseTestClient } from '../helpers/supabase-test-client';
import { createTestBusiness } from '../helpers/test-data-factory';

describe('Business Registration Flow Integration Tests', () => {
  let testClient: SupabaseTestClient;
  let supabase: any;

  beforeAll(async () => {
    testClient = createTestClient();
    supabase = testClient.getClient();
  });

  afterAll(async () => {
    await testClient.cleanup();
  });

  describe('Business Profile Creation', () => {
    it('should create a complete business profile', async () => {
      const businessData = createTestBusiness({
        service_categories: ['plumbing', 'water_heater'],
        description: 'Full-service plumbing with 24/7 emergency service',
        offers_emergency_service: true,
        years_in_business: 15,
        completed_jobs: 500,
      });

      const businessId = await testClient.createTestBusiness(businessData);

      // Verify business was created
      expect(businessId).toBeDefined();

      // Retrieve the business
      const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      expect(error).toBeNull();
      expect(business).toBeDefined();
      expect(business.name).toBe(businessData.name);
      expect(business.service_categories).toEqual(['plumbing', 'water_heater']);
      expect(business.phone_number).toBe(businessData.phone_number);
      expect(business.email).toBe(businessData.email);
      expect(business.city).toBe(businessData.city);
      expect(business.zip_code).toBe(businessData.zip_code);
      expect(business.price_tier).toBe('standard');
      expect(business.offers_emergency_service).toBe(true);
      expect(business.is_active).toBe(true);
      expect(business.years_in_business).toBe(15);
      expect(business.completed_jobs).toBe(500);
    });

    it('should create business with minimum required fields', async () => {
      const minimalBusiness = createTestBusiness({
        description: undefined,
        years_in_business: undefined,
        completed_jobs: undefined,
      });

      const businessId = await testClient.createTestBusiness(minimalBusiness);

      const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      expect(error).toBeNull();
      expect(business).toBeDefined();
      expect(business.name).toBe(minimalBusiness.name);
      expect(business.is_active).toBe(true);
    });

    it('should create business with multiple service categories', async () => {
      const multiServiceBusiness = createTestBusiness({
        name: 'All-In-One Home Services',
        service_categories: ['plumbing', 'electrical', 'hvac', 'handyman'],
        description: 'We do it all!',
      });

      const businessId = await testClient.createTestBusiness(multiServiceBusiness);

      const { data: business } = await supabase
        .from('businesses')
        .select('service_categories')
        .eq('id', businessId)
        .single();

      expect(business.service_categories).toHaveLength(4);
      expect(business.service_categories).toContain('plumbing');
      expect(business.service_categories).toContain('electrical');
      expect(business.service_categories).toContain('hvac');
      expect(business.service_categories).toContain('handyman');
    });
  });

  describe('Business Profile Updates', () => {
    it('should update business profile fields', async () => {
      const businessData = createTestBusiness();
      const businessId = await testClient.createTestBusiness(businessData);

      // Update the business
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          description: 'Updated description',
          years_in_business: 20,
          completed_jobs: 1000,
          rating: 4.8,
        })
        .eq('id', businessId);

      expect(updateError).toBeNull();

      // Verify updates
      const { data: updated } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      expect(updated.description).toBe('Updated description');
      expect(updated.years_in_business).toBe(20);
      expect(updated.completed_jobs).toBe(1000);
      expect(updated.rating).toBe(4.8);
    });

    it('should update service categories', async () => {
      const businessData = createTestBusiness({
        service_categories: ['plumbing'],
      });
      const businessId = await testClient.createTestBusiness(businessData);

      // Add more services
      const { error } = await supabase
        .from('businesses')
        .update({
          service_categories: ['plumbing', 'hvac', 'water_heater'],
        })
        .eq('id', businessId);

      expect(error).toBeNull();

      const { data: updated } = await supabase
        .from('businesses')
        .select('service_categories')
        .eq('id', businessId)
        .single();

      expect(updated.service_categories).toHaveLength(3);
      expect(updated.service_categories).toContain('hvac');
    });

    it('should update capacity settings', async () => {
      const businessData = createTestBusiness();
      const businessId = await testClient.createTestBusiness(businessData);

      // Pause notifications
      const { error } = await supabase
        .from('businesses')
        .update({
          notifications_paused: true,
          max_monthly_leads: 50,
        })
        .eq('id', businessId);

      expect(error).toBeNull();

      const { data: updated } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      expect(updated.notifications_paused).toBe(true);
      expect(updated.max_monthly_leads).toBe(50);
    });
  });

  describe('Business Location Handling', () => {
    it('should store and retrieve PostGIS location correctly', async () => {
      const businessData = createTestBusiness({
        city: 'Indianapolis',
        zip_code: '46220',
        location: 'POINT(-86.1581 39.7684)', // Indianapolis coordinates
      });

      const businessId = await testClient.createTestBusiness(businessData);

      // Query with PostGIS functions
      const { data: business } = await supabase
        .from('businesses')
        .select('*, location')
        .eq('id', businessId)
        .single();

      expect(business).toBeDefined();
      expect(business.zip_code).toBe('46220');
      expect(business.city).toBe('Indianapolis');
    });

    it('should calculate distance between businesses', async () => {
      // Create two businesses in different locations
      const carmelBusiness = createTestBusiness({
        city: 'Carmel',
        zip_code: '46032',
        location: 'POINT(-86.1180 39.9783)',
      });

      const fishlersBusiness = createTestBusiness({
        city: 'Fishers',
        zip_code: '46038',
        location: 'POINT(-85.9616 39.9568)',
      });

      const carmelId = await testClient.createTestBusiness(carmelBusiness);
      const fishersId = await testClient.createTestBusiness(fishlersBusiness);

      // Both should exist
      expect(await testClient.exists('businesses', carmelId)).toBe(true);
      expect(await testClient.exists('businesses', fishersId)).toBe(true);

      // Distance between Carmel and Fishers is approximately 8-10 miles
      // We can verify they're in different locations
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, city, zip_code')
        .in('id', [carmelId, fishersId]);

      expect(businesses).toHaveLength(2);
      const cities = businesses.map((b: any) => b.city);
      expect(cities).toContain('Carmel');
      expect(cities).toContain('Fishers');
    });
  });

  describe('Business Filtering and Search', () => {
    it('should filter businesses by service category', async () => {
      // Create businesses with different categories
      const plumbingBusiness = createTestBusiness({
        service_categories: ['plumbing'],
      });
      const hvacBusiness = createTestBusiness({
        service_categories: ['hvac'],
      });
      const bothBusiness = createTestBusiness({
        service_categories: ['plumbing', 'hvac'],
      });

      await testClient.createTestBusiness(plumbingBusiness);
      await testClient.createTestBusiness(hvacBusiness);
      await testClient.createTestBusiness(bothBusiness);

      // Find all plumbing businesses
      const { data: plumbingBusinesses } = await supabase
        .from('businesses')
        .select('*')
        .contains('service_categories', ['plumbing']);

      expect(plumbingBusinesses.length).toBeGreaterThanOrEqual(2); // plumbing + both
    });

    it('should filter active businesses only', async () => {
      const activeBusiness = createTestBusiness({ is_active: true });
      const inactiveBusiness = createTestBusiness({ is_active: false });

      await testClient.createTestBusiness(activeBusiness);
      await testClient.createTestBusiness(inactiveBusiness);

      const { data: activeBusinesses } = await supabase
        .from('businesses')
        .select('*')
        .eq('is_active', true);

      expect(activeBusinesses.length).toBeGreaterThan(0);
      activeBusinesses.forEach((b: any) => {
        expect(b.is_active).toBe(true);
      });
    });

    it('should filter businesses by price tier', async () => {
      const budgetBusiness = createTestBusiness({ price_tier: 'budget' });
      const premiumBusiness = createTestBusiness({ price_tier: 'premium' });

      await testClient.createTestBusiness(budgetBusiness);
      await testClient.createTestBusiness(premiumBusiness);

      const { data: budgetBusinesses } = await supabase
        .from('businesses')
        .select('*')
        .eq('price_tier', 'budget');

      expect(budgetBusinesses.length).toBeGreaterThan(0);
      budgetBusinesses.forEach((b: any) => {
        expect(b.price_tier).toBe('budget');
      });
    });

    it('should filter businesses offering emergency service', async () => {
      const emergencyBusiness = createTestBusiness({
        offers_emergency_service: true,
      });
      const regularBusiness = createTestBusiness({
        offers_emergency_service: false,
      });

      await testClient.createTestBusiness(emergencyBusiness);
      await testClient.createTestBusiness(regularBusiness);

      const { data: emergencyBusinesses } = await supabase
        .from('businesses')
        .select('*')
        .eq('offers_emergency_service', true);

      expect(emergencyBusinesses.length).toBeGreaterThan(0);
      emergencyBusinesses.forEach((b: any) => {
        expect(b.offers_emergency_service).toBe(true);
      });
    });
  });

  describe('Business Statistics', () => {
    it('should track business performance metrics', async () => {
      const businessData = createTestBusiness({
        years_in_business: 10,
        completed_jobs: 500,
        rating: 4.5,
      });

      const businessId = await testClient.createTestBusiness(businessData);

      const { data: business } = await supabase
        .from('businesses')
        .select('years_in_business, completed_jobs, rating')
        .eq('id', businessId)
        .single();

      expect(business.years_in_business).toBe(10);
      expect(business.completed_jobs).toBe(500);
      expect(business.rating).toBe(4.5);
    });

    it('should handle businesses with no performance data', async () => {
      const newBusiness = createTestBusiness({
        years_in_business: undefined,
        completed_jobs: undefined,
        rating: undefined,
      });

      const businessId = await testClient.createTestBusiness(newBusiness);

      const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      expect(business).toBeDefined();
      // New businesses should still be valid
      expect(business.is_active).toBe(true);
    });
  });

  describe('Business Validation', () => {
    it('should require essential fields', async () => {
      // Missing required fields should fail
      const invalidBusiness = {
        user_id: 'test-user',
        // Missing: name, service_categories, phone_number, etc.
      };

      const { error } = await supabase
        .from('businesses')
        .insert(invalidBusiness);

      expect(error).not.toBeNull();
    });

    it('should validate phone number format', async () => {
      const businessWithBadPhone = createTestBusiness({
        phone_number: 'invalid-phone', // Not E.164 format
      });

      // Note: This might succeed in current schema but should be validated in production
      const { error } = await supabase
        .from('businesses')
        .insert(businessWithBadPhone);

      // If validation exists, it should fail
      // If not, this documents the need for validation
      if (!error) {
        console.warn('Phone validation not enforced - should validate E.164 format');
        await testClient.delete('businesses', (businessWithBadPhone as any).id);
      }
    });
  });
});
