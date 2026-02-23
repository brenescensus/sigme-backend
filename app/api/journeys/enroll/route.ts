// app/api/journeys/enroll/route.ts 
import { NextRequest, NextResponse } from 'next/server';
import { journeyProcessor } from '@/lib/journeys/processor';

export async function POST(req: NextRequest) {
  // Verify worker secret
  const auth = req.headers.get('Authorization');
  const expected = `Bearer ${process.env.WORKER_SECRET}`;
  
  if (auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { journeyId, subscriberId, context } = await req.json();

    if (!journeyId || !subscriberId) {
      return NextResponse.json({ error: 'Missing journeyId or subscriberId' }, { status: 400 });
    }

    console.log(`[Enroll API] Delayed enrollment: journey=${journeyId}, subscriber=${subscriberId}`);

    const result = await journeyProcessor.enrollSubscriber(journeyId, subscriberId, {
      ...context,
      delayed_enrollment: true,
      enrolled_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, stateId: result?.id });

  } catch (error: any) {
    // These are expected - not real errors
    if (error.message?.includes('already enrolled') || 
        error.message?.includes('cannot re-enter') ||
        error.message?.includes('not active')) {
      console.log(`[Enroll API] Skipped: ${error.message}`);
      return NextResponse.json({ success: false, reason: error.message });
    }

    console.error('[Enroll API] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}