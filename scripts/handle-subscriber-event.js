// scripts/handle-subscriber-event.js
/**
 * Handle Subscriber Event
 * Processes individual subscriber events triggered by webhooks
 * Called by GitHub Actions on repository_dispatch events
 */

const https = require('https');
const http = require('http');

// Get arguments from command line
const [subscriberId, eventName, eventDataJson] = process.argv.slice(2);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

console.log('📨 [Event Handler] Processing subscriber event...');
console.log(`👤 [Event Handler] Subscriber: ${subscriberId}`);
console.log(`🎯 [Event Handler] Event: ${eventName}`);

// Validate inputs
if (!subscriberId || !eventName) {
  console.error('❌ [Event Handler] Missing required arguments: subscriber_id and event_name');
  console.error('Usage: node handle-subscriber-event.js <subscriber_id> <event_name> [event_data_json]');
  process.exit(1);
}

// Parse event data
let eventData = {};
try {
  if (eventDataJson) {
    eventData = JSON.parse(eventDataJson);
    console.log(`📋 [Event Handler] Event data:`, eventData);
  }
} catch (error) {
  console.error('❌ [Event Handler] Failed to parse event_data JSON:', error.message);
  process.exit(1);
}

// Prepare request body
const requestBody = JSON.stringify({
  subscriber_id: subscriberId,
  event_name: eventName,
  event_data: eventData,
});

// Parse URL
const url = new URL(`${APP_URL}/api/events/subscriber`);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody),
  },
  timeout: 30000, // 30 second timeout
};

console.log(`📍 [Event Handler] Sending to: ${APP_URL}/api/events/subscriber`);

const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log(' [Event Handler] Event processed successfully');
        console.log(`📊 [Event Handler] Result:`, JSON.stringify(result, null, 2));
        
        if (result.triggered_journeys) {
          console.log(`\n🚀 Triggered ${result.triggered_journeys.length} journey(s):`);
          result.triggered_journeys.forEach((journey, idx) => {
            console.log(`   ${idx + 1}. ${journey.journey_name || journey.journey_id}`);
          });
        }
        
        if (result.advanced_users) {
          console.log(`\n⏭️  Advanced ${result.advanced_users.length} user(s) in existing journeys`);
        }
        
        process.exit(0);
      } else {
        console.error(`❌ [Event Handler] HTTP ${res.statusCode}:`, result);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ [Event Handler] Failed to parse response:', data);
      console.error('Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ [Event Handler] Request failed:', error.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ [Event Handler] Request timeout');
  req.destroy();
  process.exit(1);
});

// Send request
req.write(requestBody);
req.end();