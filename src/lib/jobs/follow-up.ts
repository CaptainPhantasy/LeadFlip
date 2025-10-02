/**
 * Follow-Up Job Handler
 *
 * Sends follow-up emails to prospective businesses who haven't activated.
 * Supports 3 follow-up sequences with different messaging (Day 3, 7, 14).
 */

import { Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import type { FollowUpJob } from './queues';
import { sendEmail } from '@/lib/email/mailgun';
import {
  followUp1,
  followUp2,
  followUp3,
  generateSignupLink,
} from '@/lib/email/templates';
import { SERVICE_CATEGORIES } from '@/lib/discovery/config';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Process follow-up job
 */
export async function processFollowUp(job: Job<FollowUpJob>) {
  const { prospectiveBusinessId, followUpNumber } = job.data;

  console.log(`[Follow-Up ${followUpNumber}] Processing for prospect: ${prospectiveBusinessId}`);

  try {
    // Step 1: Fetch business details from database
    const { data: business, error: fetchError } = await supabase
      .from('prospective_businesses')
      .select('*')
      .eq('id', prospectiveBusinessId)
      .single();

    if (fetchError || !business) {
      throw new Error(`Business not found: ${prospectiveBusinessId}`);
    }

    // Step 2: Check if business should receive follow-up
    const eligibilityCheck = checkFollowUpEligibility(business, followUpNumber);
    if (!eligibilityCheck.eligible) {
      console.log(`[Follow-Up ${followUpNumber}] Skipping ${business.name}: ${eligibilityCheck.reason}`);
      return {
        success: false,
        reason: eligibilityCheck.reason,
        status: business.invitation_status,
      };
    }

    // Step 3: Get service category display name
    const serviceConfig = SERVICE_CATEGORIES[business.service_category as keyof typeof SERVICE_CATEGORIES];
    const serviceCategoryDisplay = serviceConfig?.displayName || business.service_category;

    // Step 4: Generate signup link with tracking
    const signupLink = generateSignupLink(prospectiveBusinessId);

    // Step 5: Generate email content based on follow-up number
    const emailTemplate = generateFollowUpEmail(
      followUpNumber,
      business.name,
      serviceCategoryDisplay,
      signupLink
    );

    if (!emailTemplate) {
      throw new Error(`Invalid follow-up number: ${followUpNumber}`);
    }

    // Step 6: Determine recipient email (same logic as initial invitation)
    const recipientEmail = extractEmailFromWebsite(business.website) ||
                          `contact@${extractDomainFromWebsite(business.website) || 'business.com'}`;

    // Skip if no valid email
    if (!isValidEmail(recipientEmail)) {
      console.warn(`[Follow-Up ${followUpNumber}] No valid email for ${business.name}, skipping send`);
      return {
        success: false,
        reason: 'No valid email',
      };
    }

    // Step 7: Send email via SendGrid
    try {
      await sendEmail({
        to: recipientEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      console.log(`[Follow-Up ${followUpNumber}] Email sent to ${business.name} at ${recipientEmail}`);
    } catch (emailError) {
      console.error(`[Follow-Up ${followUpNumber}] Failed to send email:`, emailError);

      // Update status to bounced if this is the first follow-up
      if (followUpNumber === 1) {
        await supabase
          .from('prospective_businesses')
          .update({
            invitation_status: 'bounced',
          })
          .eq('id', prospectiveBusinessId);
      }

      throw emailError;
    }

    // Step 8: Update database with follow-up tracking
    const { error: updateError } = await supabase
      .from('prospective_businesses')
      .update({
        follow_up_count: business.follow_up_count + 1,
        last_follow_up_at: new Date().toISOString(),
        // If this is the final follow-up (3), mark as declined
        invitation_status: followUpNumber === 3 ? 'declined' : business.invitation_status,
      })
      .eq('id', prospectiveBusinessId);

    if (updateError) {
      console.error(`[Follow-Up ${followUpNumber}] Error updating status:`, updateError);
      throw updateError;
    }

    console.log(`[Follow-Up ${followUpNumber}] Successfully sent to: ${business.name}`);

    return {
      success: true,
      businessName: business.name,
      recipientEmail,
      followUpNumber,
      isFinal: followUpNumber === 3,
    };

  } catch (error: any) {
    console.error(`[Follow-Up ${followUpNumber}] Job failed:`, error);
    throw error; // Will trigger retry via BullMQ
  }
}

/**
 * Check if a business is eligible for a follow-up
 */
function checkFollowUpEligibility(
  business: any,
  followUpNumber: number
): { eligible: boolean; reason?: string } {
  // Don't send if already activated
  if (business.invitation_status === 'activated') {
    return { eligible: false, reason: 'Already activated' };
  }

  // Don't send if declined
  if (business.invitation_status === 'declined') {
    return { eligible: false, reason: 'Already declined' };
  }

  // Don't send if bounced
  if (business.invitation_status === 'bounced') {
    return { eligible: false, reason: 'Email bounced' };
  }

  // Check if this follow-up has already been sent
  if (business.follow_up_count >= followUpNumber) {
    return { eligible: false, reason: `Follow-up ${followUpNumber} already sent` };
  }

  // Must be invited or clicked to receive follow-ups
  if (business.invitation_status !== 'invited' && business.invitation_status !== 'clicked') {
    return { eligible: false, reason: `Invalid status: ${business.invitation_status}` };
  }

  return { eligible: true };
}

/**
 * Generate email template based on follow-up number
 */
function generateFollowUpEmail(
  followUpNumber: number,
  businessName: string,
  serviceCategory: string,
  signupLink: string
) {
  switch (followUpNumber) {
    case 1:
      return followUp1(businessName, serviceCategory, signupLink);
    case 2:
      return followUp2(businessName, serviceCategory, signupLink);
    case 3:
      return followUp3(businessName, signupLink);
    default:
      return null;
  }
}

/**
 * Extract email from website URL (placeholder)
 * In production, this should scrape the website or use a contact API
 */
function extractEmailFromWebsite(website: string | null): string | null {
  if (!website) return null;

  // This is a placeholder - in production, you would:
  // 1. Scrape the website for contact emails
  // 2. Use a service like Hunter.io or Clearbit
  // 3. Look up in a business directory API

  // For now, return null to indicate we need to implement this
  return null;
}

/**
 * Extract domain from website URL
 */
function extractDomainFromWebsite(website: string | null): string | null {
  if (!website) return null;

  try {
    const url = new URL(website);
    return url.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
