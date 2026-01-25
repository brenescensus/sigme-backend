// backend/app/api/internal/process-journeys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { journeyProcessor } from '@/lib/journeys/processor';

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  
  if (auth !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  await journeyProcessor.processDueSteps();
  
  return NextResponse.json({ success: true });
}