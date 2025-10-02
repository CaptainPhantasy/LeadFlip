/**
 * WebSocket Server - SignalWire ↔ OpenAI Realtime API Bridge
 *
 * CRITICAL: This server MUST run on persistent infrastructure (Railway/Fly.io)
 * NOT on serverless platforms like Vercel
 *
 * Purpose:
 * 1. Receive audio from SignalWire Media Streams (WebSocket)
 * 2. Forward to OpenAI Realtime API (WebSocket)
 * 3. Stream OpenAI responses back to SignalWire
 * 4. Handle reasoning requests via Claude API
 *
 * Note: SignalWire uses Twilio-compatible Media Streams, so the protocol is identical
 */

import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { CallAgentSubagent } from '@/lib/agents/call-agent';
import { createClient } from '@supabase/supabase-js';

const PORT = process.env.WEBSOCKET_PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create HTTP server
const server = createServer();

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Active call sessions
const activeSessions = new Map<string, CallSession>();

interface CallSession {
  callSid: string;
  streamSid: string;
  signalwireWs: WebSocket; // SignalWire WebSocket (Twilio-compatible)
  openaiWs?: WebSocket;
  callAgent: CallAgentSubagent;
  systemPrompt: string;
  callStartTime: number;
  transcript: Array<{ role: 'assistant' | 'user'; content: string }>;
  audioBuffer: Buffer[];
  isVoicemail: boolean;
}

/**
 * Handle new SignalWire WebSocket connection
 */
wss.on('connection', (signalwireWs: WebSocket) => {
  console.log('📞 New SignalWire connection established');

  let session: CallSession | null = null;

  signalwireWs.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message);

      switch (data.event) {
        case 'start':
          await handleCallStart(signalwireWs, data, (newSession) => {
            session = newSession;
          });
          break;

        case 'media':
          if (session) {
            await handleMediaPacket(session, data);
          }
          break;

        case 'stop':
          if (session) {
            await handleCallEnd(session);
          }
          break;

        default:
          console.log('Unknown event:', data.event);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  signalwireWs.on('close', () => {
    console.log('📞 SignalWire connection closed');
    if (session) {
      handleCallEnd(session);
    }
  });

  signalwireWs.on('error', (error) => {
    console.error('SignalWire WebSocket error:', error);
  });
});

/**
 * Handle call start - initialize OpenAI connection
 */
async function handleCallStart(
  signalwireWs: WebSocket,
  data: any,
  setSession: (session: CallSession) => void
) {
  const { callSid, streamSid } = data.start;
  console.log(`📞 Call started: ${callSid}`);

  // Get call context from database
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: callData, error } = await supabase
    .from('calls')
    .select('*, leads(*), businesses(*)')
    .eq('twilio_call_sid', callSid)
    .single();

  if (error || !callData) {
    console.error('Failed to fetch call context:', error);
    signalwireWs.close();
    return;
  }

  // Initialize Call Agent
  const callAgent = new CallAgentSubagent(ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_KEY);

  // Create session
  const session: CallSession = {
    callSid,
    streamSid,
    signalwireWs,
    callAgent,
    systemPrompt: callData.system_prompt || '',
    callStartTime: Date.now(),
    transcript: [],
    audioBuffer: [],
    isVoicemail: false,
  };

  // Connect to OpenAI Realtime API
  session.openaiWs = new WebSocket('wss://api.openai.com/v1/realtime', {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  session.openaiWs.on('open', () => {
    console.log('🤖 Connected to OpenAI Realtime API');

    // Send session configuration
    session.openaiWs!.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: session.systemPrompt,
          voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
          input_audio_format: 'g711_ulaw', // Twilio format
          output_audio_format: 'g711_ulaw',
          turn_detection: {
            type: 'server_vad', // Voice Activity Detection
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          temperature: 0.8,
        },
      })
    );
  });

  session.openaiWs.on('message', async (message: string) => {
    await handleOpenAIResponse(session, message);
  });

  session.openaiWs.on('error', (error) => {
    console.error('OpenAI WebSocket error:', error);
  });

  session.openaiWs.on('close', () => {
    console.log('🤖 OpenAI connection closed');
  });

  // Store session
  activeSessions.set(callSid, session);
  setSession(session);
}

/**
 * Handle audio packet from Twilio
 */
async function handleMediaPacket(session: CallSession, data: any) {
  if (!session.openaiWs) return;

  const { payload } = data.media;

  // Store audio for recording
  session.audioBuffer.push(Buffer.from(payload, 'base64'));

  // Forward to OpenAI
  session.openaiWs.send(
    JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: payload,
    })
  );
}

/**
 * Handle response from OpenAI
 */
async function handleOpenAIResponse(session: CallSession, message: string) {
  try {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'response.audio.delta':
        // Stream audio back to SignalWire
        session.signalwireWs.send(
          JSON.stringify({
            event: 'media',
            streamSid: session.streamSid,
            media: {
              payload: data.delta,
            },
          })
        );
        break;

      case 'response.audio_transcript.delta':
        // Accumulate AI transcript
        const lastEntry = session.transcript[session.transcript.length - 1];
        if (lastEntry && lastEntry.role === 'assistant') {
          lastEntry.content += data.delta;
        } else {
          session.transcript.push({
            role: 'assistant',
            content: data.delta,
          });
        }

        // Check for voicemail indicators
        if (session.callAgent.detectVoicemail(data.delta)) {
          session.isVoicemail = true;
          console.log('📞 Voicemail detected');
        }
        break;

      case 'input_audio_buffer.speech_started':
        console.log('🎤 User started speaking');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('🎤 User stopped speaking');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User transcript
        session.transcript.push({
          role: 'user',
          content: data.transcript,
        });
        console.log('User:', data.transcript);
        break;

      case 'response.done':
        console.log('✅ Response completed');

        // If voicemail detected, leave message and end call
        if (session.isVoicemail && session.transcript.length <= 2) {
          console.log('📞 Leaving voicemail message...');
          // OpenAI will deliver the voicemail script, then we end call
          setTimeout(() => {
            endCallGracefully(session);
          }, 5000);
        }
        break;

      case 'error':
        console.error('OpenAI error:', data.error);
        break;

      default:
        // Log other events for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('OpenAI event:', data.type);
        }
    }
  } catch (error) {
    console.error('Error handling OpenAI response:', error);
  }
}

/**
 * Handle call end
 */
async function handleCallEnd(session: CallSession) {
  console.log(`📞 Call ended: ${session.callSid}`);

  const duration = Math.floor((Date.now() - session.callStartTime) / 1000);

  // Close OpenAI connection
  if (session.openaiWs) {
    session.openaiWs.close();
  }

  // Generate transcript
  const transcript = session.transcript
    .map((entry) => `${entry.role === 'assistant' ? 'AI' : 'User'}: ${entry.content}`)
    .join('\n');

  console.log('📝 Transcript length:', transcript.length);

  // Generate call summary
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: callData } = await supabase
    .from('calls')
    .select('*, leads(*)')
    .eq('twilio_call_sid', session.callSid)
    .single();

  if (callData) {
    const outcome = await session.callAgent.generateCallSummary(
      {
        call_id: callData.id,
        lead_id: callData.lead_id,
        business_id: callData.business_id,
        consumer_id: callData.consumer_id,
        objective: callData.objective,
        call_type: callData.call_type,
        lead_details: {
          service_category: callData.leads.service_category,
          problem_text: callData.leads.problem_text,
          urgency: callData.leads.urgency,
          budget_max: callData.leads.budget_max,
          location_zip: callData.leads.location_zip,
        },
      },
      transcript
    );

    // Save call record
    await session.callAgent.saveCallRecord(callData.id, callData, outcome, duration);

    // Update lead status
    await session.callAgent.updateLeadStatus(callData.lead_id, outcome);

    console.log('✅ Call summary saved:', outcome.summary);
  }

  // Remove from active sessions
  activeSessions.delete(session.callSid);
}

/**
 * End call gracefully (e.g., after voicemail)
 */
function endCallGracefully(session: CallSession) {
  console.log('📞 Ending call gracefully...');

  // Send hangup signal to SignalWire
  session.signalwireWs.send(
    JSON.stringify({
      event: 'stop',
      streamSid: session.streamSid,
    })
  );

  // Close connections
  session.signalwireWs.close();
  if (session.openaiWs) {
    session.openaiWs.close();
  }
}

/**
 * Health check endpoint
 */
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        activeCalls: activeSessions.size,
        uptime: process.uptime(),
      })
    );
  } else {
    res.writeHead(404);
    res.end();
  }
});

/**
 * Start server
 */
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server listening on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');

  // Close all active sessions
  for (const session of activeSessions.values()) {
    await handleCallEnd(session);
  }

  // Close WebSocket server
  wss.close(() => {
    console.log('✅ WebSocket server closed');
  });

  // Close HTTP server
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down...');
  process.exit(0);
});
