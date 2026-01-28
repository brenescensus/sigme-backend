export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } //  params is a Promise
) {
  try {
    const params = await context.params; //  Await params first
    const { id } = params;
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const eventName = searchParams.get('event_name');

    let query = supabase
      .from('subscriber_events')
      .select('*')
      .eq('subscriber_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventName) {
      query = query.eq('event_name', eventName);
    }

    const { data: events, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      events: events || [],
    });
  } catch (error) {
    console.error('[Events] Error fetching events:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch events',
      },
      { status: 500 }
    );
  }
}