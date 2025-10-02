/**
 * LaML/TwiML Generator Utility
 *
 * Helper functions to generate valid LaML/TwiML responses
 * Note: SignalWire uses TwiML-compatible LaML format
 */

export interface TwiMLConfig {
  callId: string;
  websocketUrl: string;
  voice?: 'Polly.Joanna' | 'Polly.Matthew' | 'alice' | 'man' | 'woman';
  greeting?: string;
}

/**
 * Generate LaML/TwiML for AI call with WebSocket streaming
 * Compatible with both SignalWire and Twilio
 */
export function generateCallTwiML(config: TwiMLConfig): string {
  const {
    callId,
    websocketUrl,
    voice = 'Polly.Joanna',
    greeting = 'Connecting you now, please hold.',
  } = config;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${websocketUrl}">
      <Parameter name="callId" value="${callId}" />
    </Stream>
  </Start>
  <Say voice="${voice}">
    ${greeting}
  </Say>
  <Pause length="60"/>
</Response>`;
}

/**
 * Generate LaML/TwiML for voicemail detection
 * Compatible with both SignalWire and Twilio
 */
export function generateVoicemailTwiML(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    ${message}
  </Say>
  <Record maxLength="120" playBeep="true" />
</Response>`;
}

/**
 * Generate LaML/TwiML for call hangup
 * Compatible with both SignalWire and Twilio
 */
export function generateHangupTwiML(message?: string): string {
  if (message) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    ${message}
  </Say>
  <Hangup />
</Response>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup />
</Response>`;
}

/**
 * Validate LaML/TwiML XML
 * Compatible with both SignalWire and Twilio
 */
export function validateTwiML(twiml: string): boolean {
  try {
    // Basic validation: check for required elements
    if (!twiml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
      return false;
    }
    if (!twiml.includes('<Response>')) {
      return false;
    }
    if (!twiml.includes('</Response>')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Example LaML/TwiML for testing
 * Compatible with both SignalWire and Twilio
 */
export const exampleTwiML = generateCallTwiML({
  callId: 'example-call-id-123',
  websocketUrl: 'wss://example-websocket-server.com',
  voice: 'Polly.Joanna',
  greeting: 'Hello! This is a test call from LeadFlip.',
});
