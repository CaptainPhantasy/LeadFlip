/**
 * Jest Setup File
 *
 * Runs before each test suite to configure the testing environment
 */

// Add custom matchers or global test setup here
// This file is referenced in jest.config.js

// Extend Jest matchers if needed
// import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-api-key';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
process.env.NODE_ENV = 'test';

// Supabase (use real credentials if available, otherwise mock)
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';

// Redis/Queue (use real connection if available)
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Clerk (test mode)
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'test-clerk-key';
process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'test-clerk-secret';

// Twilio (test credentials)
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'test-twilio-sid';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'test-twilio-token';
process.env.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+15555550000';

// SendGrid/Mailgun (test mode)
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'test-sendgrid-key';

// Global test timeout (60 seconds for AI/API calls)
jest.setTimeout(60000);

// Suppress console logs during tests unless VERBOSE=true
if (process.env.VERBOSE !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for debugging
    error: console.error,
  };
}

// Custom matchers
expect.extend({
  /**
   * Check if value is one of the provided options
   */
  toBeOneOf(received, validOptions) {
    const pass = validOptions.includes(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be one of ${validOptions.join(', ')}`
          : `expected ${received} to be one of ${validOptions.join(', ')}`,
      pass,
    };
  },

  /**
   * Check if value is a valid UUID
   */
  toBeUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
      pass,
    };
  },

  /**
   * Check if value is a valid E.164 phone number
   */
  toBeE164PhoneNumber(received) {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    const pass = typeof received === 'string' && e164Regex.test(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid E.164 phone number`
          : `expected ${received} to be a valid E.164 phone number`,
      pass,
    };
  },

  /**
   * Check if date is within X seconds of now
   */
  toBeRecentDate(received, maxSecondsAgo = 60) {
    const receivedDate = new Date(received);
    const now = new Date();
    const diffSeconds = (now - receivedDate) / 1000;
    const pass = !isNaN(diffSeconds) && diffSeconds >= 0 && diffSeconds <= maxSecondsAgo;
    return {
      message: () =>
        pass
          ? `expected ${received} not to be within ${maxSecondsAgo} seconds of now`
          : `expected ${received} to be within ${maxSecondsAgo} seconds of now (diff: ${diffSeconds}s)`,
      pass,
    };
  },
});

// Global test utilities
global.testUtils = {
  /**
   * Wait for a condition with timeout
   */
  async waitFor(condition, options = {}) {
    const { timeout = 5000, interval = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
  },

  /**
   * Sleep for X milliseconds
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};
