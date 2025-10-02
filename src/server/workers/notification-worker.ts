/**
 * Notification Worker
 *
 * Processes notification jobs from BullMQ queue
 * Sends SMS, email, and Slack notifications to businesses
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { initializeMCPServers } from '../mcp-servers';
import { createClient } from '@supabase/supabase-js';
import { SendNotificationJob } from '../queue/config';

const REDIS_URL = process.env.REDIS_URL!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const mcpServers = initializeMCPServers();

/**
 * Process notification job
 */
async function processNotificationJob(job: Job<SendNotificationJob>) {
  const { notification_id, business_id, lead_id, channel, recipient, subject, message, call_to_action } = job.data;

  console.log(`📧 Sending ${channel} notification to ${recipient}...`);

  try {
    let result;

    switch (channel) {
      case 'sms':
        result = await sendSMS(recipient, message, call_to_action);
        break;

      case 'email':
        result = await sendEmail(recipient, subject, message, call_to_action);
        break;

      case 'slack':
        result = await sendSlack(recipient, subject, message, call_to_action);
        break;

      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }

    // Log notification in database
    await supabase.from('notifications').insert({
      id: notification_id,
      business_id,
      lead_id,
      channel,
      recipient,
      subject,
      message,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    console.log(`✅ ${channel} notification sent`);

    return {
      success: true,
      channel,
      messageId: ('messageId' in result ? result.messageId : null) || ('messageTs' in result ? result.messageTs : null),
    };
  } catch (error) {
    console.error(`❌ Notification failed: ${error.message}`);

    // Log failed notification
    await supabase.from('notifications').insert({
      id: notification_id,
      business_id,
      lead_id,
      channel,
      recipient,
      subject,
      message,
      status: 'failed',
      error_message: error.message,
    });

    throw error;
  }
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(to: string, message: string, cta: string) {
  const { sendSMS: sendSMSViaTwilio } = await import('../../lib/sms/twilio-client');

  const fullMessage = `${message}\n\n${cta}: ${process.env.NEXT_PUBLIC_APP_URL}/business/leads`;

  const result = await sendSMSViaTwilio({
    to,
    message: fullMessage,
  });

  return {
    success: result.success,
    messageId: result.message_id || 'sms-' + Date.now(),
    error: result.error,
  };
}

/**
 * Send email via SendGrid
 */
async function sendEmail(to: string, subject: string, message: string, cta: string) {
  const { sendEmail: sendEmailViaGrid } = await import('../../lib/email/sendgrid-client');

  // Create simple HTML email template
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .cta-button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
    .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${subject}</h2>
    </div>
    <div class="content">
      <p>${message.replace(/\n/g, '<br>')}</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/business/leads" class="cta-button">${cta}</a>
    </div>
    <div class="footer">
      <p>LeadFlip - Connecting businesses with customers</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textBody = `${subject}\n\n${message}\n\n${cta}: ${process.env.NEXT_PUBLIC_APP_URL}/business/leads`;

  const result = await sendEmailViaGrid({
    to,
    subject,
    htmlBody,
    textBody,
    replyTo: 'support@leadflip.com',
  });

  return {
    success: result.success,
    messageId: result.message_id || 'email-' + Date.now(),
    error: result.error,
  };
}

/**
 * Send Slack notification
 */
async function sendSlack(channel: string, title: string, message: string, cta: string) {
  if (!mcpServers.slack) {
    throw new Error('Slack integration not configured');
  }

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: title,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: cta,
          },
          url: `${process.env.NEXT_PUBLIC_APP_URL}/business/leads`,
          style: 'primary',
        },
      ],
    },
  ];

  return mcpServers.slack.postMessage(channel, message, blocks);
}

/**
 * Create Notification Worker
 */
const notificationWorker = new Worker<SendNotificationJob>('notifications', processNotificationJob, {
  connection: redisConnection,
  concurrency: 10, // Process up to 10 notifications simultaneously
  limiter: {
    max: 50, // Max 50 notifications
    duration: 60000, // Per 60 seconds
  },
});

/**
 * Worker event handlers
 */
notificationWorker.on('completed', (job) => {
  console.log(`✅ Notification job completed: ${job.id}`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`❌ Notification job failed: ${job?.id}`, err.message);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down worker...');
  await notificationWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

console.log('🚀 Notification worker started');

export default notificationWorker;
