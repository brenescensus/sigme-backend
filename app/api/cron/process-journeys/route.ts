import { NextRequest, NextResponse } from 'next/server';
import { journeyExecutor } from '@/lib/services/JourneyExecutor';

/**
 * Cron endpoint to process active journeys
 * This should be called every minute by a cron service (Vercel Cron, etc.)
 * 
 * GET /api/cron/process-journeys
 */
export async function GET(request: NextRequest) {
  try {
    // Security: Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting journey processing...');
    const startTime = Date.now();

    // Process all active journeys
    await journeyExecutor.processActiveJourneys();

    const duration = Date.now() - startTime;
    console.log(`[Cron] Journey processing completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Journeys processed successfully',
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron] Error processing journeys:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process journeys',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// For local development/testing - manual trigger
export async function POST(request: NextRequest) {
  try {
    console.log('[Manual Trigger] Processing journeys...');
    
    await journeyExecutor.processActiveJourneys();

    return NextResponse.json({
      success: true,
      message: 'Journeys processed (manual trigger)'
    });
  } catch (error) {
    console.error('[Manual Trigger] Error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Processing failed' },
      { status: 500 }
    );
  }
}