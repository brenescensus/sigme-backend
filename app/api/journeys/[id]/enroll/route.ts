// app/api/journeys/[id]/enroll/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { enrollSubscriber } from '@/lib/journeys/processor';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/journeys/[id]/enroll
 * Manually enroll a subscriber in a journey
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Note: params is a Promise now
) {
  try {
    // Await the params first
    const { id: journeyId } = await params;
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subscriber_id, context } = body;

    if (!subscriber_id) {
      return NextResponse.json({ error: 'subscriber_id is required' }, { status: 400 });
    }

    // Verify journey ownership
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('id, status, website_id')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    if (journey.status !== 'active') {
      return NextResponse.json({
        error: `Journey must be active to enroll subscribers (current status: ${journey.status})`
      }, { status: 400 });
    }

    // Verify subscriber exists and belongs to journey's website
    const { data: subscriber, error: subscriberError } = await supabase
      .from('subscribers')
      .select('id, website_id')
      .eq('id', subscriber_id)
      .eq('website_id', journey.website_id)
      .single();

    if (subscriberError || !subscriber) {
      return NextResponse.json({
        error: 'Subscriber not found or does not belong to this journey\'s website'
      }, { status: 404 });
    }

    // Enroll subscriber using processor
    const journeyState = await enrollSubscriber(journeyId, subscriber_id, {
      ...context,
      manual_enrollment: true,
      enrolled_by: user.email,
      enrollment_timestamp: new Date().toISOString(),
    });

    if (!journeyState) {
      return NextResponse.json({
        error: 'Could not enroll subscriber. May not meet re-entry criteria or other enrollment conditions.'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      journey_state: {
        id: journeyState.id,
        status: journeyState.status,
        current_step_id: journeyState.current_step_id,
        entered_at: journeyState.entered_at,
      },
      message: 'Subscriber enrolled successfully',
    });

  } catch (error: any) {
    console.error('[API] Error in POST /api/journeys/[id]/enroll:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}