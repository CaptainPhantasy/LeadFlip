/**
 * BullMQ Queue Configuration for Business Discovery System
 *
 * Manages job queues for discovery scans, invitations, and follow-ups
 */

import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';
import type { ServiceCategory } from '@/types/discovery';

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
 * Discovery Queue - Processes business discovery scans
 */
export const discoveryQueue = new Queue('discovery', defaultQueueOptions);

/**
 * Invitations Queue - Processes invitation emails and follow-ups
 */
export const invitationsQueue = new Queue('invitations', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 2, // Invitations only retry once
  },
});

/**
 * Job Payload Types
 */

/**
 * Discovery Scan Job - Searches for businesses in a specific area/category
 */
export interface DiscoveryScanJob {
  zipCode: string;
  serviceCategory: ServiceCategory;
  radius: number; // in miles
}

/**
 * Send Invitation Job - Sends initial invitation email to a prospect
 */
export interface SendInvitationJob {
  prospectiveBusinessId: string;
}

/**
 * Follow-Up Job - Sends follow-up email to a prospect
 */
export interface FollowUpJob {
  prospectiveBusinessId: string;
  followUpNumber: number; // 1, 2, or 3
}

/**
 * Helper function to queue a discovery scan
 */
export async function queueDiscoveryScan(job: DiscoveryScanJob) {
  const jobId = `discovery-${job.zipCode}-${job.serviceCategory}-${Date.now()}`;

  await discoveryQueue.add('discovery-scan', job, {
    jobId,
    priority: 2, // Medium priority
  });

  return jobId;
}

/**
 * Helper function to queue an invitation
 */
export async function queueInvitation(job: SendInvitationJob) {
  const jobId = `invitation-${job.prospectiveBusinessId}`;

  await invitationsQueue.add('send-invitation', job, {
    jobId,
    priority: 2, // Medium priority
  });

  return jobId;
}

/**
 * Helper function to queue a follow-up
 */
export async function queueFollowUp(job: FollowUpJob) {
  const jobId = `follow-up-${job.prospectiveBusinessId}-${job.followUpNumber}`;

  await invitationsQueue.add('follow-up', job, {
    jobId,
    priority: 3, // Lower priority than initial invitations
  });

  return jobId;
}

/**
 * Helper function to schedule follow-ups for a prospect
 * Schedules all 3 follow-ups at once (Day 3, 7, 14)
 */
export async function scheduleFollowUps(prospectiveBusinessId: string) {
  const followUpSchedule = [
    { day: 3, followUpNumber: 1 },
    { day: 7, followUpNumber: 2 },
    { day: 14, followUpNumber: 3 },
  ];

  const jobs = followUpSchedule.map(({ day, followUpNumber }) => {
    const delay = day * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const jobId = `follow-up-${prospectiveBusinessId}-${followUpNumber}`;

    return invitationsQueue.add(
      'follow-up',
      {
        prospectiveBusinessId,
        followUpNumber,
      },
      {
        jobId,
        delay,
        priority: 3,
      }
    );
  });

  await Promise.all(jobs);
}

/**
 * Get queue statistics
 */
export async function getDiscoveryQueueStats() {
  const [discoveryStats, invitationsStats] = await Promise.all([
    discoveryQueue.getJobCounts(),
    invitationsQueue.getJobCounts(),
  ]);

  return {
    discovery: discoveryStats,
    invitations: invitationsStats,
  };
}

/**
 * Graceful shutdown
 */
export async function closeDiscoveryQueues() {
  await Promise.all([
    discoveryQueue.close(),
    invitationsQueue.close(),
  ]);
}
