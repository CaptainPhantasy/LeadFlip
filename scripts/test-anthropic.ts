/**
 * Test Anthropic API Connection
 * Run with: npx tsx scripts/test-anthropic.ts
 */

import Anthropic from '@anthropic-ai/sdk';

async function testAnthropicAPI() {
  console.log('\n🧪 Testing Anthropic API Connection...\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log(`✅ API Key found: ${apiKey.substring(0, 20)}...`);

  const anthropic = new Anthropic({ apiKey });

  try {
    console.log('\n📡 Sending test message to Claude...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: 'Say "Hello from LeadFlip!" if you can hear me.'
      }]
    });

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as {type: 'text', text: string}).text)
      .join('');

    console.log(`\n✅ Claude Response: "${text}"`);
    console.log(`\n📊 Stats:`);
    console.log(`   - Model: ${response.model}`);
    console.log(`   - Tokens: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output`);
    console.log(`   - Stop Reason: ${response.stop_reason}`);

    console.log('\n✅ Anthropic API is working correctly!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Anthropic API Error:');
    console.error(error);
    process.exit(1);
  }
}

testAnthropicAPI();
