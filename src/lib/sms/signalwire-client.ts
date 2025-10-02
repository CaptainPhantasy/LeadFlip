/**
 * SignalWire SMS Client
 * Wrapper for SignalWire SMS sending functionality
 *
 * SignalWire provides a Twilio-compatible API, so migration is seamless.
 */

// [2025-10-01 8:35 PM] Agent 1: Fixed type import issue with SignalWire package
// @ts-expect-error - SignalWire types issue with package.json exports
import { RestClient } from '@signalwire/compatibility-api';
import { NotificationResult } from '@/types/notifications';

// Initialize SignalWire client
const SIGNALWIRE_PROJECT_ID = process.env.SIGNALWIRE_PROJECT_ID || process.env.TWILIO_ACCOUNT_SID || '';
const SIGNALWIRE_API_TOKEN = process.env.SIGNALWIRE_API_TOKEN || process.env.TWILIO_AUTH_TOKEN || '';
const SIGNALWIRE_SPACE_URL = process.env.SIGNALWIRE_SPACE_URL || '';
const SIGNALWIRE_PHONE_NUMBER = process.env.SIGNALWIRE_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER || '';

let signalwireClient: RestClient | null = null;

if (SIGNALWIRE_PROJECT_ID && SIGNALWIRE_API_TOKEN && SIGNALWIRE_SPACE_URL) {
  signalwireClient = new RestClient(
    SIGNALWIRE_PROJECT_ID,
    SIGNALWIRE_API_TOKEN,
    { signalwireSpaceUrl: SIGNALWIRE_SPACE_URL }
  );
}

export interface SendSMSOptions {
  to: string;
  message: string;
  from?: string;
  statusCallback?: string;
}

/**
 * Send SMS via SignalWire
 */
export async function sendSMS(options: SendSMSOptions): Promise<NotificationResult> {
  if (!signalwireClient) {
    console.warn('⚠️ SignalWire not configured, skipping SMS send');
    return {
      success: false,
      error: 'SignalWire client not configured',
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

    const message = await signalwireClient.messages.create({
      body: options.message,
      from: options.from || SIGNALWIRE_PHONE_NUMBER,
      to: options.to,
      statusCallback: options.statusCallback,
    });

    console.log(`✅ SMS sent via SignalWire to ${options.to} - SID: ${message.sid}`);

    return {
      success: true,
      message_id: message.sid,
      sent_at: new Date().toISOString(),
      channel: 'sms',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ SignalWire SMS failed:', errorMessage);

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
  if (!signalwireClient) {
    throw new Error('SignalWire client not configured');
  }

  try {
    const message = await signalwireClient.messages(messageSid).fetch();

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
 * Verify SignalWire configuration
 */
export function isConfigured(): boolean {
  return !!SIGNALWIRE_PROJECT_ID && !!SIGNALWIRE_API_TOKEN && !!SIGNALWIRE_SPACE_URL && !!SIGNALWIRE_PHONE_NUMBER;
}

/**
 * Test SignalWire connection
 */
export async function testConnection(): Promise<boolean> {
  if (!signalwireClient) {
    console.error('❌ SignalWire client not configured');
    return false;
  }

  try {
    // Fetch account details to verify connection
    const account = await signalwireClient.api.accounts(SIGNALWIRE_PROJECT_ID).fetch();

    console.log(`✅ SignalWire connection test successful - Account: ${account.friendlyName || 'N/A'}`);
    return true;
  } catch (error) {
    console.error('❌ SignalWire connection test failed:', error);
    return false;
  }
}
