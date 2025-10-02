/**
 * Send Invitation Job Handler
 *
 * Sends initial invitation email to a prospective business.
 * Generates personalized email content and tracks invitation status.
 */

import { Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import type { SendInvitationJob } from './queues';
import { sendEmail } from '@/lib/email/mailgun';
import { initialInvitation, generateSignupLink } from '@/lib/email/templates';
import { SERVICE_CATEGORIES } from '@/lib/discovery/config';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Process send invitation job
 */
export async function processSendInvitation(job: Job<SendInvitationJob>) {
  const { prospectiveBusinessId } = job.data;

  console.log(`[Send Invitation] Processing invitation for prospect: ${prospectiveBusinessId}`);

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

    // Step 2: Validate business has required data
    if (!business.name) {
      throw new Error('Business name is required');
    }

    if (!business.city) {
      throw new Error('Business city is required');
    }

    // Step 3: Check if already invited
    if (business.invitation_status !== 'pending') {
      console.log(`[Send Invitation] Business already invited: ${business.name} (status: ${business.invitation_status})`);
      return {
        success: false,
        reason: 'Already invited',
        status: business.invitation_status,
      };
    }

    // Step 4: Check if business is qualified
    if (!business.qualified) {
      console.log(`[Send Invitation] Business not qualified: ${business.name}`);
      return {
        success: false,
        reason: 'Not qualified',
        disqualificationReason: business.disqualification_reason,
      };
    }

    // Step 5: Get service category display name
    const serviceConfig = SERVICE_CATEGORIES[business.service_category as keyof typeof SERVICE_CATEGORIES];
    const serviceCategoryDisplay = serviceConfig?.displayName || business.service_category;

    // Step 6: Generate signup link with tracking
    const signupLink = generateSignupLink(prospectiveBusinessId);

    // Step 7: Generate email content
    const emailTemplate = initialInvitation(
      business.name,
      serviceCategoryDisplay,
      business.rating || 4.0,
      business.city,
      signupLink
    );

    // Step 8: Determine recipient email
    // First try website email extraction, then fall back to a generic format
    const recipientEmail = extractEmailFromWebsite(business.website) ||
                          `contact@${extractDomainFromWebsite(business.website) || 'business.com'}`;

    // For testing, we might not have real emails, so skip sending if no valid email
    if (!isValidEmail(recipientEmail)) {
      console.warn(`[Send Invitation] No valid email for ${business.name}, skipping send`);

      // Update status to show we attempted but couldn't find email
      await supabase
        .from('prospective_businesses')
        .update({
          invitation_status: 'pending',
          disqualification_reason: 'No valid email found',
        })
        .eq('id', prospectiveBusinessId);

      return {
        success: false,
        reason: 'No valid email',
      };
    }

    // Step 9: Send email via Mailgun
    try {
      await sendEmail({
        to: recipientEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      console.log(`[Send Invitation] Email sent to ${business.name} at ${recipientEmail}`);
    } catch (emailError) {
      console.error(`[Send Invitation] Failed to send email:`, emailError);

      // Update status to bounced
      await supabase
        .from('prospective_businesses')
        .update({
          invitation_status: 'bounced',
        })
        .eq('id', prospectiveBusinessId);

      throw emailError;
    }

    // Step 10: Update database with invitation status
    const { error: updateError } = await supabase
      .from('prospective_businesses')
      .update({
        invitation_status: 'invited',
        invitation_sent_at: new Date().toISOString(),
      })
      .eq('id', prospectiveBusinessId);

    if (updateError) {
      console.error(`[Send Invitation] Error updating status:`, updateError);
      throw updateError;
    }

    console.log(`[Send Invitation] Successfully invited: ${business.name}`);

    return {
      success: true,
      businessName: business.name,
      recipientEmail,
      signupLink,
    };

  } catch (error: any) {
    console.error(`[Send Invitation] Job failed:`, error);
    throw error; // Will trigger retry via BullMQ
  }
}

/**
 * Extract email from website URL (very basic implementation)
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
