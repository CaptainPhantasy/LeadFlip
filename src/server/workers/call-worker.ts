/**
 * Call Session Worker
 *
 * Processes call initiation jobs from BullMQ queue
 *
 * Responsibilities:
 * 1. Consume job from queue
 * 2. Fetch call details from database
 * 3. Initiate SignalWire call with Media Streams
 * 4. Monitor call status
 * 5. Handle retries on failure
 */

import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { RestClient } from '@signalwire/compatibility-api';
import Redis from 'ioredis';
import { InitiateCallJob } from '../queue/config';

const REDIS_URL = process.env.REDIS_URL!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SIGNALWIRE_PROJECT_ID = process.env.SIGNALWIRE_PROJECT_ID || process.env.TWILIO_ACCOUNT_SID!;
const SIGNALWIRE_API_TOKEN = process.env.SIGNALWIRE_API_TOKEN || process.env.TWILIO_AUTH_TOKEN!;
const SIGNALWIRE_SPACE_URL = process.env.SIGNALWIRE_SPACE_URL!;
const SIGNALWIRE_PHONE_NUMBER = process.env.SIGNALWIRE_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER!;
const WEBSOCKET_SERVER_URL = process.env.WEBSOCKET_SERVER_URL || 'ws://localhost:8080';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const signalwireClient = new RestClient(
  SIGNALWIRE_PROJECT_ID,
  SIGNALWIRE_API_TOKEN,
  { signalwireSpaceUrl: SIGNALWIRE_SPACE_URL }
);

const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/**
 * Process call initiation job
 */
async function processCallJob(job: Job<InitiateCallJob>) {
  const {
    call_id,
    lead_id,
    phone_number,
    call_type,
    objective,
    system_prompt,
    attempt_number,
  } = job.data;

  console.log(`📞 Processing call job: ${call_id} (attempt ${attempt_number})`);

  try {
    // 1. Update call status to 'initiating'
    await supabase
      .from('calls')
      .update({
        status: 'initiating',
        attempt_number,
      })
      .eq('id', call_id);

    // 2. Generate TwiML with Media Streams
    const twimlUrl = await generateTwiML(call_id, system_prompt);

    // 3. Initiate SignalWire call
    const call = await signalwireClient.calls.create({
      from: SIGNALWIRE_PHONE_NUMBER,
      to: phone_number,
      url: twimlUrl,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      timeout: 30, // Ring timeout in seconds
    });

    console.log(`✅ Call initiated: ${call.sid}`);

    // 4. Update call record with Twilio SID
    await supabase
      .from('calls')
      .update({
        twilio_call_sid: call.sid,
        status: 'in_progress',
      })
      .eq('id', call_id);

    return {
      success: true,
      callSid: call.sid,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Call initiation failed: ${errorMessage}`);

    // Update call status to error
    await supabase
      .from('calls')
      .update({
        status: 'error',
        error_message: errorMessage,
      })
      .eq('id', call_id);

    throw error; // Will trigger retry via BullMQ
  }
}

/**
 * Generate TwiML URL for Twilio call
 * Returns a URL that serves TwiML with Media Streams configuration
 */
async function generateTwiML(callId: string, systemPrompt: string): Promise<string> {
  // In production, this would be a proper TwiML endpoint
  // For now, we'll use Twilio's <Stream> verb with our WebSocket server

  const twimlUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twiml/call/${callId}`;

  // Store system prompt in temporary cache for TwiML endpoint to access
  await redisConnection.set(
    `twiml:${callId}`,
    JSON.stringify({ systemPrompt }),
    'EX',
    300 // Expire after 5 minutes
  );

  return twimlUrl;
}

/**
 * Create Call Worker
 */
const callWorker = new Worker<InitiateCallJob>(
  'calls',
  processCallJob,
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 calls simultaneously
    limiter: {
      max: 10, // Max 10 calls
      duration: 60000, // Per 60 seconds
    },
  }
);

/**
 * Worker event handlers
 */
callWorker.on('completed', (job) => {
  console.log(`✅ Call job completed: ${job.id}`);
});

callWorker.on('failed', (job, err) => {
  console.error(`❌ Call job failed: ${job?.id}`, err.message);

  // If max attempts reached, mark as permanently failed
  if (job && job.attemptsMade >= 3) {
    console.log(`🚫 Max attempts reached for call: ${job.id}`);
    supabase
      .from('calls')
      .update({
        status: 'failed',
        error_message: `Failed after ${job.attemptsMade} attempts: ${err.message}`,
      })
      .eq('id', job.data.call_id);
  }
});

callWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down worker...');
  await callWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down worker...');
  await callWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

console.log('🚀 Call worker started');

export default callWorker;
