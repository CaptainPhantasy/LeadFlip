/**
 * Test AI Calling Integration
 *
 * This script tests the complete AI calling integration:
 * 1. TwiML endpoint generates valid XML
 * 2. Queue configuration is correct
 * 3. Call queueing works
 */

import { generateCallTwiML, validateTwiML } from '@/lib/twilio/twiml-generator';
import { queueCall, callQueue } from '@/server/queue/config';

async function testTwiMLGeneration() {
  console.log('\n🔍 Testing TwiML Generation...');

  const twiml = generateCallTwiML({
    callId: 'test-call-123',
    websocketUrl: 'wss://test-websocket.com',
    voice: 'Polly.Joanna',
    greeting: 'Hello, this is a test call.',
  });

  console.log('\n📄 Generated TwiML:');
  console.log(twiml);

  const isValid = validateTwiML(twiml);
  console.log(`\n✅ TwiML is ${isValid ? 'VALID' : 'INVALID'}`);

  return isValid;
}

async function testQueueConfiguration() {
  console.log('\n🔍 Testing Queue Configuration...');

  try {
    // Check if Redis is connected
    const queueClient = await callQueue.client;
    const pingResponse = await queueClient.ping();
    console.log(`✅ Redis connection: ${pingResponse === 'PONG' ? 'OK' : 'FAILED'}`);

    // Get queue stats
    const stats = await callQueue.getJobCounts();
    console.log('\n📊 Queue Statistics:');
    console.log(`  - Waiting: ${stats.waiting}`);
    console.log(`  - Active: ${stats.active}`);
    console.log(`  - Completed: ${stats.completed}`);
    console.log(`  - Failed: ${stats.failed}`);

    return true;
  } catch (error) {
    console.error('❌ Queue configuration error:', error);
    return false;
  }
}

async function testCallQueueing() {
  console.log('\n🔍 Testing Call Queueing...');

  try {
    const testJob = {
      call_id: `test-${Date.now()}`,
      lead_id: '00000000-0000-0000-0000-000000000001',
      business_id: '00000000-0000-0000-0000-000000000002',
      consumer_id: '00000000-0000-0000-0000-000000000003',
      phone_number: '+15551234567',
      call_type: 'qualify_lead' as const,
      objective: 'Test call to verify queue integration',
      system_prompt: 'You are a test AI assistant.',
      attempt_number: 1,
    };

    console.log('\n📤 Queueing test job...');
    const jobId = await queueCall(testJob);
    console.log(`✅ Job queued with ID: ${jobId}`);

    // Wait a moment for job to be added
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if job exists in queue
    const job = await callQueue.getJob(jobId);
    if (job) {
      console.log(`\n✅ Job found in queue:`);
      console.log(`  - ID: ${job.id}`);
      console.log(`  - Name: ${job.name}`);
      console.log(`  - State: ${await job.getState()}`);
      console.log(`  - Data:`, job.data);

      // Remove test job
      await job.remove();
      console.log(`\n🧹 Test job removed from queue`);
    } else {
      console.error('❌ Job not found in queue');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Call queueing error:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 AI Calling Integration Test Suite\n');
  console.log('=' .repeat(50));

  const results = {
    twiml: false,
    queue: false,
    queueing: false,
  };

  // Test 1: TwiML Generation
  results.twiml = await testTwiMLGeneration();

  // Test 2: Queue Configuration
  results.queue = await testQueueConfiguration();

  // Test 3: Call Queueing
  results.queueing = await testCallQueueing();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Results Summary:');
  console.log(`  - TwiML Generation: ${results.twiml ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - Queue Configuration: ${results.queue ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - Call Queueing: ${results.queueing ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every((r) => r);
  console.log(`\n${allPassed ? '✅ All tests PASSED!' : '❌ Some tests FAILED'}`);

  // Close queue connection
  await callQueue.close();

  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error('\n❌ Test suite error:', error);
  process.exit(1);
});
