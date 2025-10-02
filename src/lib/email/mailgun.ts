/**
 * Mailgun Email Client
 * Handles email sending via Mailgun API
 */

import Mailgun from 'mailgun.js';
import formData from 'form-data';

const mailgun = new Mailgun(formData);

// Initialize Mailgun client
let mg: ReturnType<typeof mailgun.client> | null = null;

function getMailgunClient() {
  if (!mg) {
    const apiKey = process.env.MAILGUN_API_KEY;
    if (!apiKey) {
      console.warn('[Mailgun] API key not configured - emails will not be sent');
      return null;
    }
    mg = mailgun.client({ username: 'api', key: apiKey });
  }
  return mg;
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

/**
 * Send an email via Mailgun
 */
export async function sendEmail(data: EmailData): Promise<boolean> {
  const client = getMailgunClient();

  if (!client) {
    console.warn('[Mailgun] Skipping email send - client not initialized');
    return false;
  }

  const domain = process.env.MAILGUN_DOMAIN;
  if (!domain) {
    console.error('[Mailgun] MAILGUN_DOMAIN not configured');
    return false;
  }

  const fromEmail = data.from || process.env.MAILGUN_FROM_EMAIL || `LeadFlip <postmaster@${domain}>`;

  try {
    console.log('[Mailgun] Sending email:', {
      to: data.to,
      subject: data.subject,
      from: fromEmail,
    });

    const response = await client.messages.create(domain, {
      from: fromEmail,
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html,
    });

    console.log('[Mailgun] Email sent successfully:', response.id);
    return true;
  } catch (error) {
    console.error('[Mailgun] Failed to send email:', error);
    return false;
  }
}

/**
 * Send test email to verify Mailgun configuration
 */
export async function sendTestEmail(recipientEmail: string): Promise<boolean> {
  return sendEmail({
    to: recipientEmail,
    subject: 'LeadFlip - Mailgun Test Email',
    html: `
      <h1>Mailgun Configuration Test</h1>
      <p>This is a test email from LeadFlip to verify Mailgun is configured correctly.</p>
      <p>If you received this email, your Mailgun integration is working! 🎉</p>
    `,
    text: 'This is a test email from LeadFlip. If you received this, Mailgun is working correctly!',
  });
}
