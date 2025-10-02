# LeadFlip Testing Guide

**Comprehensive testing documentation for all test types and procedures**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Infrastructure](#test-infrastructure)
3. [Test Types](#test-types)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Test Helpers and Utilities](#test-helpers-and-utilities)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   # Copy example env file (if exists)
   cp .env.example .env.local

   # Or set manually:
   ANTHROPIC_API_KEY=sk-ant-...
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   REDIS_URL=redis://localhost:6379
   ```

3. **Start Required Services (for integration tests)**
   ```bash
   # Start Redis (for queue tests)
   docker run -d -p 6379:6379 redis:7-alpine
   ```

### Run All Tests

```bash
# Run complete test suite
npm test

# Run with coverage report
npm test -- --coverage

# Run in watch mode (auto-rerun on changes)
npm test -- --watch

# Run tests verbosely (show console logs)
VERBOSE=true npm test
```

---

## Test Infrastructure

### Test Directory Structure

```
tests/
├── integration/              # Integration tests
│   ├── lead-flow.test.ts            # Lead submission flow (EXISTING)
│   ├── call-flow.test.ts            # AI call flow (EXISTING)
│   ├── business-registration-flow.test.ts  # NEW
│   ├── notification-flow.test.ts    # NEW (stubbed for Track 1)
│   └── ai-call-queueing.test.ts     # NEW
│
├── helpers/                  # Test utilities (NEW)
│   ├── test-data-factory.ts        # Test data generators
│   └── supabase-test-client.ts     # Database test helpers
│
└── api-endpoints.test.ts     # API structure validation (EXISTING)

src/lib/agents/__tests__/    # Agent unit tests
└── lead-classifier.test.ts  # Lead classifier tests (EXISTING)
```

### Test Configuration Files

- **`jest.config.js`** - Main Jest configuration
- **`jest.setup.js`** - Global test setup, custom matchers, env vars
- **`.github/workflows/test.yml`** - CI/CD pipeline configuration

---

## Test Types

### 1. Unit Tests (Agent Tests)

**Location**: `src/lib/agents/__tests__/`

**Purpose**: Test individual AI agent functions in isolation

**Coverage**:
- Lead Classifier subagent
- Business Matcher subagent
- Response Generator subagent
- Call Agent subagent

**Run Command**:
```bash
npm run test:agents
```

**Example**:
```typescript
describe('Lead Classifier', () => {
  it('should classify emergency plumbing lead correctly', async () => {
    const result = await classifyLead(
      "My water heater is leaking, need ASAP in Carmel 46032, budget $800"
    );

    expect(result.service_category).toBe('plumbing');
    expect(result.urgency).toBe('emergency');
    expect(result.quality_score).toBeGreaterThan(7);
  });
});
```

### 2. Integration Tests

**Location**: `tests/integration/`

**Purpose**: Test complete workflows across multiple systems

**Coverage**:
- ✅ **Lead submission flow** - Consumer → Classifier → Matcher → Notification
- ✅ **Business registration** - Profile creation, updates, filtering
- ⚠️ **Notification flow** - Email/SMS delivery (stubbed pending Track 1)
- ✅ **AI call queueing** - BullMQ job creation and management
- ✅ **Call flow** - End-to-end AI calling (existing)

**Run Command**:
```bash
npm run test:integration
```

### 3. API Endpoint Tests

**Location**: `tests/api-endpoints.test.ts`

**Purpose**: Validate tRPC router structure and endpoint availability

**Coverage**:
- Interview router endpoints
- Business router endpoints
- Lead router endpoints
- Call router endpoints
- Admin router endpoints

**Run Command**:
```bash
npm test -- tests/api-endpoints.test.ts
```

---

## Running Tests

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:agents

# Integration tests only
npm run test:integration

# Specific test file
npm test -- tests/integration/business-registration-flow.test.ts

# Specific test suite within a file
npm test -- --testNamePattern="Business Profile Creation"

# Specific test case
npm test -- --testNamePattern="should create a complete business profile"
```

### Run with Options

```bash
# Show verbose output (console logs visible)
VERBOSE=true npm test

# Generate coverage report
npm test -- --coverage

# Update snapshots
npm test -- --updateSnapshot

# Run only changed tests (based on git)
npm test -- --onlyChanged

# Run tests in parallel (faster)
npm test -- --maxWorkers=4

# Fail fast (stop on first failure)
npm test -- --bail
```

### Watch Mode (Development)

```bash
# Auto-rerun tests on file changes
npm test -- --watch

# Watch specific test file
npm test -- --watch tests/integration/lead-flow.test.ts
```

---

## Writing Tests

### Test Data Factory

**Location**: `tests/helpers/test-data-factory.ts`

**Purpose**: Generate realistic test data for all entities

**Usage**:
```typescript
import {
  createTestConsumer,
  createTestBusiness,
  createTestLead,
  createTestCall,
  createTestBusinesses,
  generateProblemText
} from '../helpers/test-data-factory';

// Create single entities
const consumer = createTestConsumer({ firstName: 'Jane', lastName: 'Doe' });
const business = createTestBusiness({ service_categories: ['plumbing'] });
const lead = createTestLead({ urgency: 'emergency', budget_max: 1000 });
const call = createTestCall({ call_type: 'qualify_lead' });

// Create multiple entities
const businesses = createTestBusinesses(10); // 10 varied businesses

// Generate realistic problem text
const problemText = generateProblemText({
  category: 'plumbing',
  urgency: 'emergency',
  budget: 800,
  zipCode: '46032'
});
```

### Supabase Test Client

**Location**: `tests/helpers/supabase-test-client.ts`

**Purpose**: Database operations with automatic cleanup

**Usage**:
```typescript
import { createTestClient } from '../helpers/supabase-test-client';

describe('My Test Suite', () => {
  let testClient;

  beforeAll(() => {
    testClient = createTestClient();
  });

  afterAll(async () => {
    await testClient.cleanup(); // Auto-deletes all created records
  });

  it('should create business', async () => {
    const businessData = createTestBusiness();
    const businessId = await testClient.createTestBusiness(businessData);

    // Business will be auto-deleted in afterAll
    expect(businessId).toBeDefined();
  });
});
```

**Key Methods**:
- `insert(table, data)` - Insert and track record
- `insertMany(table, data[])` - Insert multiple records
- `createTestBusiness(data)` - Create business (tracked)
- `createTestLead(data)` - Create lead (tracked)
- `createTestMatch(leadId, businessId)` - Create match (tracked)
- `createTestCall(data)` - Create call record (tracked)
- `cleanup()` - Delete all tracked records
- `exists(table, id)` - Check if record exists
- `count(table, column, value)` - Count matching records
- `waitFor(condition, options)` - Wait for async condition

### Custom Jest Matchers

**Defined in**: `jest.setup.js`

```typescript
// Check if value is one of options
expect(urgency).toBeOneOf(['emergency', 'urgent', 'normal']);

// Check UUID format
expect(leadId).toBeUUID();

// Check E.164 phone number format
expect(phoneNumber).toBeE164PhoneNumber(); // +15551234567

// Check if date is recent (within X seconds)
expect(createdAt).toBeRecentDate(); // Default: 60 seconds
expect(createdAt).toBeRecentDate(120); // Within 120 seconds
```

### Global Test Utilities

```typescript
// Wait for condition with timeout
await global.testUtils.waitFor(
  async () => {
    const job = await queue.getJob(jobId);
    return job.status === 'completed';
  },
  { timeout: 10000, interval: 100 }
);

// Sleep for milliseconds
await global.testUtils.sleep(1000);
```

---

## Test Helpers and Utilities

### Test Data Factory Features

**Consumer Generation**:
```typescript
const consumer = createTestConsumer({
  firstName: 'John',
  lastName: 'Smith',
  email: 'custom@example.com',
  phone: '+15551234567'
});
```

**Business Generation**:
```typescript
const business = createTestBusiness({
  name: 'Premium Plumbing LLC',
  service_categories: ['plumbing', 'hvac'],
  city: 'Carmel',
  zip_code: '46032',
  price_tier: 'premium',
  offers_emergency_service: true,
  years_in_business: 15,
  completed_jobs: 500
});
```

**Lead Generation**:
```typescript
const lead = createTestLead({
  service_category: 'roofing',
  urgency: 'urgent',
  budget_min: 2000,
  budget_max: 5000,
  location_zip: '46038',
  quality_score: 8.5
});
```

**Batch Generation**:
```typescript
// Create 10 diverse businesses
const businesses = createTestBusinesses(10);

// Create 20 diverse leads
const leads = createTestLeads(20);
```

### Database Test Patterns

**Pattern 1: Simple CRUD Test**
```typescript
it('should create and retrieve business', async () => {
  const businessData = createTestBusiness();
  const businessId = await testClient.createTestBusiness(businessData);

  const { data: business } = await testClient.getClient()
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  expect(business.name).toBe(businessData.name);
});
```

**Pattern 2: Relationship Test**
```typescript
it('should create lead-business match', async () => {
  const leadId = await testClient.createTestLead(createTestLead());
  const businessId = await testClient.createTestBusiness(createTestBusiness());

  const matchId = await testClient.createTestMatch(leadId, businessId, {
    confidence_score: 90,
    match_reasons: ['proximity', 'service_match']
  });

  expect(matchId).toBeDefined();
});
```

**Pattern 3: Async Condition Test**
```typescript
it('should update status after processing', async () => {
  const leadId = await testClient.createTestLead(createTestLead());

  // Trigger async processing
  await processLead(leadId);

  // Wait for status change
  await testClient.waitFor(
    async () => {
      const { data } = await supabase
        .from('leads')
        .select('status')
        .eq('id', leadId)
        .single();
      return data?.status === 'matched';
    },
    { timeout: 10000 }
  );
});
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs**:

1. **Unit Tests** - Agent tests (isolated)
2. **Integration Tests** - Full workflow tests (with Redis service)
3. **API Tests** - Endpoint structure validation
4. **Lint & Type Check** - Code quality
5. **Test Summary** - Aggregate results

### Required GitHub Secrets

Add these in GitHub repo settings → Secrets and variables → Actions:

```bash
# Anthropic (required)
ANTHROPIC_API_KEY

# OpenAI (required for call tests)
OPENAI_API_KEY

# Supabase (test project recommended)
TEST_SUPABASE_URL
TEST_SUPABASE_ANON_KEY
TEST_SUPABASE_SERVICE_KEY

# Clerk (test environment)
TEST_CLERK_PUBLISHABLE_KEY
TEST_CLERK_SECRET_KEY

# Twilio (test credentials)
TEST_TWILIO_ACCOUNT_SID
TEST_TWILIO_AUTH_TOKEN
TEST_TWILIO_PHONE_NUMBER

# SendGrid (test mode)
TEST_SENDGRID_API_KEY
```

### Viewing Test Results

1. Go to GitHub repository → Actions tab
2. Click on latest workflow run
3. View job results and logs
4. Download coverage artifacts (retained 7 days)

### Local CI Simulation

```bash
# Install act (GitHub Actions local runner)
brew install act

# Run workflow locally
act push

# Run specific job
act -j unit-tests
```

---

## Troubleshooting

### Common Issues

#### 1. Redis Connection Errors (Queue Tests)

**Error**: `ECONNREFUSED` when running queue tests

**Solution**:
```bash
# Start Redis with Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally
brew install redis
redis-server
```

**Skip Queue Tests**:
Queue tests automatically skip if Redis is unavailable. You'll see:
```
console.warn: Redis not available - skipping queue tests
```

#### 2. Supabase Connection Errors

**Error**: `Invalid Supabase URL` or `Unauthorized`

**Solution**:
```bash
# Verify credentials
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test connection
curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/
```

#### 3. Test Timeout Errors

**Error**: `Timeout - Async callback was not invoked within the 60000 ms timeout`

**Solution**:
```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // ...
}, 120000); // 120 seconds

// Or globally in jest.setup.js
jest.setTimeout(120000);
```

#### 4. Import Path Errors

**Error**: `Cannot find module '@/types/...'`

**Solution**:
```bash
# Clear Jest cache
npm test -- --clearCache

# Rebuild TypeScript
npm run build
```

#### 5. Environment Variable Not Set

**Error**: Test using undefined environment variables

**Solution**:
```bash
# Set explicitly
ANTHROPIC_API_KEY=sk-ant-... npm test

# Or add to .env.local (auto-loaded by Next.js)
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env.local
```

### Debugging Tests

**Show Console Logs**:
```bash
VERBOSE=true npm test
```

**Run Single Test with Debugger**:
```bash
# Add debugger statement in test
it('my test', async () => {
  debugger;
  // ...
});

# Run with Node inspector
node --inspect-brk node_modules/.bin/jest tests/my-test.test.ts --runInBand
```

**View Test Coverage**:
```bash
npm test -- --coverage

# Open coverage report
open coverage/lcov-report/index.html
```

---

## Test Coverage Goals

### Current Status (Track 4)

| Category | Coverage | Status |
|----------|----------|--------|
| **Agent Unit Tests** | ~80% | ✅ Good |
| **Integration Tests** | ~60% | ✅ Good |
| **API Tests** | 100% | ✅ Complete |
| **Notification Tests** | 0% | ⚠️ Stubbed (Track 1) |
| **Call Flow Tests** | ~70% | ✅ Good |
| **Business Tests** | ~75% | ✅ Good |

### Target Goals

- **Overall**: >70% coverage
- **Critical Paths**: >90% coverage
- **Agent Logic**: >80% coverage
- **API Endpoints**: 100% structure validation

---

## Advanced Testing Patterns

### Parallel Test Execution

```bash
# Run tests in parallel (4 workers)
npm test -- --maxWorkers=4

# Run serially (useful for debugging)
npm test -- --runInBand
```

### Snapshot Testing

```typescript
it('should match notification template snapshot', () => {
  const template = generateEmailTemplate(lead, business);
  expect(template).toMatchSnapshot();
});

// Update snapshots after intentional changes
npm test -- --updateSnapshot
```

### Mocking External Services

```typescript
// Mock Anthropic API
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'mocked response' }]
      })
    }
  }))
}));
```

---

## Best Practices

1. **Always Clean Up** - Use `testClient.cleanup()` in `afterAll()`
2. **Isolate Tests** - Each test should be independent
3. **Use Factories** - Generate test data with factories, not hardcoded values
4. **Test Edge Cases** - Empty strings, null values, invalid formats
5. **Assert Meaningfully** - Check specific values, not just existence
6. **Keep Tests Fast** - Mock external APIs, use test databases
7. **Name Tests Clearly** - Describe what is being tested and expected outcome
8. **Group Related Tests** - Use `describe()` blocks logically

---

## References

- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **Testing Library**: https://testing-library.com/docs/
- **CLAUDE.md Testing Strategy**: Lines 751-859
- **Integration Points**: `INTEGRATION_POINTS.md`

---

**Last Updated**: Track 4 completion (October 1, 2025)
**Maintained By**: Testing Infrastructure Agent (Track 4)
