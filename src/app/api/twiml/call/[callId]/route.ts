/**
 * LaML/TwiML Endpoint - Generates LaML for SignalWire calls
 *
 * This endpoint is called by SignalWire when initiating a call
 * Returns LaML/TwiML with <Stream> verb to connect to WebSocket server
 *
 * Note: SignalWire uses TwiML-compatible LaML, so the XML format is identical
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  const { callId } = await params;
  const websocketUrl = process.env.WEBSOCKET_SERVER_URL || 'wss://leadflip-websocket.railway.app';

  console.log(`📞 Generating LaML for call: ${callId}`);

  // Generate LaML/TwiML with Media Streams
  // The WebSocket URL will receive the audio stream from SignalWire
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${websocketUrl}">
      <Parameter name="callId" value="${callId}" />
    </Stream>
  </Start>
  <Say voice="Polly.Joanna">
    Connecting you now, please hold.
  </Say>
  <Pause length="60"/>
</Response>`;

  return new NextResponse(twiml, {
    headers: {
      'Content-Type': 'text/xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ callId: string }> }
) {
  return GET(request, context);
}
