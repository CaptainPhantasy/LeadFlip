/**
 * Main Orchestrator Agent
 *
 * Purpose: Coordinates the entire lead lifecycle from submission to conversion
 *
 * Responsibilities:
 * 1. Receive consumer problem submissions
 * 2. Invoke Lead Classifier subagent
 * 3. Score lead quality (0-10 scale)
 * 4. Invoke Business Matcher subagent
 * 5. Generate notification content via Response Generator subagent
 * 6. Send notifications to matched businesses
 * 7. Track conversions and update memory
 */

import { classifyLead, type ClassifiedLead } from './lead-classifier';
import { BusinessMatcherAgent, type BusinessMatch } from './business-matcher';
import { ResponseGeneratorAgent, type GeneratedResponse } from './response-generator';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/sendgrid-client';
import { sendSMS } from '@/lib/sms/signalwire-client';
import { generateLeadNotificationEmail, type LeadNotificationData } from '@/lib/email/templates/lead-notification';
import { generateLeadNotificationSMS, generateUrgentLeadSMS, type LeadNotificationSMSData } from '@/lib/sms/templates/lead-notification';
import type { NotificationResult } from '@/types/notifications';

export interface RawLeadSubmission {
  consumer_id: string;
  problem_text: string;
  contact_phone?: string;
  contact_email?: string;
}

export interface OrchestratorResult {
  lead_id: string;
  classified_lead: ClassifiedLead;
  quality_score: number;
  matches: BusinessMatch[];
  notifications_sent: number;
  status: 'matched' | 'no_matches' | 'low_quality' | 'error';
  error?: string;
}

export interface OrchestratorConfig {
  minQualityScore?: number;
  maxMatches?: number;
  autoSendNotifications?: boolean;
}

const DEFAULT_CONFIG: Required<OrchestratorConfig> = {
  minQualityScore: 5.0,
  maxMatches: 10,
  autoSendNotifications: true,
};

export class MainOrchestratorAgent {
  private matcher: BusinessMatcherAgent;
  private responseGenerator: ResponseGeneratorAgent;
  private supabase;
  private config: Required<OrchestratorConfig>;

  constructor(config: OrchestratorConfig = {}) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const anthropicKey = process.env.ANTHROPIC_API_KEY!;

    this.matcher = new BusinessMatcherAgent(supabaseUrl, supabaseKey);
    this.responseGenerator = new ResponseGeneratorAgent(anthropicKey);
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main orchestration flow - processes a raw lead submission end-to-end
   */
  async processLead(submission: RawLeadSubmission): Promise<OrchestratorResult> {
    console.log('🎯 Orchestrator: Starting lead processing...');

    try {
      // STEP 1: Classify the raw lead text
      console.log('📋 Step 1: Classifying lead...');
      const classifiedLead = await classifyLead(submission.problem_text);
      console.log(`✅ Classification complete. Quality score: ${classifiedLead.quality_score}/10`);

      // STEP 2: Check quality threshold
      if (classifiedLead.quality_score < this.config.minQualityScore) {
        console.log(`⚠️  Lead quality too low (${classifiedLead.quality_score} < ${this.config.minQualityScore})`);

        // Save lead but mark as low quality
        const leadId = await this.saveLead(submission, classifiedLead, 'low_quality');

        return {
          lead_id: leadId,
          classified_lead: classifiedLead,
          quality_score: classifiedLead.quality_score,
          matches: [],
          notifications_sent: 0,
          status: 'low_quality',
        };
      }

      // STEP 3: Save lead to database
      console.log('💾 Step 2: Saving lead to database...');
      const leadId = await this.saveLead(submission, classifiedLead, 'pending');
      console.log(`✅ Lead saved with ID: ${leadId}`);

      // STEP 4: Find matching businesses
      console.log('🔍 Step 3: Finding matching businesses...');
      const matches = await this.matcher.findMatches(classifiedLead);
      console.log(`✅ Found ${matches.length} matches`);

      if (matches.length === 0) {
        console.log('❌ No matches found');
        await this.updateLeadStatus(leadId, 'no_matches');

        return {
          lead_id: leadId,
          classified_lead: classifiedLead,
          quality_score: classifiedLead.quality_score,
          matches: [],
          notifications_sent: 0,
          status: 'no_matches',
        };
      }

      // STEP 5: Save matches to database
      console.log('💾 Step 4: Saving matches...');
      await this.saveMatches(leadId, matches);

      // STEP 6: Generate notification messages and send
      let notificationsSent = 0;
      if (this.config.autoSendNotifications) {
        console.log('📧 Step 5: Generating and sending notifications...');
        notificationsSent = await this.sendNotifications(leadId, classifiedLead, matches, submission.problem_text);
        console.log(`✅ Sent ${notificationsSent} notifications`);
      }

      // STEP 7: Update lead status
      await this.updateLeadStatus(leadId, 'matched');

      console.log('🎉 Orchestrator: Lead processing complete!');

      return {
        lead_id: leadId,
        classified_lead: classifiedLead,
        quality_score: classifiedLead.quality_score,
        matches,
        notifications_sent: notificationsSent,
        status: 'matched',
      };
    } catch (error) {
      console.error('❌ Orchestrator error:', error);

      return {
        lead_id: '',
        classified_lead: {} as ClassifiedLead,
        quality_score: 0,
        matches: [],
        notifications_sent: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Save classified lead to database
   */
  private async saveLead(
    submission: RawLeadSubmission,
    classifiedLead: ClassifiedLead,
    status: string
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('leads')
      .insert({
        user_id: submission.consumer_id,
        problem_text: submission.problem_text,
        contact_phone: submission.contact_phone,
        contact_email: submission.contact_email,
        service_category: classifiedLead.service_category,
        urgency: classifiedLead.urgency,
        budget_min: classifiedLead.budget_min,
        budget_max: classifiedLead.budget_max,
        location_zip: classifiedLead.location_zip,
        quality_score: classifiedLead.quality_score,
        status,
        classified_data: classifiedLead,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to save lead: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Update lead status
   */
  private async updateLeadStatus(leadId: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId);

    if (error) {
      console.error('Failed to update lead status:', error);
    }
  }

  /**
   * Save business matches to database
   */
  private async saveMatches(leadId: string, matches: BusinessMatch[]): Promise<void> {
    const matchRecords = matches.map((match) => ({
      lead_id: leadId,
      business_id: match.business_id,
      confidence_score: match.confidence_score,
      distance_miles: match.distance_miles,
      match_reasons: match.match_reasons,
      status: 'active',
    }));

    const { error } = await this.supabase.from('matches').insert(matchRecords);

    if (error) {
      throw new Error(`Failed to save matches: ${error.message}`);
    }
  }

  /**
   * Generate notification messages and send to businesses
   */
  private async sendNotifications(
    leadId: string,
    classifiedLead: ClassifiedLead,
    matches: BusinessMatch[],
    problemText: string
  ): Promise<number> {
    let sentCount = 0;

    // Process notifications in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < matches.length; i += batchSize) {
      const batch = matches.slice(i, i + batchSize);

      const batchPromises = batch.map(async (match) => {
        try {
          // 1. Check business capacity
          const hasCapacity = await this.matcher.checkCapacity(match.business_id);
          if (!hasCapacity) {
            console.log(`⏭️  Skipping ${match.business_name} - no capacity`);
            return false;
          }

          // 2. Get business details
          const business = await this.getBusinessDetails(match.business_id);
          if (!business) {
            console.log(`⏭️  Skipping ${match.business_name} - no details found`);
            return false;
          }

          // 3. Generate personalized message
          const response = await this.responseGenerator.generateResponse(
            {
              service_category: classifiedLead.service_category,
              urgency: classifiedLead.urgency,
              location_city: 'Unknown', // TODO: Geocode from ZIP
              location_zip: classifiedLead.location_zip,
              budget_max: classifiedLead.budget_max,
              key_requirements: classifiedLead.key_requirements,
              problem_description: problemText,
            },
            {
              name: business.name,
              rating: business.rating,
              years_in_business: business.years_in_business || 0,
              service_categories: business.service_categories || [],
              completed_jobs: business.completed_jobs || 0,
            }
          );

          // 4. Send notification (via email/SMS/Slack based on business preferences)
          await this.sendNotificationToBusiness(
            match.business_id,
            leadId,
            response,
            business.notification_preferences
          );

          console.log(`✅ Notification sent to ${match.business_name}`);
          return true;
        } catch (error) {
          console.error(`❌ Failed to notify ${match.business_name}:`, error);
          return false;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      sentCount += batchResults.filter(Boolean).length;
    }

    return sentCount;
  }

  /**
   * Get business details from database
   */
  private async getBusinessDetails(businessId: string) {
    const { data, error } = await this.supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (error) {
      console.error('Error fetching business details:', error);
      return null;
    }

    return data;
  }

  /**
   * Send notification to business via their preferred channel
   */
  private async sendNotificationToBusiness(
    businessId: string,
    leadId: string,
    response: GeneratedResponse,
    preferences: any
  ): Promise<void> {
    // Get business details for notification
    const business = await this.getBusinessDetails(businessId);
    if (!business) {
      console.error(`❌ Cannot send notification - business ${businessId} not found`);
      return;
    }

    // Get lead details for notification
    const { data: lead } = await this.supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead) {
      console.error(`❌ Cannot send notification - lead ${leadId} not found`);
      return;
    }

    const classifiedData = lead.classified_data as ClassifiedLead;

    // Prepare notification data
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflip.com';
    // [2025-10-01 8:35 PM] Agent 1: Fixed TypeScript error - location_city doesn't exist in ClassifiedLead type
    const location = classifiedData.location_zip
      ? classifiedData.location_zip
      : 'Unknown location';

    const budget = classifiedData.budget_max
      ? classifiedData.budget_min
        ? `$${classifiedData.budget_min} - $${classifiedData.budget_max}`
        : `Up to $${classifiedData.budget_max}`
      : undefined;

    const notificationResults: NotificationResult[] = [];

    // 1. Send Email Notification (if enabled and email available)
    if (preferences?.email_enabled !== false && business.email) {
      try {
        const emailData: LeadNotificationData = {
          businessName: business.name,
          leadId: leadId,
          serviceCategory: classifiedData.service_category,
          urgency: classifiedData.urgency,
          qualityScore: classifiedData.quality_score,
          location: location,
          budget: budget,
          description: response.message,
          keyRequirements: classifiedData.key_requirements || [],
          matchReason: response.call_to_action,
          dashboardUrl: `${dashboardUrl}/business/leads`,
        };

        const emailTemplate = generateLeadNotificationEmail(emailData);

        const emailResult = await sendEmail({
          to: business.email,
          subject: emailTemplate.subject,
          htmlBody: emailTemplate.htmlBody,
          textBody: emailTemplate.textBody,
          replyTo: 'support@leadflip.com',
        });

        notificationResults.push(emailResult);

        if (emailResult.success) {
          console.log(`✅ Email sent to ${business.email}`);
        } else {
          console.error(`❌ Email failed to ${business.email}: ${emailResult.error}`);
        }
      } catch (error: any) {
        console.error(`❌ Email notification failed:`, error.message);
      }
    }

    // 2. Send SMS Notification (if enabled and phone available)
    if (preferences?.sms_enabled && business.phone_number) {
      try {
        const smsData: LeadNotificationSMSData = {
          businessName: business.name,
          leadId: leadId,
          serviceCategory: classifiedData.service_category,
          urgency: classifiedData.urgency,
          qualityScore: classifiedData.quality_score,
          location: location,
          dashboardUrl: `${dashboardUrl}/business/leads`,
        };

        // [2025-10-01 8:35 PM] Agent 1: Fixed TypeScript error - 'urgent' is not a valid Urgency value (use 'high' instead)
        // Use urgent template for emergency/high urgency leads
        const smsTemplate =
          classifiedData.urgency === 'emergency' || classifiedData.urgency === 'high'
            ? generateUrgentLeadSMS(smsData)
            : generateLeadNotificationSMS(smsData);

        const smsResult = await sendSMS({
          to: business.phone_number,
          message: smsTemplate.message,
        });

        notificationResults.push(smsResult);

        if (smsResult.success) {
          console.log(`✅ SMS sent to ${business.phone_number}`);
        } else {
          console.error(`❌ SMS failed to ${business.phone_number}: ${smsResult.error}`);
        }
      } catch (error: any) {
        console.error(`❌ SMS notification failed:`, error.message);
      }
    }

    // 3. Log all notifications in database (if notifications table exists)
    try {
      const notificationRecords = notificationResults.map((result) => ({
        business_id: businessId,
        lead_id: leadId,
        channel: result.channel,
        recipient: result.channel === 'email' ? business.email : business.phone_number,
        subject: response.subject,
        message: response.message,
        status: result.success ? 'sent' : 'failed',
        message_id: result.message_id,
        error_message: result.error,
        sent_at: result.sent_at,
      }));

      if (notificationRecords.length > 0) {
        // Try to insert, but don't fail if table doesn't exist yet
        await this.supabase.from('notifications').insert(notificationRecords);
      }
    } catch (error: any) {
      // Silently fail if notifications table doesn't exist yet
      // This allows the system to work before Track 1 creates the migration
      if (!error.message?.includes('relation "notifications" does not exist')) {
        console.error('❌ Failed to log notifications:', error.message);
      }
    }

    // Log summary
    const successCount = notificationResults.filter((r) => r.success).length;
    const failCount = notificationResults.filter((r) => !r.success).length;

    console.log(
      `📧 Notification summary for business ${businessId}: ${successCount} sent, ${failCount} failed`
    );
  }

  /**
   * Get orchestrator statistics
   */
  async getStats(days: number = 30): Promise<any> {
    const { data: leads } = await this.supabase
      .from('leads')
      .select('*')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    const { data: matches } = await this.supabase
      .from('matches')
      .select('*')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    const totalLeads = leads?.length || 0;
    const matchedLeads = leads?.filter((l) => l.status === 'matched').length || 0;
    const lowQualityLeads = leads?.filter((l) => l.status === 'low_quality').length || 0;
    const avgQualityScore =
      leads?.reduce((sum, l) => sum + (l.quality_score || 0), 0) / totalLeads || 0;
    const totalMatches = matches?.length || 0;
    const avgMatchesPerLead = totalMatches / matchedLeads || 0;

    return {
      totalLeads,
      matchedLeads,
      lowQualityLeads,
      avgQualityScore: avgQualityScore.toFixed(2),
      totalMatches,
      avgMatchesPerLead: avgMatchesPerLead.toFixed(2),
      matchRate: ((matchedLeads / totalLeads) * 100).toFixed(1) + '%',
    };
  }
}

/**
 * Standalone function for quick lead processing (used by API endpoints)
 */
export async function processConsumerLead(
  submission: RawLeadSubmission
): Promise<OrchestratorResult> {
  const orchestrator = new MainOrchestratorAgent();
  return orchestrator.processLead(submission);
}
