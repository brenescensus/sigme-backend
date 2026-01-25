// // // backend/app/api/internal/process-journeys/route.ts
// // import { NextRequest, NextResponse } from 'next/server';
// // import { journeyProcessor } from '@/lib/journeys/processor';

// // export async function POST(request: NextRequest) {
// //   const auth = request.headers.get('authorization');
  
// //   if (auth !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
// //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// //   }
  
// //   await journeyProcessor.processDueSteps();
  
// //   return NextResponse.json({ success: true });
// // }

// // app/api/internal/process-journeys/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { journeyProcessor } from '@/lib/journeys/processor';

// // Disable caching for this endpoint
// export const dynamic = 'force-dynamic';
// export const revalidate = 0;

// export async function POST(request: NextRequest) {
//   const startTime = Date.now();
  
//   try {
//     console.log('🚀 [Journey Processor] Request received');
    
//     // Verify authorization
//     const auth = request.headers.get('authorization');
//     const expectedAuth = `Bearer ${process.env.INTERNAL_API_KEY}`;
    
//     if (!process.env.INTERNAL_API_KEY) {
//       console.error('❌ [Journey Processor] INTERNAL_API_KEY not configured');
//       return NextResponse.json(
//         { 
//           success: false, 
//           error: 'Internal API key not configured' 
//         },
//         { status: 500 }
//       );
//     }
    
//     if (auth !== expectedAuth) {
//       console.error('❌ [Journey Processor] Unauthorized access attempt');
//       return NextResponse.json(
//         { 
//           success: false, 
//           error: 'Unauthorized' 
//         },
//         { status: 401 }
//       );
//     }
    
//     console.log('✅ [Journey Processor] Authorization verified');
    
//     // Process journeys
//     const result = await journeyProcessor.processDueSteps();
    
//     const duration = Date.now() - startTime;
    
//     console.log(`✅ [Journey Processor] Completed in ${duration}ms`);
    
//     return NextResponse.json({
//       success: true,
//       stats: {
//         processed: result?.processed || 0,
//         failed: result?.failed || 0,
//         duration_ms: duration,
//         timestamp: new Date().toISOString(),
//       }
//     });
    
//   } catch (error: any) {
//     const duration = Date.now() - startTime;
    
//     console.error('💥 [Journey Processor] Error:', error);
    
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message || 'Unknown error',
//         duration_ms: duration,
//         timestamp: new Date().toISOString(),
//       },
//       { status: 500 }
//     );
//   }
// }

// // Optional: Add GET for health check
// export async function GET(request: NextRequest) {
//   const auth = request.headers.get('authorization');
//   const expectedAuth = `Bearer ${process.env.INTERNAL_API_KEY}`;
  
//   if (auth !== expectedAuth) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//   }
  
//   return NextResponse.json({
//     status: 'healthy',
//     endpoint: '/api/internal/process-journeys',
//     methods: ['POST'],
//     timestamp: new Date().toISOString(),
//   });
// }


// app/api/internal/process-journeys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { journeyProcessor } from '@/lib/journeys/processor';

// Disable caching for this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 [Journey Processor] Request received');
    
    // Verify authorization
    const auth = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.INTERNAL_API_KEY}`;
    
    if (!process.env.INTERNAL_API_KEY) {
      console.error('❌ [Journey Processor] INTERNAL_API_KEY not configured');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Internal API key not configured',
          processed: 0,
          failed: 0,
          skipped: 0,
          total: 0
        },
        { status: 500 }
      );
    }
    
    if (auth !== expectedAuth) {
      console.error('❌ [Journey Processor] Unauthorized access attempt');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized',
          processed: 0,
          failed: 0,
          skipped: 0,
          total: 0
        },
        { status: 401 }
      );
    }
    
    console.log('✅ [Journey Processor] Authorization verified');
    
    // Process journeys
    const result = await journeyProcessor.processDueSteps();
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ [Journey Processor] Completed in ${duration}ms`);
    console.log(`📊 [Journey Processor] Stats:`, result);
    
    return NextResponse.json({
      success: true,
      processed: result?.processed || 0,
      failed: result?.failed || 0,
      skipped: result?.skipped || 0,
      total: result?.total || 0,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.error('💥 [Journey Processor] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        processed: 0,
        failed: 0,
        skipped: 0,
        total: 0,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET for health check
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.INTERNAL_API_KEY}`;
  
  if (auth !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/internal/process-journeys',
    methods: ['POST', 'GET'],
    timestamp: new Date().toISOString(),
  });
}