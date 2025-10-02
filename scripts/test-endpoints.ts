/**
 * Manual Endpoint Testing Script
 *
 * Run with: npx tsx scripts/test-endpoints.ts
 */

import { appRouter } from '../src/server/routers/_app';
import { interviewRouter } from '../src/server/routers/interview';
import { businessRouter } from '../src/server/routers/business';
import { leadRouter } from '../src/server/routers/lead';
import { callRouter } from '../src/server/routers/call';
import { adminRouter } from '../src/server/routers/admin';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [] as { name: string; status: 'PASS' | 'FAIL'; error?: string }[]
};

function test(name: string, fn: () => boolean | Promise<boolean>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(passed => {
        if (passed) {
          results.passed++;
          results.tests.push({ name, status: 'PASS' });
          console.log(`✅ ${name}`);
        } else {
          results.failed++;
          results.tests.push({ name, status: 'FAIL' });
          console.log(`❌ ${name}`);
        }
      });
    } else {
      if (result) {
        results.passed++;
        results.tests.push({ name, status: 'PASS' });
        console.log(`✅ ${name}`);
      } else {
        results.failed++;
        results.tests.push({ name, status: 'FAIL' });
        console.log(`❌ ${name}`);
      }
    }
  } catch (error) {
    results.failed++;
    results.tests.push({
      name,
      status: 'FAIL',
      error: error instanceof Error ? error.message : String(error)
    });
    console.log(`❌ ${name}: ${error}`);
  }
}

console.log('\n🧪 Testing LeadFlip API Endpoints\n');
console.log('='.repeat(60));

// Interview Router Tests
console.log('\n📝 Interview Router:');
test('startInterview endpoint exists', () => {
  return !!interviewRouter._def.procedures.startInterview;
});

test('sendMessageSync endpoint exists', () => {
  return !!interviewRouter._def.procedures.sendMessageSync;
});

test('sendMessage subscription exists', () => {
  return !!interviewRouter._def.procedures.sendMessage;
});

test('getSession endpoint exists', () => {
  return !!interviewRouter._def.procedures.getSession;
});

test('finalizeInterview endpoint exists', () => {
  return !!interviewRouter._def.procedures.finalizeInterview;
});

// Business Router Tests
console.log('\n🏢 Business Router:');
test('register endpoint exists', () => {
  return !!businessRouter._def.procedures.register;
});

test('getLeads endpoint exists', () => {
  return !!businessRouter._def.procedures.getLeads;
});

test('getStats endpoint exists', () => {
  return !!businessRouter._def.procedures.getStats;
});

test('getProfile endpoint exists', () => {
  return !!businessRouter._def.procedures.getProfile;
});

test('updateProfile endpoint exists', () => {
  return !!businessRouter._def.procedures.updateProfile;
});

test('respondToLead endpoint exists', () => {
  return !!businessRouter._def.procedures.respondToLead;
});

test('requestAICall endpoint exists', () => {
  return !!businessRouter._def.procedures.requestAICall;
});

test('updateCapacity endpoint exists', () => {
  return !!businessRouter._def.procedures.updateCapacity;
});

// Lead Router Tests
console.log('\n📋 Lead Router:');
test('submit endpoint exists', () => {
  return !!leadRouter._def.procedures.submit;
});

test('getById endpoint exists', () => {
  return !!leadRouter._def.procedures.getById;
});

test('getMyLeads endpoint exists', () => {
  return !!leadRouter._def.procedures.getMyLeads;
});

test('getMatches endpoint exists', () => {
  return !!leadRouter._def.procedures.getMatches;
});

// Call Router Tests
console.log('\n📞 Call Router:');
test('initiate endpoint exists', () => {
  return !!callRouter._def.procedures.initiate;
});

test('getById endpoint exists', () => {
  return !!callRouter._def.procedures.getById;
});

test('getByLead endpoint exists', () => {
  return !!callRouter._def.procedures.getByLead;
});

test('getStats endpoint exists', () => {
  return !!callRouter._def.procedures.getStats;
});

// Admin Router Tests
console.log('\n👨‍💼 Admin Router:');
test('getAllLeads endpoint exists', () => {
  return !!adminRouter._def.procedures.getAllLeads;
});

test('getAllBusinesses endpoint exists', () => {
  return !!adminRouter._def.procedures.getAllBusinesses;
});

test('getStats endpoint exists', () => {
  return !!adminRouter._def.procedures.getStats;
});

test('flagLead endpoint exists', () => {
  return !!adminRouter._def.procedures.flagLead;
});

// App Router Integration Tests
console.log('\n🔗 App Router Integration:');
test('interview router is mounted', () => {
  const procedures = Object.keys(appRouter._def.procedures);
  return procedures.some(p => p.startsWith('interview.'));
});

test('business router is mounted', () => {
  const procedures = Object.keys(appRouter._def.procedures);
  return procedures.some(p => p.startsWith('business.'));
});

test('lead router is mounted', () => {
  const procedures = Object.keys(appRouter._def.procedures);
  return procedures.some(p => p.startsWith('lead.'));
});

test('call router is mounted', () => {
  const procedures = Object.keys(appRouter._def.procedures);
  return procedures.some(p => p.startsWith('calls.'));
});

test('admin router is mounted', () => {
  const procedures = Object.keys(appRouter._def.procedures);
  return procedures.some(p => p.startsWith('admin.'));
});

// Print final results
setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total: ${results.passed + results.failed}`);
  console.log(`🎯 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`   - ${t.name}`);
        if (t.error) console.log(`     Error: ${t.error}`);
      });
  }

  console.log('\n');
  process.exit(results.failed > 0 ? 1 : 0);
}, 1000);
