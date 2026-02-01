// // app/api/internal/process-journeys/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { processDueSteps } from '@/lib/journeys/processor';

// /**
//  * POST /api/internal/process-journeys
//  * Manually trigger journey processor (for testing/debugging)
//  * Should be called by cron job or manually for testing
//  */
// export async function POST(req: NextRequest) {
//   try {
//     // Optional: Add API key check for security
//     const apiKey = req.headers.get('x-api-key');
//     const expectedKey = process.env.INTERNAL_API_KEY;
    
//     if (expectedKey && apiKey !== expectedKey) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     console.log(' [API] Manual journey processor trigger');

//     const result = await processDueSteps();

//     return NextResponse.json({
//       success: true,
//       message: 'Journey processor completed',
//       result,
//     });

//   } catch (error: any) {
//     console.error('[API] Error in POST /api/internal/process-journeys:', error);
//     return NextResponse.json({ 
//       success: false,
//       error: error.message 
//     }, { status: 500 });
//   }
// }

// // Allow GET for easy browser testing
// export async function GET(req: NextRequest) {
//   return POST(req);
// }


// export const dynamic = 'force-dynamic';
// export const revalidate = 0;








// app/api/internal/process-journeys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processDueSteps } from '@/lib/journeys/processor';

/**
 * Verify API key
 */
function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.INTERNAL_API_KEY;
  
  // In development, allow without API key
  if (process.env.NODE_ENV === 'development' && !expectedKey) {
    console.log('[API] Dev mode - no API key required');
    return true;
  }
  
  if (!expectedKey) {
    console.error('[API]  INTERNAL_API_KEY not set');
    return false;
  }
  
  const isValid = apiKey === expectedKey;
  if (!isValid) {
    console.error('[API]  Invalid API key');
  }
  
  return isValid;
}

/**
 * POST /api/internal/process-journeys
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(80));
  console.log('[API]  Journey Processor Started');
  console.log('='.repeat(80));
  
  try {
    // Verify API key
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check environment
    console.log('[API] Environment Check:');
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   - Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL }`);
    console.log(`   - Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY }`);
    console.log(`   - VAPID Public: ${process.env.VAPID_PUBLIC_KEY  }`);
    console.log(`   - VAPID Private: ${process.env.VAPID_PRIVATE_KEY }`);
    console.log(`   - VAPID Subject: ${process.env.VAPID_SUBJECT }`);
    
    // Process steps
    console.log('[API]  Processing due steps...');
    const result = await processDueSteps();
    
    const duration = Date.now() - startTime;
    
    console.log('[API] Complete!');
    console.log(`[API]  Results: Processed=${result.processed}, Failed=${result.failed}`);
    console.log(`[API]   Duration: ${duration}ms`);
    console.log('='.repeat(80) + '\n');
    
    return NextResponse.json({
      success: true,
      message: 'Journey processor completed',
      result: {
        ...result,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      }
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.error('[API]  ERROR:', error.message);
    console.error('[API] Stack:', error.stack);
    console.error('='.repeat(80) + '\n');
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/internal/process-journeys
 * Health check
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    service: 'journey-processor',
    timestamp: new Date().toISOString(),
    environment: {
      node_env: process.env.NODE_ENV,
      supabase_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      service_key_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      vapid_public_configured: !!process.env.VAPID_PUBLIC_KEY,
      vapid_private_configured: !!process.env.VAPID_PRIVATE_KEY,
      vapid_subject_configured: !!process.env.VAPID_SUBJECT,
      api_key_configured: !!process.env.INTERNAL_API_KEY,
    }
  });
}

//  CRITICAL: Disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;