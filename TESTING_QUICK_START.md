# Testing Quick Start Guide

**For Developers** | **Updated:** October 1, 2025

---

## 🚀 Quick Commands

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- tests/integration/auth.test.ts

# Run in watch mode (auto-rerun on changes)
npm run test:watch

# Run agent tests only
npm run test:agents

# Run integration tests only
npm run test:integration

# Generate coverage report
npm run test -- --coverage
```

---

## ✅ What's Working NOW

### Authentication Tests (25/25 passing)
```bash
npm run test -- tests/integration/auth.test.ts
```
✅ All god admin, Clerk, and database admin checks passing
✅ RLS policy simulation working
✅ Performance tests < 100ms

---

## 📝 Test File Structure

```
tests/
├── agents/                          # Unit tests for AI agents
│   └── lead-classifier.test.ts      # Classification logic tests
├── integration/                     # Integration tests
│   ├── auth.test.ts                 # ✅ 25 tests passing
│   ├── lead-flow.test.ts            # Existing tests (fixed)
│   ├── orchestrator-flow.test.ts    # End-to-end flow tests
│   └── ...
├── __mocks__/                       # Manual mocks
│   └── @anthropic-ai/
│       └── sdk.ts                   # Anthropic SDK mock
└── helpers/                         # Test utilities
```

---

## 🔧 Custom Test Matchers

```typescript
// Check multiple valid values
expect(urgency).toBeOneOf(['emergency', 'urgent', 'high']);

// Validate UUID
expect(leadId).toBeUUID();

// Validate phone number (E.164)
expect(phone).toBeE164PhoneNumber();

// Check recent timestamp (within 60 seconds)
expect(createdAt).toBeRecentDate(60);
```

---

## 🎯 Writing a New Test

### 1. Create Test File

```typescript
// tests/my-feature.test.ts
import { myFunction } from '@/lib/my-feature';

describe('My Feature', () => {
  it('should work correctly', async () => {
    const result = await myFunction('input');
    expect(result).toBeDefined();
  });
});
```

### 2. Mock External Services

```typescript
// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockSupabase = { from: jest.fn() };

// Mock Anthropic
jest.mock('@anthropic-ai/sdk');

// Mock Clerk
jest.mock('@clerk/nextjs/server');
```

### 3. Run Your Test

```bash
npm run test -- tests/my-feature.test.ts
```

---

## 🐛 Common Issues & Fixes

### "Cannot read properties of undefined"
**Fix:** Check mock is properly initialized in `beforeEach()`

### "Timeout exceeded"
**Fix:** Increase timeout (default: 60s)
```typescript
jest.setTimeout(120000); // 2 minutes
```

### "Module not found"
**Fix:** Use path alias `@/` instead of relative paths
```typescript
// ✅ Good
import { classifyLead } from '@/lib/agents/lead-classifier';

// ❌ Bad
import { classifyLead } from '../../src/lib/agents/lead-classifier';
```

---

## 📊 Test Coverage Goals

| Area | Current | Target |
|------|---------|--------|
| Authentication | 100% | 100% ✅ |
| Lead Classification | 60% | 90% |
| Business Matching | 40% | 80% |
| Orchestrator Flow | 80% | 95% |
| **Overall** | **35%** | **80%** |

---

## 🔗 Quick Links

- **Full Report:** `/TESTING_AGENT_COMPLETION_REPORT.md`
- **Test Summary:** `/TEST_SUMMARY.md`
- **Jest Config:** `jest.config.js`
- **Test Setup:** `jest.setup.js`

---

**Questions?** Check `/TESTING_AGENT_COMPLETION_REPORT.md` for detailed documentation.
