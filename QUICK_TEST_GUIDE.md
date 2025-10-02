# Quick Test Guide - AI Calling Integration

This guide provides quick commands to test the AI calling integration completed in Track 3.

---

## Prerequisites

1. **Environment Variables Set**:
   ```bash
   # Check these are set in .env.local
   REDIS_URL=redis://...
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...
   NEXT_PUBLIC_SUPABASE_URL=https://...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

2. **Database Migration Run**:
   ```bash
   # Ensure Track 2 migration has been executed in Supabase
   # Migration file: supabase/migrations/20251001000001_fix_schema_mismatches.sql
   ```

3. **Redis Accessible**:
   ```bash
   # Test Redis connection
   redis-cli -u $REDIS_URL ping
   # Should return: PONG
   ```

---

## Test 1: TwiML Endpoint

**Test the TwiML endpoint returns valid XML**

```bash
# Start dev server
npm run dev

# In another terminal, test the endpoint
curl http://localhost:3000/api/twiml/call/test-call-123

# Expected output:
# <?xml version="1.0" encoding="UTF-8"?>
# <Response>
#   <Start>
#     <Stream url="wss://leadflip-websocket.railway.app">
#       <Parameter name="callId" value="test-call-123" />
#     </Stream>
#   </Start>
#   <Say voice="Polly.Joanna">
#     Connecting you now, please hold.
#   </Say>
#   <Pause length="60"/>
# </Response>
```

**✅ Success**: XML is returned with proper structure
**❌ Failure**: Check that dev server is running on port 3000

---

## Test 2: Integration Test Script

**Run the automated integration test**

```bash
npx ts-node scripts/test-ai-calling-integration.ts
```

**Expected Output**:
```
🚀 AI Calling Integration Test Suite

==================================================

🔍 Testing TwiML Generation...

📄 Generated TwiML:
<?xml version="1.0" encoding="UTF-8"?>
...

✅ TwiML is VALID

🔍 Testing Queue Configuration...
✅ Redis connection: OK

📊 Queue Statistics:
  - Waiting: 0
  - Active: 0
  - Completed: X
  - Failed: X

🔍 Testing Call Queueing...

📤 Queueing test job...
✅ Job queued with ID: test-XXXXXXXXXX

✅ Job found in queue:
  - ID: test-XXXXXXXXXX
  - Name: initiate-call
  - State: waiting
  - Data: {...}

🧹 Test job removed from queue

==================================================

📊 Test Results Summary:
  - TwiML Generation: ✅ PASS
  - Queue Configuration: ✅ PASS
  - Call Queueing: ✅ PASS

✅ All tests PASSED!
```

**✅ Success**: All 3 tests pass
**❌ Failure**: Check error messages for specific issues (Redis connection, etc.)

---

## Test 3: Business Requests AI Call (Via API)

**Test business.requestAICall mutation**

**Step 1**: Create test data in database:

```sql
-- In Supabase SQL Editor:

-- Create test business user
INSERT INTO auth.users (id, email) VALUES
  ('business-user-123', 'testbusiness@example.com')
ON CONFLICT DO NOTHING;

-- Create test business profile
INSERT INTO businesses (id, user_id, name, phone_number, service_categories, location, city, state, zip_code)
VALUES
  ('business-123', 'business-user-123', 'Test Plumbing Co', '+15551234567',
   ARRAY['plumbing'], ST_SetSRID(ST_Point(-86.158, 39.768), 4326), 'Indianapolis', 'IN', '46204')
ON CONFLICT DO NOTHING;

-- Create test consumer user
INSERT INTO auth.users (id, email) VALUES
  ('consumer-user-456', 'testconsumer@example.com')
ON CONFLICT DO NOTHING;

-- Create test lead
INSERT INTO leads (id, user_id, problem_text, service_category, urgency, contact_phone, location_zip)
VALUES
  ('lead-789', 'consumer-user-456', 'Water heater leaking', 'plumbing', 'urgent',
   '+15559876543', '46204')
ON CONFLICT DO NOTHING;

-- Create test match
INSERT INTO matches (lead_id, business_id, status, confidence_score)
VALUES
  ('lead-789', 'business-123', 'interested', 8.5)
ON CONFLICT DO NOTHING;
```

**Step 2**: Call the API via tRPC:

```typescript
// In your app or via test script
import { trpc } from '@/lib/trpc/client';

const result = await trpc.business.requestAICall.mutate({
  leadId: 'lead-789',
  objective: 'Call consumer to schedule plumbing consultation for water heater repair',
});

console.log(result);
// Expected:
// {
//   success: true,
//   call_id: 'some-uuid-here',
//   message: 'AI call queued for immediate processing',
//   queued_at: '2025-10-01T12:00:00.000Z'
// }
```

**Step 3**: Verify job in Redis:

```bash
redis-cli -u $REDIS_URL

# List all call jobs
KEYS bull:calls:*

# Get specific job (use call_id from result)
HGETALL bull:calls:some-uuid-here

# Should show job data with call_id, lead_id, phone_number, etc.
```

**✅ Success**: Job is created in Redis with correct data
**❌ Failure**: Check error message for validation issues

---

## Test 4: Consumer Requests Callback (Via API)

**Test lead.requestCallback mutation**

**Using test data from Test 3**:

```typescript
import { trpc } from '@/lib/trpc/client';

const result = await trpc.lead.requestCallback.mutate({
  leadId: 'lead-789',
  businessId: 'business-123',
  preferredTime: '2025-10-01T15:00:00Z', // Optional
});

console.log(result);
// Expected:
// {
//   success: true,
//   call_id: 'another-uuid-here',
//   message: 'Callback scheduled for 2025-10-01T15:00:00Z',
//   queued_at: '2025-10-01T12:00:00.000Z'
// }
```

**Verify scheduled job**:

```bash
redis-cli -u $REDIS_URL

# Get job data
HGETALL bull:calls:another-uuid-here

# Check for delay field (should be milliseconds until preferredTime)
```

**✅ Success**: Job is created with delay for scheduled time
**❌ Failure**: Check error message

---

## Test 5: Verify Call Record in Database

**Check that call records are created**:

```sql
-- In Supabase SQL Editor:

-- View all calls
SELECT * FROM calls ORDER BY created_at DESC LIMIT 10;

-- Expected fields:
-- - id (UUID)
-- - lead_id
-- - business_id
-- - consumer_id
-- - call_type ('qualify_lead' or 'consumer_callback')
-- - objective
-- - status ('queued')
-- - system_prompt (long text)
-- - scheduled_time (if provided)
-- - created_at
```

**✅ Success**: Calls appear in database with status 'queued'
**❌ Failure**: Check database connection and migration status

---

## Common Issues & Fixes

### Issue: "Redis connection failed"

**Fix**:
```bash
# Check REDIS_URL is set
echo $REDIS_URL

# Test connection manually
redis-cli -u $REDIS_URL ping

# If fails, verify Upstash Redis credentials in .env.local
```

---

### Issue: "Business profile not found"

**Fix**:
```sql
-- Verify business exists for user
SELECT * FROM businesses WHERE user_id = 'your-clerk-user-id';

-- If missing, create business profile via business.register mutation
```

---

### Issue: "Lead not found or not matched to your business"

**Fix**:
```sql
-- Verify match exists
SELECT * FROM matches WHERE lead_id = 'lead-id' AND business_id = 'business-id';

-- If missing, create match or use different leadId
```

---

### Issue: "You must accept this lead before requesting a call"

**Fix**:
```sql
-- Update match status to 'interested'
UPDATE matches
SET status = 'interested'
WHERE lead_id = 'lead-id' AND business_id = 'business-id';
```

---

### Issue: "Consumer phone number not available"

**Fix**:
```sql
-- Update lead with phone number
UPDATE leads
SET contact_phone = '+15551234567'
WHERE id = 'lead-id';
```

---

## Cleanup Test Data

**After testing, clean up**:

```sql
-- Delete test calls
DELETE FROM calls WHERE lead_id = 'lead-789';

-- Delete test match
DELETE FROM matches WHERE lead_id = 'lead-789';

-- Delete test lead
DELETE FROM leads WHERE id = 'lead-789';

-- Delete test business
DELETE FROM businesses WHERE id = 'business-123';
```

```bash
# Clear test jobs from Redis
redis-cli -u $REDIS_URL

KEYS bull:calls:test-*
# For each key returned:
DEL bull:calls:test-XXXXXXXXXX
```

---

## Next Steps After Testing

Once all tests pass:

1. **Deploy WebSocket Server** (Track 5)
   - Set `WEBSOCKET_SERVER_URL` environment variable
   - Deploy to Railway or Fly.io

2. **Start Call Worker** (Track 5)
   - Run: `node dist/server/workers/call-worker.js`
   - Monitor logs for job processing

3. **Test End-to-End Call**
   - Request AI call via UI
   - Worker picks up job
   - Twilio initiates call
   - WebSocket streams audio
   - Call completes with transcript

---

## Help & Support

**Files to Reference**:
- Full implementation details: `TRACK_3_COMPLETION_REPORT.md`
- API contracts: `INTEGRATION_POINTS.md`
- Progress tracking: `PROGRESS_TRACKER.md`

**Test Script**:
- Location: `scripts/test-ai-calling-integration.ts`
- Run: `npx ts-node scripts/test-ai-calling-integration.ts`

---

**Track 3 Status**: ✅ COMPLETE
**All Tests**: ✅ READY TO RUN
