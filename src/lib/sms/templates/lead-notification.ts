/**
 * Lead Notification SMS Template
 * Concise SMS template for notifying businesses about new leads
 */

import { SMSTemplate } from '@/types/notifications';

export interface LeadNotificationSMSData {
  businessName: string;
  leadId: string;
  serviceCategory: string;
  urgency: string;
  qualityScore: number;
  location: string;
  dashboardUrl: string;
}

/**
 * Generate lead notification SMS template
 * SMS has 160 character limit per segment, aim for 2-3 segments max
 */
export function generateLeadNotificationSMS(data: LeadNotificationSMSData): SMSTemplate {
  const urgencyEmoji = getUrgencyEmoji(data.urgency);
  const qualityLabel = getQualityLabel(data.qualityScore);

  // Concise message optimized for SMS
  const message = `${urgencyEmoji} LeadFlip: New ${qualityLabel} lead!

${data.serviceCategory} | ${data.location}
Quality: ${data.qualityScore}/10

View & respond: ${shortenUrl(data.dashboardUrl, data.leadId)}

Tip: Respond in 15min for 4x conversion rate!`;

  return {
    message: message.trim(),
    includeLink: true,
  };
}

/**
 * Generate SMS for high-urgency leads (shorter, more direct)
 */
export function generateUrgentLeadSMS(data: LeadNotificationSMSData): SMSTemplate {
  const message = `🚨 URGENT LEAD - LeadFlip

${data.serviceCategory} in ${data.location}
Quality: ${data.qualityScore}/10

RESPOND NOW: ${shortenUrl(data.dashboardUrl, data.leadId)}`;

  return {
    message: message.trim(),
    includeLink: true,
  };
}

/**
 * Generate daily digest SMS (multiple leads summary)
 */
export function generateDailyDigestSMS(
  businessName: string,
  leadCount: number,
  dashboardUrl: string
): SMSTemplate {
  const message = `📊 LeadFlip Daily Summary

You have ${leadCount} new lead${leadCount > 1 ? 's' : ''} waiting!

View all: ${dashboardUrl}/leads

Reply STOP to pause notifications`;

  return {
    message: message.trim(),
    includeLink: true,
  };
}

/**
 * Generate follow-up reminder SMS
 */
export function generateFollowUpReminderSMS(
  leadId: string,
  serviceCategory: string,
  hoursWaiting: number,
  dashboardUrl: string
): SMSTemplate {
  const message = `⏰ Reminder: Lead waiting ${hoursWaiting}hrs

${serviceCategory} - Lead ${leadId.slice(0, 8)}

Don't miss out: ${shortenUrl(dashboardUrl, leadId)}`;

  return {
    message: message.trim(),
    includeLink: true,
  };
}

/**
 * Get urgency emoji
 */
function getUrgencyEmoji(urgency: string): string {
  const urgencyMap: Record<string, string> = {
    emergency: '🚨',
    urgent: '⚡',
    standard: '📋',
    flexible: '📅',
  };
  return urgencyMap[urgency.toLowerCase()] || '📋';
}

/**
 * Get quality label (short version for SMS)
 */
function getQualityLabel(score: number): string {
  if (score >= 9) return 'Premium';
  if (score >= 7) return 'High-Quality';
  if (score >= 5) return 'Good';
  if (score >= 3) return 'Fair';
  return 'Standard';
}

/**
 * Shorten URL for SMS (placeholder - would integrate with bit.ly or similar)
 * For now, creates a clean short link format
 */
function shortenUrl(dashboardUrl: string, leadId: string): string {
  // Extract domain from full URL
  const domain = dashboardUrl.replace(/^https?:\/\//, '').split('/')[0];

  // Create short link format
  // In production, this would call a URL shortener service
  return `${dashboardUrl}/l/${leadId.slice(0, 8)}`;
}

/**
 * Calculate SMS segment count
 * Standard SMS: 160 chars/segment
 * Unicode SMS: 70 chars/segment
 */
export function calculateSMSSegments(message: string): number {
  // Check if message contains unicode characters
  const hasUnicode = /[^\x00-\x7F]/.test(message);

  const maxLength = hasUnicode ? 70 : 160;
  return Math.ceil(message.length / maxLength);
}

/**
 * Validate SMS length (warn if > 3 segments)
 */
export function validateSMSLength(message: string): {
  valid: boolean;
  segments: number;
  length: number;
  warning?: string;
} {
  const segments = calculateSMSSegments(message);
  const length = message.length;

  if (segments > 3) {
    return {
      valid: false,
      segments,
      length,
      warning: `Message too long (${segments} segments). Consider shortening to 3 segments or less.`,
    };
  }

  if (segments > 2) {
    return {
      valid: true,
      segments,
      length,
      warning: `Message uses ${segments} segments. Consider shortening for better delivery rates.`,
    };
  }

  return {
    valid: true,
    segments,
    length,
  };
}
