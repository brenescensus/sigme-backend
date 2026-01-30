// app/api/monitoring/execution-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/monitoring/execution-logs
 * Get journey execution logs with filtering
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
    const filter = searchParams.get('filter') || 'all';
    const limit = parseInt(searchParams.get('limit') || '100');

    const since = getTimeRangeDate(timeRange);

    // Build query
    let query = supabase
      .from('journey_execution_logs')
      .select(`
        *,
        journey:journeys!journey_execution_logs_journey_id_fkey(
          id,
          name,
          user_id
        )
      `)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (filter === 'errors') {
      query = query.or('event_type.ilike.%error%,event_type.ilike.%failed%');
    } else if (filter === 'success') {
      query = query.or('event_type.ilike.%completed%,event_type.ilike.%sent%');
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('[API] Error fetching logs:', error);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    // Filter logs to only show user's journeys
    const userLogs = logs?.filter(log => 
      !log.journey || log.journey.user_id === user.id
    ) || [];

    return NextResponse.json({
      success: true,
      logs: userLogs,
      total: userLogs.length,
      timeRange,
      filter,
    });

  } catch (error: any) {
    console.error('[API] Error in GET /api/monitoring/execution-logs:', error);
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