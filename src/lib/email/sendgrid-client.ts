/**
 * SendGrid Email Client
 * Wrapper for SendGrid email sending functionality
 */

import sgMail from '@sendgrid/mail';
import { EmailTemplate, NotificationResult } from '@/types/notifications';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@leadflip.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'LeadFlip';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * Send email via SendGrid
 */
export async function sendEmail(options: SendEmailOptions): Promise<NotificationResult> {
  if (!SENDGRID_API_KEY) {
    console.warn('⚠️ SENDGRID_API_KEY not configured, skipping email send');
    return {
      success: false,
      error: 'SendGrid API key not configured',
      sent_at: new Date().toISOString(),
      channel: 'email',
    };
  }

  try {
    const msg = {
      to: options.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: options.subject,
      text: options.textBody,
      html: options.htmlBody,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    };

    const [response] = await sgMail.send(msg);

    console.log(`✅ Email sent to ${options.to} - Status: ${response.statusCode}`);

    return {
      success: true,
      message_id: response.headers['x-message-id'] as string,
      sent_at: new Date().toISOString(),
      channel: 'email',
    };
  } catch (error: any) {
    console.error('❌ SendGrid email failed:', error.response?.body || error.message);

    return {
      success: false,
      error: error.response?.body?.errors?.[0]?.message || error.message,
      sent_at: new Date().toISOString(),
      channel: 'email',
    };
  }
}

/**
 * Send bulk emails (up to 1000 recipients)
 */
export async function sendBulkEmails(
  recipients: string[],
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<NotificationResult[]> {
  if (!SENDGRID_API_KEY) {
    console.warn('⚠️ SENDGRID_API_KEY not configured, skipping bulk email send');
    return recipients.map(() => ({
      success: false,
      error: 'SendGrid API key not configured',
      sent_at: new Date().toISOString(),
      channel: 'email' as const,
    }));
  }

  try {
    const msg = {
      to: recipients,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject,
      text: textBody,
      html: htmlBody,
    };

    const [response] = await sgMail.sendMultiple(msg);

    console.log(`✅ Bulk email sent to ${recipients.length} recipients - Status: ${response.statusCode}`);

    return recipients.map(() => ({
      success: true,
      message_id: response.headers['x-message-id'] as string,
      sent_at: new Date().toISOString(),
      channel: 'email' as const,
    }));
  } catch (error: any) {
    console.error('❌ SendGrid bulk email failed:', error.response?.body || error.message);

    return recipients.map(() => ({
      success: false,
      error: error.response?.body?.errors?.[0]?.message || error.message,
      sent_at: new Date().toISOString(),
      channel: 'email' as const,
    }));
  }
}

/**
 * Verify SendGrid configuration
 */
export function isConfigured(): boolean {
  return !!SENDGRID_API_KEY && !!FROM_EMAIL;
}

/**
 * Test SendGrid connection
 */
export async function testConnection(): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.error('❌ SendGrid API key not configured');
    return false;
  }

  try {
    // Send test email to a verification address
    const testEmail = process.env.SENDGRID_TEST_EMAIL || FROM_EMAIL;

    await sendEmail({
      to: testEmail,
      subject: 'LeadFlip - SendGrid Test Email',
      htmlBody: '<p>This is a test email from LeadFlip to verify SendGrid configuration.</p>',
      textBody: 'This is a test email from LeadFlip to verify SendGrid configuration.',
    });

    console.log('✅ SendGrid connection test successful');
    return true;
  } catch (error) {
    console.error('❌ SendGrid connection test failed:', error);
    return false;
  }
}
