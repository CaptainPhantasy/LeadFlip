# Track 3: AI Calling Integration - Verification Checklist

Use this checklist to verify that Track 3 implementation is working correctly.

---

## Pre-Verification Requirements

### ✅ Prerequisites Met
- [ ] Track 2 database migration executed in Supabase
- [ ] Redis (Upstash) is accessible
- [ ] All environment variables set in `.env.local`
- [ ] Dev server can start (`npm run dev`)

### Environment Variables Required
```bash
# Check these are set:
REDIS_URL=redis://...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

**Verify**:
```bash
# Check Redis connection
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

---

## Verification Tests

### Test 1: TwiML Endpoint ✅

**What it tests**: TwiML endpoint generates valid XML for Twilio

**Steps**:
1. Start dev server: `npm run dev`
2. Open terminal and run:
   ```bash
   curl http://localhost:3000/api/twiml/call/test-123
   ```

**Expected Result**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="wss://leadflip-websocket.railway.app">
      <Parameter name="callId" value="test-123" />
    </Stream>
  </Start>
  <Say voice="Polly.Joanna">
    Connecting you now, please hold.
  </Say>
  <Pause length="60"/>
</Response>
```

**Pass Criteria**:
- [ ] HTTP 200 response
- [ ] Valid XML structure
- [ ] Contains `<Stream>` element
- [ ] Contains `callId` parameter
- [ ] Content-Type is `text/xml`

---

### Test 2: Integration Test Script ✅

**What it tests**: TwiML generation, Redis connection, job queueing

**Steps**:
```bash
npx ts-node scripts/test-ai-calling-integration.ts
```

**Expected Output**:
```
🚀 AI Calling Integration Test Suite
==================================================

🔍 Testing TwiML Generation...
✅ TwiML is VALID

🔍 Testing Queue Configuration...
✅ Redis connection: OK

📊 Queue Statistics:
  - Waiting: 0
  - Active: 0
  - Completed: X
  - Failed: X

🔍 Testing Call Queueing...
✅ Job queued with ID: test-XXXXX
✅ Job found in queue
🧹 Test job removed from queue

==================================================
📊 Test Results Summary:
  - TwiML Generation: ✅ PASS
  - Queue Configuration: ✅ PASS
  - Call Queueing: ✅ PASS

✅ All tests PASSED!
```

**Pass Criteria**:
- [ ] All 3 tests pass
- [ ] No errors in output
- [ ] Test job is created and removed
- [ ] Exit code is 0

---

### Test 3: business.requestAICall ✅

**What it tests**: Business can request AI call, job is queued

**Setup** (Run in Supabase SQL Editor):
```sql
-- Create test business
INSERT INTO businesses (id, user_id, name, phone_number, service_categories, location, city, state, zip_code)
VALUES
  ('test-business-123', 'business-user-123', 'Test Plumbing', '+15551111111',
   ARRAY['plumbing'], ST_SetSRID(ST_Point(-86.158, 39.768), 4326), 'Indianapolis', 'IN', '46204')
ON CONFLICT (id) DO NOTHING;

-- Create test lead
INSERT INTO leads (id, user_id, problem_text, service_category, urgency, contact_phone, location_zip)
VALUES
  ('test-lead-123', 'consumer-user-123', 'Water heater broken', 'plumbing', 'urgent',
   '+15552222222', '46204')
ON CONFLICT (id) DO NOTHING;

-- Create test match
INSERT INTO matches (lead_id, business_id, status, confidence_score)
VALUES
  ('test-lead-123', 'test-business-123', 'interested', 8.5)
ON CONFLICT (lead_id, business_id) DO NOTHING;
```

**Test** (Via tRPC or API):
```typescript
// Authenticate as business user (user_id = 'business-user-123')
const result = await trpc.business.requestAICall.mutate({
  leadId: 'test-lead-123',
  objective: 'Call consumer to schedule water heater repair appointment',
});

console.log(result);
```

**Expected Result**:
```json
{
  "success": true,
  "call_id": "uuid-here",
  "message": "AI call queued for immediate processing",
  "queued_at": "2025-10-01T12:00:00.000Z"
}
```

**Verify in Redis**:
```bash
redis-cli -u $REDIS_URL
KEYS bull:calls:*
HGETALL bull:calls:uuid-here
```

**Pass Criteria**:
- [ ] API returns success
- [ ] `call_id` is a valid UUID
- [ ] `queued_at` is ISO 8601 timestamp
- [ ] Job exists in Redis
- [ ] Job data includes all required fields
- [ ] Call record exists in database:
  ```sql
  SELECT * FROM calls WHERE id = 'uuid-here';
  ```

---

### Test 4: lead.requestCallback ✅

**What it tests**: Consumer can request callback, job is queued

**Setup** (Using test data from Test 3)

**Test** (Via tRPC or API):
```typescript
// Authenticate as consumer user (user_id = 'consumer-user-123')
const result = await trpc.lead.requestCallback.mutate({
  leadId: 'test-lead-123',
  businessId: 'test-business-123',
  preferredTime: '2025-10-01T15:00:00Z', // Optional
});

console.log(result);
```

**Expected Result**:
```json
{
  "success": true,
  "call_id": "uuid-here",
  "message": "Callback scheduled for 2025-10-01T15:00:00Z",
  "queued_at": "2025-10-01T12:00:00.000Z"
}
```

**Verify Scheduled Job**:
```bash
redis-cli -u $REDIS_URL
HGETALL bull:calls:uuid-here
# Should show delay field with milliseconds until preferredTime
```

**Pass Criteria**:
- [ ] API returns success
- [ ] `call_id` is a valid UUID
- [ ] Message mentions scheduled time
- [ ] Job exists in Redis with delay
- [ ] Call record in database has `scheduled_time` set

---

### Test 5: Error Handling ✅

**What it tests**: API handles errors gracefully

**Test 5a: Unauthorized Access**
```typescript
// Attempt to request call for lead you don't have access to
const result = await trpc.business.requestAICall.mutate({
  leadId: 'non-existent-lead',
  objective: 'Test',
});
// Should throw: "Lead not found or not matched to your business"
```

**Test 5b: Match Not Accepted**
```sql
-- Set match status to 'pending'
UPDATE matches
SET status = 'pending'
WHERE lead_id = 'test-lead-123' AND business_id = 'test-business-123';
```

```typescript
const result = await trpc.business.requestAICall.mutate({
  leadId: 'test-lead-123',
  objective: 'Test',
});
// Should throw: "You must accept this lead before requesting a call"
```

**Test 5c: Missing Phone Number**
```sql
-- Remove consumer phone
UPDATE leads SET contact_phone = NULL WHERE id = 'test-lead-123';
```

```typescript
const result = await trpc.business.requestAICall.mutate({
  leadId: 'test-lead-123',
  objective: 'Test',
});
// Should throw: "Consumer phone number not available"
```

**Pass Criteria**:
- [ ] All error cases return appropriate error messages
- [ ] No jobs are queued on errors
- [ ] No call records created on errors
- [ ] Errors are clear and actionable

---

### Test 6: Database Records ✅

**What it tests**: Call records are properly created

**Verify**:
```sql
-- Check call records exist
SELECT * FROM calls
WHERE lead_id = 'test-lead-123'
ORDER BY created_at DESC;
```

**Expected Fields**:
- `id` - UUID
- `lead_id` - 'test-lead-123'
- `business_id` - 'test-business-123' or NULL
- `consumer_id` - 'consumer-user-123'
- `call_type` - 'qualify_lead' or 'consumer_callback'
- `objective` - Text description
- `status` - 'queued'
- `system_prompt` - Long text (generated by CallAgent)
- `scheduled_time` - NULL or future timestamp
- `created_at` - Recent timestamp

**Pass Criteria**:
- [ ] All fields populated correctly
- [ ] `system_prompt` is not empty
- [ ] `status` is 'queued'
- [ ] Timestamps are correct

---

### Test 7: Twilio Webhook ✅

**What it tests**: Webhook can receive and process Twilio status updates

**Test** (Using curl to simulate Twilio):
```bash
curl -X POST http://localhost:3000/api/webhooks/twilio/status \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=CA1234567890abcdef" \
  -d "CallStatus=completed" \
  -d "CallDuration=180"
```

**Expected Response**:
```json
{"success": true}
```

**Verify Database Update**:
```sql
SELECT * FROM calls WHERE twilio_call_sid = 'CA1234567890abcdef';
```

**Pass Criteria**:
- [ ] Webhook returns 200
- [ ] Database is updated with status
- [ ] Duration is recorded
- [ ] Twilio status is mapped correctly

---

### Test 8: TwiML Generator Utility ✅

**What it tests**: TwiML generator utility functions work

**Test**:
```typescript
import { generateCallTwiML, validateTwiML } from '@/lib/twilio/twiml-generator';

const twiml = generateCallTwiML({
  callId: 'test-123',
  websocketUrl: 'wss://test.com',
  voice: 'Polly.Joanna',
  greeting: 'Test message',
});

console.log(twiml);
console.log('Valid:', validateTwiML(twiml));
```

**Expected Output**:
- Valid XML structure
- Contains all parameters
- Validation returns `true`

**Pass Criteria**:
- [ ] TwiML is generated
- [ ] Validation passes
- [ ] All parameters present

---

## Cleanup Test Data

After all tests pass, clean up:

```sql
-- Delete test calls
DELETE FROM calls WHERE lead_id = 'test-lead-123';

-- Delete test match
DELETE FROM matches WHERE lead_id = 'test-lead-123';

-- Delete test lead
DELETE FROM leads WHERE id = 'test-lead-123';

-- Delete test business
DELETE FROM businesses WHERE id = 'test-business-123';
```

```bash
# Clear test jobs from Redis
redis-cli -u $REDIS_URL
KEYS bull:calls:test-*
# For each key:
DEL bull:calls:test-XXXXX
```

---

## Final Verification Checklist

### Code Quality ✅
- [ ] No TypeScript errors: `npm run build`
- [ ] No linting errors: `npm run lint`
- [ ] All imports resolve
- [ ] No console.errors in test runs

### Functionality ✅
- [ ] TwiML endpoint accessible
- [ ] Integration tests pass
- [ ] business.requestAICall queues jobs
- [ ] lead.requestCallback queues jobs
- [ ] Database records created
- [ ] Redis jobs visible
- [ ] Error handling works

### Documentation ✅
- [ ] TRACK_3_COMPLETION_REPORT.md reviewed
- [ ] QUICK_TEST_GUIDE.md reviewed
- [ ] INTEGRATION_POINTS.md updated
- [ ] PROGRESS_TRACKER.md updated

### Security ✅
- [ ] Authentication required for all endpoints
- [ ] Authorization checks in place
- [ ] Phone numbers validated
- [ ] Resource ownership verified
- [ ] No PII in logs

### Performance ✅
- [ ] API responses < 1 second
- [ ] Redis operations < 100ms
- [ ] Database queries optimized
- [ ] No N+1 query problems

---

## Sign-Off

### Track 3 Implementation
- [ ] All code written and tested
- [ ] All tests passing
- [ ] All documentation complete
- [ ] No blockers remaining

### Ready for Next Steps
- [ ] Ready for Track 4 testing
- [ ] Ready for Track 5 deployment
- [ ] Ready for production use (after deployment)

---

## Troubleshooting

### Issue: Integration test fails on Redis connection

**Solution**:
```bash
# Verify REDIS_URL is set
echo $REDIS_URL

# Test connection
redis-cli -u $REDIS_URL ping

# If fails, check Upstash dashboard for correct URL
```

---

### Issue: Job appears in Redis but no call record in database

**Solution**:
```bash
# Check database migration has run
SELECT * FROM calls LIMIT 1;

# If table doesn't exist, run Track 2 migration
```

---

### Issue: "Business profile not found"

**Solution**:
```sql
-- Check if business exists
SELECT * FROM businesses WHERE user_id = 'your-user-id';

-- If not, create via business.register mutation
```

---

### Issue: "You must accept this lead before requesting a call"

**Solution**:
```sql
-- Update match status
UPDATE matches
SET status = 'interested'
WHERE lead_id = 'lead-id' AND business_id = 'business-id';
```

---

## Status

**Track 3 Verification**: ⏳ PENDING USER TESTING

**Next Action**: User runs through this checklist and verifies all tests pass.

---

**Document Version**: 1.0
**Last Updated**: October 1, 2025
**Agent**: calling-agent
