/**
 * SignalWire Status Callback Webhook
 *
 * Receives call status updates from SignalWire
 * Note: SignalWire uses Twilio-compatible webhooks, so the format is identical
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for webhooks

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const duration = formData.get('CallDuration') as string;

    console.log(`📞 SignalWire status update: ${callSid} -> ${callStatus}`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Map SignalWire status to our internal status
    let internalStatus = callStatus;
    switch (callStatus) {
      case 'initiated':
        internalStatus = 'initiating';
        break;
      case 'ringing':
        internalStatus = 'ringing';
        break;
      case 'in-progress':
        internalStatus = 'in_progress';
        break;
      case 'completed':
        internalStatus = 'completed';
        break;
      case 'busy':
      case 'no-answer':
        internalStatus = 'no_answer';
        break;
      case 'failed':
      case 'canceled':
        internalStatus = 'error';
        break;
    }

    // Update call record
    const updateData: any = {
      status: internalStatus,
      twilio_status: callStatus,
    };

    if (duration) {
      updateData.duration_seconds = parseInt(duration);
    }

    await supabase.from('calls').update(updateData).eq('twilio_call_sid', callSid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
