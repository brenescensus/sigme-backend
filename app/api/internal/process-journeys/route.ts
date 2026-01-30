// app/api/internal/process-journeys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processDueSteps } from '@/lib/journeys/processor';

/**
 * POST /api/internal/process-journeys
 * Manually trigger journey processor (for testing/debugging)
 * Should be called by cron job or manually for testing
 */
export async function POST(req: NextRequest) {
  try {
    // Optional: Add API key check for security
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = process.env.INTERNAL_API_KEY;
    
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 [API] Manual journey processor trigger');

    const result = await processDueSteps();

    return NextResponse.json({
      success: true,
      message: 'Journey processor completed',
      result,
    });

  } catch (error: any) {
    console.error('[API] Error in POST /api/internal/process-journeys:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

// Allow GET for easy browser testing
export async function GET(req: NextRequest) {
  return POST(req);
}