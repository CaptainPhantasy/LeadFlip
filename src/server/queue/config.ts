/**
 * BullMQ Queue Configuration
 *
 * Job queues for asynchronous call processing
 */

import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';

// Redis connection (Upstash)
const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Default queue options
const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 seconds base delay
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
      count: 5000,
    },
  },
};

/**
 * Call Queue - Processes AI call initiation jobs
 */
export const callQueue = new Queue('calls', defaultQueueOptions);

/**
 * Notification Queue - Processes business notification jobs
 */
export const notificationQueue = new Queue('notifications', defaultQueueOptions);

/**
 * Audit Queue - Processes weekly audit jobs
 */
export const auditQueue = new Queue('audits', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 1, // Audits don't retry
  },
});

/**
 * Job Types
 */
export interface InitiateCallJob {
  call_id: string;
  lead_id: string;
  business_id?: string;
  consumer_id?: string;
  phone_number: string;
  call_type: 'qualify_lead' | 'confirm_appointment' | 'follow_up' | 'consumer_callback';
  objective: string;
  system_prompt: string;
  scheduled_time?: string;
  attempt_number: number;
}

export interface SendNotificationJob {
  notification_id: string;
  business_id: string;
  lead_id: string;
  channel: 'sms' | 'email' | 'slack';
  recipient: string;
  subject: string;
  message: string;
  call_to_action: string;
}

export interface RunAuditJob {
  audit_type: 'weekly' | 'manual';
  days_back: number;
  requested_by?: string;
}

/**
 * Helper function to add call job
 */
export async function queueCall(job: InitiateCallJob) {
  const jobId = job.call_id;

  // If scheduled time provided, delay the job
  const delay = job.scheduled_time
    ? new Date(job.scheduled_time).getTime() - Date.now()
    : 0;

  await callQueue.add('initiate-call', job, {
    jobId,
    delay: Math.max(delay, 0),
    priority: job.call_type === 'confirm_appointment' ? 1 : 3, // Confirmations are high priority
  });

  return jobId;
}

/**
 * Helper function to add notification job
 */
export async function queueNotification(job: SendNotificationJob) {
  const jobId = job.notification_id;

  await notificationQueue.add('send-notification', job, {
    jobId,
    priority: 2, // Medium priority
  });

  return jobId;
}

/**
 * Helper function to add audit job
 */
export async function queueAudit(job: RunAuditJob) {
  const jobId = `audit-${Date.now()}`;

  await auditQueue.add('run-audit', job, {
    jobId,
    priority: 5, // Low priority (background task)
  });

  return jobId;
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [callStats, notificationStats, auditStats] = await Promise.all([
    callQueue.getJobCounts(),
    notificationQueue.getJobCounts(),
    auditQueue.getJobCounts(),
  ]);

  return {
    calls: callStats,
    notifications: notificationStats,
    audits: auditStats,
  };
}

/**
 * Graceful shutdown
 */
export async function closeQueues() {
  await Promise.all([
    callQueue.close(),
    notificationQueue.close(),
    auditQueue.close(),
    redisConnection.quit(),
  ]);
}
