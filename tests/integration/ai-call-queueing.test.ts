/**
 * Integration Tests - AI Call Queueing
 *
 * Tests the BullMQ job queueing system for AI calls:
 * 1. Job creation and queueing
 * 2. Job priority and scheduling
 * 3. Job retry logic
 * 4. Queue health and monitoring
 * 5. Integration with tRPC endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createTestClient, SupabaseTestClient } from '../helpers/supabase-test-client';
import { createTestLead, createTestBusiness, createTestCall } from '../helpers/test-data-factory';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Queue configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CALL_QUEUE_NAME = 'ai-calls';

describe('AI Call Queueing Integration Tests', () => {
  let testClient: SupabaseTestClient;
  let supabase: any;
  let callQueue: Queue | null = null;
  let redis: IORedis | null = null;

  beforeAll(async () => {
    testClient = createTestClient();
    supabase = testClient.getClient();

    // Try to connect to Redis/BullMQ (skip tests if not available)
    try {
      redis = new IORedis(REDIS_URL, {
        maxRetriesPerRequest: null,
      });

      callQueue = new Queue(CALL_QUEUE_NAME, {
        connection: redis,
      });

      // Test connection
      await redis.ping();
    } catch (error) {
      console.warn('Redis not available - skipping queue tests. Start Redis with: docker run -p 6379:6379 redis');
      callQueue = null;
      redis = null;
    }
  });

  afterAll(async () => {
    await testClient.cleanup();

    if (callQueue) {
      await callQueue.close();
    }

    if (redis) {
      await redis.quit();
    }
  });

  beforeEach(async () => {
    // Clean queue before each test
    if (callQueue) {
      await callQueue.drain();
      await callQueue.clean(0, 100, 'completed');
      await callQueue.clean(0, 100, 'failed');
    }
  });

  const skipIfNoRedis = () => {
    if (!callQueue || !redis) {
      console.warn('Skipping test - Redis not available');
      return true;
    }
    return false;
  };

  describe('Call Job Creation', () => {
    it('should create and queue a call job', async () => {
      if (skipIfNoRedis()) return;

      // Create test data
      const leadData = createTestLead();
      const leadId = await testClient.createTestLead(leadData);

      const businessData = createTestBusiness();
      const businessId = await testClient.createTestBusiness(businessData);

      // Create call record
      const callData = createTestCall({
        lead_id: leadId,
        business_id: businessId,
        call_type: 'qualify_lead',
        objective: 'Qualify lead for plumbing service',
        status: 'queued',
      });

      const callId = await testClient.createTestCall(callData);

      // Queue the call job
      const job = await callQueue!.add('initiate-call', {
        call_id: callId,
        lead_id: leadId,
        business_id: businessId,
        phone_number: callData.phone_number,
        call_type: callData.call_type,
        objective: callData.objective,
        attempt_number: 1,
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.call_id).toBe(callId);

      // Verify job is in queue
      const jobs = await callQueue!.getJobs(['waiting', 'active']);
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs.some(j => j.data.call_id === callId)).toBe(true);
    });

    it('should queue call with proper metadata', async () => {
      if (skipIfNoRedis()) return;

      const callData = createTestCall({
        call_type: 'confirm_appointment',
        objective: 'Confirm appointment time with consumer',
      });

      const callId = await testClient.createTestCall(callData);

      const job = await callQueue!.add('initiate-call', {
        call_id: callId,
        lead_id: callData.lead_id,
        business_id: callData.business_id,
        phone_number: callData.phone_number,
        call_type: callData.call_type,
        objective: callData.objective,
        attempt_number: 1,
      });

      expect(job.data.call_type).toBe('confirm_appointment');
      expect(job.data.objective).toContain('appointment');
      expect(job.data.attempt_number).toBe(1);
    });
  });

  describe('Job Priority and Scheduling', () => {
    it('should prioritize emergency calls over normal calls', async () => {
      if (skipIfNoRedis()) return;

      // Create emergency call
      const emergencyCall = createTestCall({
        call_type: 'qualify_lead',
        objective: 'EMERGENCY: Burst pipe',
      });
      const emergencyCallId = await testClient.createTestCall(emergencyCall);

      // Create normal call
      const normalCall = createTestCall({
        call_type: 'follow_up',
        objective: 'Follow up on quote',
      });
      const normalCallId = await testClient.createTestCall(normalCall);

      // Queue normal call first
      await callQueue!.add('initiate-call', {
        call_id: normalCallId,
        lead_id: normalCall.lead_id,
        phone_number: normalCall.phone_number,
        call_type: normalCall.call_type,
        objective: normalCall.objective,
        attempt_number: 1,
      }, {
        priority: 5, // Normal priority
      });

      // Queue emergency call second (but higher priority)
      await callQueue!.add('initiate-call', {
        call_id: emergencyCallId,
        lead_id: emergencyCall.lead_id,
        phone_number: emergencyCall.phone_number,
        call_type: emergencyCall.call_type,
        objective: emergencyCall.objective,
        attempt_number: 1,
      }, {
        priority: 1, // High priority (lower number = higher priority)
      });

      // Emergency call should be processed first despite being added second
      const waitingJobs = await callQueue!.getJobs(['waiting']);
      expect(waitingJobs.length).toBe(2);

      // First job should be emergency (priority 1)
      expect(waitingJobs[0].data.call_id).toBe(emergencyCallId);
    });

    it('should schedule calls for future execution', async () => {
      if (skipIfNoRedis()) return;

      const callData = createTestCall({
        call_type: 'follow_up',
      });
      const callId = await testClient.createTestCall(callData);

      // Schedule call for 1 hour from now
      const scheduledTime = new Date(Date.now() + 3600000);

      const job = await callQueue!.add('initiate-call', {
        call_id: callId,
        lead_id: callData.lead_id,
        phone_number: callData.phone_number,
        call_type: callData.call_type,
        objective: callData.objective,
        scheduled_time: scheduledTime.toISOString(),
        attempt_number: 1,
      }, {
        delay: 3600000, // 1 hour delay in milliseconds
      });

      expect(job).toBeDefined();

      // Job should be in delayed queue, not waiting
      const waitingJobs = await callQueue!.getJobs(['waiting']);
      const delayedJobs = await callQueue!.getJobs(['delayed']);

      expect(waitingJobs.some(j => j.data.call_id === callId)).toBe(false);
      expect(delayedJobs.some(j => j.data.call_id === callId)).toBe(true);
    });
  });

  describe('Job Retry Logic', () => {
    it('should track retry attempts', async () => {
      if (skipIfNoRedis()) return;

      const callData = createTestCall({
        attempt_number: 2, // Second attempt
      });
      const callId = await testClient.createTestCall(callData);

      const job = await callQueue!.add('initiate-call', {
        call_id: callId,
        lead_id: callData.lead_id,
        phone_number: callData.phone_number,
        call_type: callData.call_type,
        objective: callData.objective,
        attempt_number: 2,
      });

      expect(job.data.attempt_number).toBe(2);
    });

    it('should configure retry settings for failed calls', async () => {
      if (skipIfNoRedis()) return;

      const callData = createTestCall();
      const callId = await testClient.createTestCall(callData);

      const job = await callQueue!.add('initiate-call', {
        call_id: callId,
        lead_id: callData.lead_id,
        phone_number: callData.phone_number,
        call_type: callData.call_type,
        objective: callData.objective,
        attempt_number: 1,
      }, {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 60000, // Start with 1 minute delay
        },
      });

      expect(job.opts.attempts).toBe(3);
      expect(job.opts.backoff).toBeDefined();
    });
  });

  describe('Queue Health Monitoring', () => {
    it('should report queue metrics', async () => {
      if (skipIfNoRedis()) return;

      // Add a few jobs
      const callData1 = createTestCall();
      const callId1 = await testClient.createTestCall(callData1);

      const callData2 = createTestCall();
      const callId2 = await testClient.createTestCall(callData2);

      await callQueue!.add('initiate-call', {
        call_id: callId1,
        lead_id: callData1.lead_id,
        phone_number: callData1.phone_number,
        call_type: callData1.call_type,
        objective: callData1.objective,
        attempt_number: 1,
      });

      await callQueue!.add('initiate-call', {
        call_id: callId2,
        lead_id: callData2.lead_id,
        phone_number: callData2.phone_number,
        call_type: callData2.call_type,
        objective: callData2.objective,
        attempt_number: 1,
      });

      // Check queue counts
      const waitingCount = await callQueue!.getWaitingCount();
      expect(waitingCount).toBeGreaterThanOrEqual(2);

      const jobCounts = await callQueue!.getJobCounts();
      expect(jobCounts.waiting).toBeGreaterThanOrEqual(2);
    });

    it('should list all jobs in queue', async () => {
      if (skipIfNoRedis()) return;

      const callData = createTestCall();
      const callId = await testClient.createTestCall(callData);

      await callQueue!.add('initiate-call', {
        call_id: callId,
        lead_id: callData.lead_id,
        phone_number: callData.phone_number,
        call_type: callData.call_type,
        objective: callData.objective,
        attempt_number: 1,
      });

      const jobs = await callQueue!.getJobs(['waiting', 'active', 'delayed']);
      expect(jobs.length).toBeGreaterThan(0);

      const ourJob = jobs.find(j => j.data.call_id === callId);
      expect(ourJob).toBeDefined();
    });
  });

  describe('Queue Cleanup', () => {
    it('should clean up completed jobs', async () => {
      if (skipIfNoRedis()) return;

      // Simulate completed job
      const callData = createTestCall();
      const callId = await testClient.createTestCall(callData);

      const job = await callQueue!.add('initiate-call', {
        call_id: callId,
        lead_id: callData.lead_id,
        phone_number: callData.phone_number,
        call_type: callData.call_type,
        objective: callData.objective,
        attempt_number: 1,
      });

      // Mark as completed (simulate worker completing it)
      await job.moveToCompleted('success', true);

      // Clean completed jobs older than 0 milliseconds (all of them)
      const cleanedCount = await callQueue!.clean(0, 100, 'completed');

      expect(cleanedCount.length).toBeGreaterThan(0);
    });

    it('should clean up failed jobs after retention period', async () => {
      if (skipIfNoRedis()) return;

      const callData = createTestCall();
      const callId = await testClient.createTestCall(callData);

      const job = await callQueue!.add('initiate-call', {
        call_id: callId,
        lead_id: callData.lead_id,
        phone_number: callData.phone_number,
        call_type: callData.call_type,
        objective: callData.objective,
        attempt_number: 1,
      });

      // Simulate failure
      await job.moveToFailed(new Error('Test failure'), true);

      // Clean failed jobs
      const cleanedCount = await callQueue!.clean(0, 100, 'failed');

      expect(cleanedCount.length).toBeGreaterThan(0);
    });
  });

  describe('tRPC Integration', () => {
    it.skip('should queue call via business.requestAICall endpoint', async () => {
      // SKIPPED: Requires full tRPC context setup
      // This tests the integration between tRPC and BullMQ

      // TODO: Test business.requestAICall mutation
      // - Should create call record in database
      // - Should queue job in BullMQ
      // - Should return job ID
    });

    it.skip('should queue call via lead.requestCallback endpoint', async () => {
      // SKIPPED: Requires full tRPC context setup

      // TODO: Test lead.requestCallback mutation
      // - Should create call record
      // - Should queue job with correct call_type
      // - Should set proper priority
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid phone numbers gracefully', async () => {
      if (skipIfNoRedis()) return;

      const callData = createTestCall({
        phone_number: 'invalid-phone',
      });

      // Should still queue the job (validation happens in worker)
      const callId = await testClient.createTestCall(callData);

      const job = await callQueue!.add('initiate-call', {
        call_id: callId,
        lead_id: callData.lead_id,
        phone_number: callData.phone_number,
        call_type: callData.call_type,
        objective: callData.objective,
        attempt_number: 1,
      });

      expect(job).toBeDefined();
      // Worker will handle validation and mark job as failed
    });

    it('should handle missing lead details', async () => {
      if (skipIfNoRedis()) return;

      const callData = createTestCall({
        lead_id: 'nonexistent-lead-id',
      });

      const callId = await testClient.createTestCall(callData);

      const job = await callQueue!.add('initiate-call', {
        call_id: callId,
        lead_id: callData.lead_id,
        phone_number: callData.phone_number,
        call_type: callData.call_type,
        objective: callData.objective,
        attempt_number: 1,
      });

      expect(job).toBeDefined();
      // Worker will fail when it can't find lead
    });
  });

  describe('Job Data Validation', () => {
    it('should require essential job fields', async () => {
      if (skipIfNoRedis()) return;

      // Valid job should succeed
      const validJob = await callQueue!.add('initiate-call', {
        call_id: 'test-call-id',
        lead_id: 'test-lead-id',
        phone_number: '+15551234567',
        call_type: 'qualify_lead',
        objective: 'Test objective',
        attempt_number: 1,
      });

      expect(validJob).toBeDefined();

      // Missing fields should still queue (validation in worker)
      const incompleteJob = await callQueue!.add('initiate-call', {
        call_id: 'test-call-2',
        // Missing other fields
      });

      expect(incompleteJob).toBeDefined();
    });
  });
});

/**
 * SETUP INSTRUCTIONS FOR RUNNING THESE TESTS:
 *
 * 1. Start Redis locally:
 *    docker run -d -p 6379:6379 redis
 *
 * 2. Or use Upstash Redis:
 *    Set REDIS_URL environment variable to your Upstash connection string
 *
 * 3. Run tests:
 *    npm run test:integration -- ai-call-queueing.test.ts
 *
 * 4. Monitor queue in development:
 *    Install Bull Board for queue visualization
 */
