/**
 * Seed Test Business Account
 * Creates a verified business account for testing lead matching and notifications
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedTestBusiness() {
  console.log('🌱 Seeding test business account...\n');

  try {
    // STEP 1: Create test user
    console.log('1️⃣ Creating test business user...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: 'user_test_business_123',
        email: 'test-business@leadflip.local',
        full_name: 'Test Business Owner',
        role: 'business',
        subscription_tier: 'professional',
        account_status: 'active',
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ User creation failed:', userError);
      throw userError;
    }
    console.log('✅ User created:', userData.email);

    // STEP 2: Check if business exists, delete if so
    console.log('\n2️⃣ Checking for existing business...');
    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', 'user_test_business_123')
      .single();

    if (existing) {
      console.log('   Found existing business, deleting...');
      await supabase.from('businesses').delete().eq('id', existing.id);
    }

    // STEP 3: Create test business
    console.log('   Creating test business profile...');
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .insert({
        user_id: 'user_test_business_123',
        name: "Doug's Test Services",
        phone_number: '+18123405761',
        email: 'test-business@leadflip.local',
        description: 'Full-service home repair and maintenance company for testing LeadFlip platform',
        address: '123 Test Street',
        city: 'Carmel',
        state: 'IN',
        zip_code: '46032',
        location: `POINT(-86.1180 39.9784)`, // Carmel, IN coordinates
        service_categories: ['plumbing', 'hvac', 'electrical', 'handyman', 'lawn_care', 'roofing'],
        price_tier: 'standard',
        offers_emergency_service: true,
        is_licensed: true,
        is_insured: true,
        rating: 4.8,
        years_in_business: 10,
        completed_jobs: 250,
        avg_response_hours: 2,
        avg_job_price: 350.0,
        is_active: true,
        subscription_status: 'active',
        subscription_tier: 'professional',
        notifications_paused: false,
        max_monthly_leads: 100,
        current_month_leads: 0,
        tags: ['fast_response', 'veteran_owned', 'background_checked'],
      })
      .select()
      .single();

    if (businessError) {
      console.error('❌ Business creation failed:', businessError);
      throw businessError;
    }

    console.log('✅ Business created successfully!\n');
    console.log('📋 Business Details:');
    console.log('   ID:', businessData.id);
    console.log('   Name:', businessData.name);
    console.log('   Phone:', businessData.phone_number);
    console.log('   Email:', businessData.email);
    console.log('   Location:', businessData.city, businessData.state, businessData.zip_code);
    console.log('   Services:', businessData.service_categories.join(', '));
    console.log('   Tier:', businessData.subscription_tier);
    console.log('   Active:', businessData.is_active);
    console.log('   Notifications:', businessData.notifications_paused ? 'PAUSED' : 'ENABLED');
    console.log('\n✅ Test business ready for lead matching!');
    console.log('\n📱 Notifications will be sent to: +18123405761');
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

seedTestBusiness();
