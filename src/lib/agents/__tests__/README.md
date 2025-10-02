# Lead Classifier Subagent Tests

This directory contains unit tests for the Lead Classifier subagent, which is the first proof-of-concept implementation of the LeadFlip agent architecture.

## Setup Instructions

### 1. Install Testing Dependencies

```bash
npm install --save-dev jest @types/jest ts-jest @testing-library/jest-dom
```

### 2. Verify Configuration Files

Ensure these files exist in the project root:
- `jest.config.js` - Main Jest configuration
- `jest.setup.js` - Test environment setup

### 3. Run Tests

```bash
# Run all agent tests
npm run test:agents

# Run only lead classifier tests
npm run test:agents -- lead-classifier

# Run tests in watch mode
npm run test:agents -- --watch

# Run tests with coverage
npm run test:agents -- --coverage
```

## Test Structure

### Test File: `lead-classifier.test.ts`

The test suite includes:

1. **Basic Classification Tests**
   - Emergency plumbing lead (from CLAUDE.md example)
   - Vague/low-quality submissions
   - Lawn care service leads
   - Empty input validation

2. **Type Validation Tests**
   - Proper TypeScript types returned
   - Enum value validation (service_category, urgency, sentiment)
   - Value range validation (quality_score 0-10, ZIP code format)

3. **Quality Score Tests** (per CLAUDE.md guidelines)
   - High quality (8-10): Clear description, budget, location, timeline
   - Medium quality (5-7): Some details missing
   - Low quality (0-4): Vague, spam indicators

4. **Batch Processing Tests**
   - `classifyLeadBatch()` - Multiple leads sequentially
   - Order preservation
   - Performance testing

5. **Safe Classification Tests**
   - `classifyLeadSafe()` - Returns null on error instead of throwing

6. **Edge Cases**
   - Multiple service types in one lead
   - Budget ranges (min/max)
   - International addresses
   - Non-US ZIP codes

7. **Error Handling**
   - API failures
   - Empty responses
   - Invalid JSON structure

## Architecture Notes

### Mocking Strategy

Tests use Jest mocks for the Claude Agent SDK to:
- Avoid real API calls during testing
- Control response data for predictable tests
- Test error handling scenarios

### Single-Turn Classification

The Lead Classifier is configured with `maxTurns: 1` for speed:
- One request → one response
- No back-and-forth conversation
- Optimized for cost and latency

### System Prompt

The subagent uses the system prompt at:
```
.claude/agents/lead-classifier.md
```

This prompt instructs Claude to:
- Extract structured JSON from unstructured text
- Score lead quality (0-10 scale)
- Detect spam patterns
- Return only JSON (no explanations)

## Expected Test Results

All tests should pass with proper setup. If tests fail:

1. **Missing Dependencies**: Run `npm install --save-dev jest @types/jest ts-jest`
2. **API Key Issues**: Ensure `ANTHROPIC_API_KEY` is set in `.env.local`
3. **Mock Issues**: Clear Jest cache with `npm run test:agents -- --clearCache`

## Integration with Phase 2

These tests serve as:
- ✅ **Proof of Concept** - Validates Claude Agent SDK integration
- ✅ **Type Safety** - Ensures TypeScript interfaces are correct
- ✅ **Quality Baseline** - Establishes lead scoring standards
- ✅ **Documentation** - Examples for building other subagents

Next steps (Phase 2):
1. Build Business Matcher subagent with similar test structure
2. Create integration tests for orchestrator → classifier flow
3. Add performance benchmarks (latency, cost per classification)
4. Test with real data samples from CLAUDE.md memory patterns

## Test Coverage Goals

Target coverage for Lead Classifier:
- **Statements**: 95%+
- **Branches**: 90%+
- **Functions**: 100%
- **Lines**: 95%+

Run coverage report:
```bash
npm run test:agents -- --coverage
```

## Related Files

- **Implementation**: `../lead-classifier.ts`
- **Types**: `../../../types/lead-classifier.ts`
- **System Prompt**: `../../../../.claude/agents/lead-classifier.md`
- **Specs**: `../../../../CLAUDE.md` (Section: "Subagent 1: Lead Classifier")

## Troubleshooting

### "Cannot find module '@anthropic-ai/claude-agent-sdk'"

Install the SDK:
```bash
npm install @anthropic-ai/claude-agent-sdk
```

### "Module not found: Can't resolve '@/types/lead-classifier'"

Verify `tsconfig.json` has path alias:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Tests timeout

Increase timeout in `jest.setup.js`:
```javascript
jest.setTimeout(60000); // 60 seconds
```

### Mock not working

Clear Jest cache:
```bash
npm run test:agents -- --clearCache
```

## Contributing

When adding new tests:
1. Follow existing test structure (describe/it blocks)
2. Use descriptive test names
3. Include both happy path and error cases
4. Mock external dependencies (API calls)
5. Test type safety, not just functionality
6. Reference CLAUDE.md specs in comments

## Questions?

Refer to:
- **CLAUDE.md**: Complete architecture documentation
- **Testing Strategy Section**: Lines 751-859
- **Subagent Pattern**: Lines 409-428
