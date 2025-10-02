/**
 * Test Notification System
 *
 * Run with: npx tsx scripts/test-notifications.ts
 *
 * This script tests the complete notification flow:
 * 1. Email sending via SendGrid
 * 2. SMS sending via SignalWire
 * 3. Email template generation
 * 4. SMS template generation
 */

import dotenv from 'dotenv';
import { sendEmail, testConnection as testEmailConnection, isConfigured as emailConfigured } from '../src/lib/email/sendgrid-client';
import { sendSMS, testConnection as testSMSConnection, isConfigured as smsConfigured, formatPhoneNumber } from '../src/lib/sms/signalwire-client';
import { generateLeadNotificationEmail } from '../src/lib/email/templates/lead-notification';
import { generateLeadNotificationSMS, generateUrgentLeadSMS } from '../src/lib/sms/templates/lead-notification';

// Load environment variables
dotenv.config({ path: '.env.local' });

const TEST_EMAIL = process.env.SENDGRID_TEST_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'test@example.com';
const TEST_PHONE = process.env.TEST_PHONE_NUMBER || '+15555551234'; // Update with your phone

async function main() {
  console.log('🧪 LeadFlip Notification System Test\n');
  console.log('=' .repeat(60));

  // Step 1: Check configuration
  console.log('\n📋 Step 1: Checking Configuration...\n');

  const emailReady = emailConfigured();
  const smsReady = smsConfigured();

  console.log(`Email (SendGrid): ${emailReady ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`SMS (SignalWire): ${smsReady ? '✅ Configured' : '❌ Not configured'}`);

  if (!emailReady && !smsReady) {
    console.error('\n❌ Error: No notification channels configured!');
    console.log('\nPlease configure at least one of:');
    console.log('- SENDGRID_API_KEY, SENDGRID_FROM_EMAIL');
    console.log('- SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN, SIGNALWIRE_SPACE_URL, SIGNALWIRE_PHONE_NUMBER');
    process.exit(1);
  }

  // Step 2: Test connections
  console.log('\n=' .repeat(60));
  console.log('\n🔌 Step 2: Testing Connections...\n');

  if (emailReady) {
    const emailConnected = await testEmailConnection();
    console.log(`SendGrid Connection: ${emailConnected ? '✅ Success' : '❌ Failed'}`);
  }

  if (smsReady) {
    const smsConnected = await testSMSConnection();
    console.log(`SignalWire Connection: ${smsConnected ? '✅ Success' : '❌ Failed'}`);
  }

  // Step 3: Generate and test email template
  console.log('\n=' .repeat(60));
  console.log('\n📧 Step 3: Testing Email Template...\n');

  const emailTemplate = generateLeadNotificationEmail({
    businessName: 'ABC Plumbing',
    leadId: 'test-lead-123',
    serviceCategory: 'Plumbing',
    urgency: 'urgent',
    qualityScore: 8.5,
    location: 'Carmel, IN 46032',
    budget: '$300 - $500',
    description: 'Water heater is leaking in the basement. Need immediate repair. Prefer licensed and insured plumber.',
    keyRequirements: ['Licensed plumber', 'Emergency service', 'Water heater expertise'],
    matchReason: 'You are within 5 miles and have excellent emergency service reviews (4.8/5 stars)',
    dashboardUrl: 'https://leadflip.com/business',
  });

  console.log(`Subject: ${emailTemplate.subject}`);
  console.log(`HTML Body Length: ${emailTemplate.htmlBody.length} characters`);
  console.log(`Text Body Length: ${emailTemplate.textBody.length} characters`);
  console.log('\nText Preview:\n');
  console.log(emailTemplate.textBody.substring(0, 300) + '...\n');

  // Step 4: Generate and test SMS template
  console.log('=' .repeat(60));
  console.log('\n📱 Step 4: Testing SMS Template...\n');

  const smsTemplate = generateLeadNotificationSMS({
    businessName: 'ABC Plumbing',
    leadId: 'test-lead-123',
    serviceCategory: 'Plumbing',
    urgency: 'urgent',
    qualityScore: 8.5,
    location: 'Carmel, IN 46032',
    dashboardUrl: 'https://leadflip.com/business',
  });

  console.log(`SMS Message (${smsTemplate.message.length} chars):\n`);
  console.log(smsTemplate.message);

  const urgentSmsTemplate = generateUrgentLeadSMS({
    businessName: 'ABC Plumbing',
    leadId: 'test-lead-123',
    serviceCategory: 'Emergency Plumbing',
    urgency: 'emergency',
    qualityScore: 9.2,
    location: 'Carmel, IN',
    dashboardUrl: 'https://leadflip.com/business',
  });

  console.log(`\n\nUrgent SMS Message (${urgentSmsTemplate.message.length} chars):\n`);
  console.log(urgentSmsTemplate.message);

  // Step 5: Send test notifications (if user confirms)
  console.log('\n=' .repeat(60));
  console.log('\n🚀 Step 5: Send Test Notifications?\n');

  console.log(`Test Email will be sent to: ${TEST_EMAIL}`);
  console.log(`Test SMS will be sent to: ${TEST_PHONE}`);
  console.log('\nTo send test notifications, set environment variables:');
  console.log('  SENDGRID_TEST_EMAIL=your-email@example.com');
  console.log('  TEST_PHONE_NUMBER=+15551234567');
  console.log('\nThen run: npx tsx scripts/test-notifications.ts --send');

  if (process.argv.includes('--send')) {
    console.log('\n📤 Sending test notifications...\n');

    // Send test email
    if (emailReady) {
      console.log('Sending test email...');
      const emailResult = await sendEmail({
        to: TEST_EMAIL,
        subject: emailTemplate.subject,
        htmlBody: emailTemplate.htmlBody,
        textBody: emailTemplate.textBody,
        replyTo: 'support@leadflip.com',
      });

      if (emailResult.success) {
        console.log(`✅ Email sent successfully! Message ID: ${emailResult.message_id}`);
      } else {
        console.error(`❌ Email failed: ${emailResult.error}`);
      }
    }

    // Send test SMS
    if (smsReady) {
      console.log('\nSending test SMS...');
      const smsResult = await sendSMS({
        to: formatPhoneNumber(TEST_PHONE),
        message: smsTemplate.message,
      });

      if (smsResult.success) {
        console.log(`✅ SMS sent successfully! Message ID: ${smsResult.message_id}`);
      } else {
        console.error(`❌ SMS failed: ${smsResult.error}`);
      }
    }

    console.log('\n✅ Test notifications sent! Check your email/phone.');
  } else {
    console.log('\n⏭️  Skipping actual sends. Add --send flag to send test notifications.');
  }

  console.log('\n=' .repeat(60));
  console.log('\n✅ Notification System Test Complete!\n');

  // Summary
  console.log('Summary:');
  console.log(`- Email System: ${emailReady ? '✅ Ready' : '❌ Not configured'}`);
  console.log(`- SMS System: ${smsReady ? '✅ Ready' : '❌ Not configured'}`);
  console.log(`- Email Template: ✅ Generated`);
  console.log(`- SMS Template: ✅ Generated`);

  if (process.argv.includes('--send')) {
    console.log(`- Test Email: Sent to ${TEST_EMAIL}`);
    console.log(`- Test SMS: Sent to ${TEST_PHONE}`);
  }

  console.log('\n');
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
