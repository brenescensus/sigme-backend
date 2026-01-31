
// scripts/process-scheduled-steps.js
/**
 * Journey Processor Script for GitHub Actions
 * Calls the internal API endpoint to process scheduled journey steps
 */

const https = require('https');
const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL;
const API_KEY = process.env.INTERNAL_API_KEY;

console.log(' [Processor] Starting journey step processing...');
console.log(' [Processor] Environment check:');
console.log(`   - NEXT_PUBLIC_BACKEND_URL: ${BACKEND_URL ? ' Set' : ' NOT SET'}`);
console.log(`   - INTERNAL_API_KEY: ${API_KEY ? ' Set' : '  Optional (not set)'}`);

// Validate required environment variables
if (!BACKEND_URL) {
  console.error('\n [Processor] FATAL ERROR: NEXT_PUBLIC_BACKEND_URL is not set!');
  console.error('Please set this in your GitHub repository secrets:');
  console.error('  Settings > Secrets and variables > Actions > New repository secret');
  console.error('  Name: NEXT_PUBLIC_BACKEND_URL');
  console.error('  Value: https://your-backend-url.com');
  process.exit(1);
}

// Validate URL format
let url;
try {
  url = new URL(`${BACKEND_URL}/api/internal/process-journeys`);
  console.log(` [Processor] Target URL: ${url.href}`);
} catch (error) {
  console.error(`\n [Processor] Invalid BACKEND_URL: ${BACKEND_URL}`);
  console.error(`Error: ${error.message}`);
  process.exit(1);
}

// Check if using localhost (common mistake in production)
if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
  console.warn('\n  [Processor] WARNING: Using localhost URL!');
  console.warn('This will not work in GitHub Actions.');
  console.warn('Please set NEXT_PUBLIC_BACKEND_URL to your production URL.');
}

const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'x-api-key': API_KEY }),
  },
  timeout: 60000, // 60 second timeout
};

console.log('\n[Processor] Making request...');
console.log(`   - Protocol: ${isHttps ? 'HTTPS' : 'HTTP'}`);
console.log(`   - Host: ${options.hostname}`);
console.log(`   - Port: ${options.port}`);
console.log(`   - Path: ${options.path}`);

const req = client.request(options, (res) => {
  let data = '';

  console.log(`\n [Processor] Response received (HTTP ${res.statusCode})`);

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log(' [Processor] Success!');
        
        if (result.result) {
          const { processed, failed, skipped, total, duration_ms } = result.result;
          console.log(`\n📈 Summary:`);
          console.log(`   - Processed: ${processed || 0}`);
          console.log(`   - Failed: ${failed || 0}`);
          console.log(`   - Skipped: ${skipped || 0}`);
          console.log(`   - Total: ${total || 0}`);
          console.log(`   - Duration: ${duration_ms || 0}ms`);
          
          if (failed > 0 && result.result.errors) {
            console.log(`\n Errors:`);
            result.result.errors.forEach((err, idx) => {
              console.log(`   ${idx + 1}. ${err}`);
            });
          }
        } else {
          console.log(` [Processor] Response:`, JSON.stringify(result, null, 2));
        }
        
        process.exit(0);
      } else if (res.statusCode === 401) {
        console.error('\n [Processor] Unauthorized (401)');
        console.error('The INTERNAL_API_KEY may be incorrect or not set.');
        console.error('Response:', JSON.stringify(result, null, 2));
        process.exit(1);
      } else if (res.statusCode === 404) {
        console.error('\n [Processor] Not Found (404)');
        console.error('The API endpoint does not exist at this URL.');
        console.error('Expected: /api/internal/process-journeys');
        console.error('Response:', JSON.stringify(result, null, 2));
        process.exit(1);
      } else {
        console.error(`\n [Processor] HTTP ${res.statusCode}`);
        console.error('Response:', JSON.stringify(result, null, 2));
        process.exit(1);
      }
    } catch (error) {
      console.error('\n [Processor] Failed to parse JSON response');
      console.error('Raw response:', data.substring(0, 500));
      console.error('Parse error:', error.message);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('\n [Processor] Request failed');
  console.error(`Error: ${error.message}`);
  console.error(`Code: ${error.code}`);
  
  if (error.code === 'ENOTFOUND') {
    console.error('\nDNS lookup failed. The hostname could not be resolved.');
    console.error(`   Hostname: ${options.hostname}`);
  } else if (error.code === 'ECONNREFUSED') {
    console.error('\nConnection refused. The server is not responding.');
    console.error(`   URL: ${url.href}`);
  } else if (error.code === 'ETIMEDOUT') {
    console.error('\nConnection timeout. The server took too long to respond.');
  }
  
  process.exit(1);
});

req.on('timeout', () => {
  console.error('\n [Processor] Request timeout (60s)');
  console.error('The server did not respond within 60 seconds.');
  req.destroy();
  process.exit(1);
});

req.end();