/**
 * Notification Types
 * Shared interfaces for notification system
 */

export type NotificationChannel = 'email' | 'sms' | 'slack';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'bounced';

export interface NotificationPayload {
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  message: string;
  call_to_action: string;
  lead_id: string;
  business_id: string;
  metadata?: {
    lead_quality_score?: number;
    urgency?: string;
    service_category?: string;
    consumer_name?: string;
    consumer_phone?: string;
  };
}

export interface NotificationResult {
  success: boolean;
  message_id?: string;
  error?: string;
  sent_at: string;
  channel: NotificationChannel;
}

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface SMSTemplate {
  message: string;
  includeLink?: boolean;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  slack_enabled?: boolean;
  email_address?: string;
  phone_number?: string;
  slack_channel?: string;
  notification_frequency?: 'instant' | 'hourly' | 'daily';
}
