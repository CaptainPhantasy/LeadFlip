/**
 * Lead Notification Email Template
 * Professional email template for notifying businesses about new leads
 */

import { EmailTemplate } from '@/types/notifications';

export interface LeadNotificationData {
  businessName: string;
  leadId: string;
  serviceCategory: string;
  urgency: string;
  qualityScore: number;
  location: string;
  budget?: string;
  description: string;
  keyRequirements: string[];
  consumerName?: string;
  matchReason?: string;
  dashboardUrl: string;
}

/**
 * Generate lead notification email template
 */
export function generateLeadNotificationEmail(data: LeadNotificationData): EmailTemplate {
  const urgencyEmoji = getUrgencyEmoji(data.urgency);
  const qualityBadge = getQualityBadge(data.qualityScore);

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Lead Match - LeadFlip</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">New Lead Match ${urgencyEmoji}</h1>
              <p style="margin: 10px 0 0; color: #e9d5ff; font-size: 14px;">LeadFlip has found a potential customer for ${data.businessName}</p>
            </td>
          </tr>

          <!-- Quality Badge -->
          <tr>
            <td style="padding: 20px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              ${qualityBadge}
            </td>
          </tr>

          <!-- Lead Details -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 20px; font-weight: 600;">Lead Details</h2>

              <table width="100%" cellpadding="8" cellspacing="0" border="0">
                <tr>
                  <td style="color: #71717a; font-size: 14px; font-weight: 500; width: 140px;">Service Needed:</td>
                  <td style="color: #18181b; font-size: 14px; font-weight: 600;">${data.serviceCategory}</td>
                </tr>
                <tr>
                  <td style="color: #71717a; font-size: 14px; font-weight: 500;">Urgency:</td>
                  <td style="color: #18181b; font-size: 14px; font-weight: 600;">${capitalizeFirst(data.urgency)}</td>
                </tr>
                <tr>
                  <td style="color: #71717a; font-size: 14px; font-weight: 500;">Location:</td>
                  <td style="color: #18181b; font-size: 14px; font-weight: 600;">${data.location}</td>
                </tr>
                ${data.budget ? `
                <tr>
                  <td style="color: #71717a; font-size: 14px; font-weight: 500;">Budget:</td>
                  <td style="color: #18181b; font-size: 14px; font-weight: 600;">${data.budget}</td>
                </tr>
                ` : ''}
              </table>

              <!-- Description -->
              <div style="margin-top: 20px; padding: 16px; background-color: #f4f4f5; border-radius: 6px; border-left: 4px solid #6366f1;">
                <p style="margin: 0; color: #71717a; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Customer's Request</p>
                <p style="margin: 8px 0 0; color: #18181b; font-size: 14px; line-height: 1.6;">${data.description}</p>
              </div>

              <!-- Key Requirements -->
              ${data.keyRequirements.length > 0 ? `
              <div style="margin-top: 20px;">
                <p style="margin: 0 0 10px; color: #71717a; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Key Requirements</p>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #18181b; font-size: 14px; line-height: 1.8;">
                  ${data.keyRequirements.map(req => `<li>${req}</li>`).join('')}
                </ul>
              </div>
              ` : ''}

              <!-- Match Reason -->
              ${data.matchReason ? `
              <div style="margin-top: 20px; padding: 12px; background-color: #dbeafe; border-radius: 6px;">
                <p style="margin: 0; color: #1e40af; font-size: 13px; line-height: 1.5;"><strong>Why you were matched:</strong> ${data.matchReason}</p>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${data.dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">View Lead Details</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px;">
                    <p style="margin: 0; color: #71717a; font-size: 12px;">Respond within 15 minutes to increase your conversion rate by 400%</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; background-color: #fafafa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">Lead ID: ${data.leadId}</p>
              <p style="margin: 8px 0 0; color: #71717a; font-size: 12px;">
                <a href="${data.dashboardUrl}/settings" style="color: #6366f1; text-decoration: none;">Manage Preferences</a> |
                <a href="https://leadflip.com/help" style="color: #6366f1; text-decoration: none;">Get Help</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textBody = `
NEW LEAD MATCH - LEADFLIP

Hi ${data.businessName},

We've found a new potential customer that matches your services!

LEAD QUALITY: ${data.qualityScore}/10 ${getQualityLabel(data.qualityScore)}

LEAD DETAILS:
- Service Needed: ${data.serviceCategory}
- Urgency: ${capitalizeFirst(data.urgency)}
- Location: ${data.location}
${data.budget ? `- Budget: ${data.budget}` : ''}

CUSTOMER'S REQUEST:
${data.description}

${data.keyRequirements.length > 0 ? `
KEY REQUIREMENTS:
${data.keyRequirements.map(req => `- ${req}`).join('\n')}
` : ''}

${data.matchReason ? `WHY YOU WERE MATCHED:\n${data.matchReason}\n` : ''}

View full lead details and respond:
${data.dashboardUrl}

TIP: Respond within 15 minutes to increase your conversion rate by 400%

---
Lead ID: ${data.leadId}
Manage Preferences: ${data.dashboardUrl}/settings
  `.trim();

  return {
    subject: `${urgencyEmoji} New ${capitalizeFirst(data.urgency)} Lead: ${data.serviceCategory} in ${data.location}`,
    htmlBody,
    textBody,
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
 * Get quality badge HTML
 */
function getQualityBadge(score: number): string {
  const label = getQualityLabel(score);
  const color = getQualityColor(score);

  return `
    <div style="display: inline-block; padding: 10px 20px; background-color: ${color}; border-radius: 20px;">
      <span style="color: #ffffff; font-size: 14px; font-weight: 700;">Lead Quality: ${score}/10 - ${label}</span>
    </div>
  `;
}

/**
 * Get quality label
 */
function getQualityLabel(score: number): string {
  if (score >= 9) return 'Excellent';
  if (score >= 7) return 'High Quality';
  if (score >= 5) return 'Good';
  if (score >= 3) return 'Fair';
  return 'Low';
}

/**
 * Get quality color
 */
function getQualityColor(score: number): string {
  if (score >= 9) return '#059669'; // Green
  if (score >= 7) return '#0891b2'; // Cyan
  if (score >= 5) return '#6366f1'; // Indigo
  if (score >= 3) return '#f59e0b'; // Amber
  return '#71717a'; // Gray
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
