/**
 * WebSocket Connection Test Script
 * [2025-10-01 8:35 PM] Agent 5: Created WebSocket test client
 *
 * Tests WebSocket server connectivity and basic message exchange
 *
 * Usage:
 *   npm run test:websocket
 *   or
 *   tsx scripts/test-websocket-connection.ts [ws://localhost:8080]
 */

import WebSocket from 'ws';

const WEBSOCKET_URL = process.argv[2] || 'ws://localhost:8080';
const TEST_TIMEOUT = 10000; // 10 seconds

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

async function testConnection(): Promise<void> {
  console.log('🧪 WebSocket Connection Test Suite\n');
  console.log(`📡 Target: ${WEBSOCKET_URL}\n`);

  // Test 1: Basic Connection
  await testBasicConnection();

  // Test 2: Health Check
  await testHealthCheck();

  // Test 3: Simulated SignalWire Message
  await testSignalWireMessage();

  // Print Results
  printResults();
}

async function testBasicConnection(): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    console.log('Test 1: Basic WebSocket Connection...');

    const ws = new WebSocket(WEBSOCKET_URL);

    const timeout = setTimeout(() => {
      ws.close();
      results.push({
        test: 'Basic Connection',
        status: 'FAIL',
        message: 'Connection timeout (10s)',
      });
      resolve();
    }, TEST_TIMEOUT);

    ws.on('open', () => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      results.push({
        test: 'Basic Connection',
        status: 'PASS',
        message: `Connected successfully`,
        duration,
      });

      console.log(`✅ Connected in ${duration}ms\n`);
      ws.close();
      resolve();
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      results.push({
        test: 'Basic Connection',
        status: 'FAIL',
        message: `Connection error: ${error.message}`,
      });
      console.log(`❌ Failed: ${error.message}\n`);
      resolve();
    });
  });
}

async function testHealthCheck(): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    console.log('Test 2: Health Check Endpoint...');

    // Convert ws:// to http:// for health check
    const healthUrl = WEBSOCKET_URL.replace('ws://', 'http://').replace('wss://', 'https://') + '/health';

    fetch(healthUrl)
      .then(async (response) => {
        const duration = Date.now() - startTime;

        if (response.ok) {
          const data = await response.json();
          results.push({
            test: 'Health Check',
            status: 'PASS',
            message: `Server healthy - ${JSON.stringify(data)}`,
            duration,
          });
          console.log(`✅ Health check passed in ${duration}ms`);
          console.log(`   Status: ${data.status}, Active calls: ${data.activeCalls}\n`);
        } else {
          results.push({
            test: 'Health Check',
            status: 'FAIL',
            message: `HTTP ${response.status}`,
          });
          console.log(`❌ Failed: HTTP ${response.status}\n`);
        }
        resolve();
      })
      .catch((error) => {
        results.push({
          test: 'Health Check',
          status: 'FAIL',
          message: `Request failed: ${error.message}`,
        });
        console.log(`❌ Failed: ${error.message}\n`);
        resolve();
      });
  });
}

async function testSignalWireMessage(): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    console.log('Test 3: Simulated SignalWire Message...');

    const ws = new WebSocket(WEBSOCKET_URL);
    let messageReceived = false;

    const timeout = setTimeout(() => {
      ws.close();
      if (!messageReceived) {
        results.push({
          test: 'SignalWire Message',
          status: 'FAIL',
          message: 'No response received (timeout)',
        });
        console.log(`❌ No response received\n`);
      }
      resolve();
    }, TEST_TIMEOUT);

    ws.on('open', () => {
      // Send mock SignalWire "start" event
      const mockStartEvent = {
        event: 'start',
        start: {
          callSid: 'TEST_CALL_SID_12345',
          streamSid: 'TEST_STREAM_SID_12345',
        },
      };

      console.log('   Sending mock SignalWire start event...');
      ws.send(JSON.stringify(mockStartEvent));
    });

    ws.on('message', (data: Buffer) => {
      messageReceived = true;
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      try {
        const message = JSON.parse(data.toString());
        results.push({
          test: 'SignalWire Message',
          status: 'PASS',
          message: `Received response: ${message.event || 'unknown event'}`,
          duration,
        });
        console.log(`✅ Server responded in ${duration}ms`);
        console.log(`   Response: ${JSON.stringify(message)}\n`);
      } catch (error) {
        results.push({
          test: 'SignalWire Message',
          status: 'FAIL',
          message: 'Invalid JSON response',
        });
        console.log(`❌ Invalid response format\n`);
      }

      ws.close();
      resolve();
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      results.push({
        test: 'SignalWire Message',
        status: 'FAIL',
        message: `WebSocket error: ${error.message}`,
      });
      console.log(`❌ Error: ${error.message}\n`);
      resolve();
    });

    ws.on('close', () => {
      if (!messageReceived && results.every(r => r.test !== 'SignalWire Message')) {
        results.push({
          test: 'SignalWire Message',
          status: 'FAIL',
          message: 'Connection closed before message exchange',
        });
        console.log(`❌ Connection closed prematurely\n`);
      }
      clearTimeout(timeout);
      resolve();
    });
  });
}

function printResults(): void {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    TEST RESULTS                           ');
  console.log('═══════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const total = results.length;

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${index + 1}. ${icon} ${result.test}${duration}`);
    console.log(`   ${result.message}\n`);
  });

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Summary: ${passed}/${total} tests passed`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (passed === total) {
    console.log('🎉 All tests passed! WebSocket server is ready for deployment.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the server configuration.\n');
    process.exit(1);
  }
}

// Run tests
testConnection().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
