/**
 * Twilio SMS Client
 * Wrapper for Twilio SMS sending functionality
 */

import twilio from 'twilio';
import { NotificationResult } from '@/types/notifications';

// Initialize Twilio client
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

let twilioClient: twilio.Twilio | null = null;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export interface SendSMSOptions {
  to: string;
  message: string;
  from?: string;
  statusCallback?: string;
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(options: SendSMSOptions): Promise<NotificationResult> {
  if (!twilioClient) {
    console.warn('⚠️ Twilio not configured, skipping SMS send');
    return {
      success: false,
      error: 'Twilio client not configured',
      sent_at: new Date().toISOString(),
      channel: 'sms',
    };
  }

  try {
    // Validate phone number format (basic check)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(options.to.replace(/[\s()-]/g, ''))) {
      throw new Error(`Invalid phone number format: ${options.to}`);
    }

    const message = await twilioClient.messages.create({
      body: options.message,
      from: options.from || TWILIO_PHONE_NUMBER,
      to: options.to,
      statusCallback: options.statusCallback,
    });

    console.log(`✅ SMS sent to ${options.to} - SID: ${message.sid}`);

    return {
      success: true,
      message_id: message.sid,
      sent_at: new Date().toISOString(),
      channel: 'sms',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Twilio SMS failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
      sent_at: new Date().toISOString(),
      channel: 'sms',
    };
  }
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phone: string, defaultCountryCode: string = '+1'): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If already has country code
  if (phone.startsWith('+')) {
    return phone;
  }

  // If 10 digits (US/Canada), add country code
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }

  // If 11 digits and starts with 1 (US/Canada)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Otherwise return as-is with + prefix
  return `${defaultCountryCode}${digits}`;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  const cleanPhone = phone.replace(/[\s()-]/g, '');
  return phoneRegex.test(cleanPhone);
}

/**
 * Send bulk SMS (batch sending with rate limiting)
 */
export async function sendBulkSMS(
  recipients: Array<{ to: string; message: string }>,
  delayMs: number = 100
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  for (const recipient of recipients) {
    const result = await sendSMS(recipient);
    results.push(result);

    // Rate limiting delay
    if (delayMs > 0 && recipients.indexOf(recipient) < recipients.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Get SMS delivery status
 */
export async function getSMSStatus(messageSid: string): Promise<{
  status: string;
  errorCode?: number;
  errorMessage?: string;
}> {
  if (!twilioClient) {
    throw new Error('Twilio client not configured');
  }

  try {
    const message = await twilioClient.messages(messageSid).fetch();

    return {
      status: message.status,
      errorCode: message.errorCode ?? undefined,
      errorMessage: message.errorMessage ?? undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to fetch SMS status:', errorMessage);
    throw error;
  }
}

/**
 * Verify Twilio configuration
 */
export function isConfigured(): boolean {
  return !!TWILIO_ACCOUNT_SID && !!TWILIO_AUTH_TOKEN && !!TWILIO_PHONE_NUMBER;
}

/**
 * Test Twilio connection
 */
export async function testConnection(): Promise<boolean> {
  if (!twilioClient) {
    console.error('❌ Twilio client not configured');
    return false;
  }

  try {
    // Fetch account details to verify connection
    const account = await twilioClient.api.accounts(TWILIO_ACCOUNT_SID).fetch();

    console.log(`✅ Twilio connection test successful - Account: ${account.friendlyName}`);
    return true;
  } catch (error) {
    console.error('❌ Twilio connection test failed:', error);
    return false;
  }
}
