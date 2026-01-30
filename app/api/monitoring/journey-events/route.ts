// app/api/monitoring/journey-events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/monitoring/journey-events
 * Get journey events
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || '1h';
    const limit = parseInt(searchParams.get('limit') || '100');

    const since = getTimeRangeDate(timeRange);

    // Get user's journeys
    const { data: userJourneys } = await supabase
      .from('journeys')
      .select('id')
      .eq('user_id', user.id);

    const journeyIds = userJourneys?.map(j => j.id) || [];

    if (journeyIds.length === 0) {
      return NextResponse.json({
        success: true,
        events: [],
        total: 0,
      });
    }

    // Get journey events
    const { data: events, error } = await supabase
      .from('journey_events')
      .select('*')
      .in('journey_id', journeyIds)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[API] Error fetching events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      events: events || [],
      total: events?.length || 0,
      timeRange,
    });

  } catch (error: any) {
    console.error('[API] Error in GET /api/monitoring/journey-events:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getTimeRangeDate(range: string): Date {
  const now = new Date();
  switch (range) {
    case '15m': return new Date(now.getTime() - 15 * 60 * 1000);
    case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
    case '6h': return new Date(now.getTime() - 6 * 60 * 60 * 1000);
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    default: return new Date(now.getTime() - 60 * 60 * 1000);
  }
}