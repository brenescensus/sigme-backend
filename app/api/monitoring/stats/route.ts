// app/api/monitoring/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/monitoring/stats
 * Get processor statistics
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

    const since = getTimeRangeDate(timeRange);

    // Get user's journeys
    const { data: userJourneys } = await supabase
      .from('journeys')
      .select('id')
      .eq('user_id', user.id);

    const journeyIds = userJourneys?.map(j => j.id) || [];

    // Get execution logs for stats
    const { data: logs } = await supabase
      .from('journey_execution_logs')
      .select('event_type, journey_id')
      .in('journey_id', journeyIds)
      .gte('created_at', since.toISOString());

    const totalLogs = logs?.length || 0;
    const errors = logs?.filter(l => 
      l.event_type.includes('error') || l.event_type.includes('failed')
    ).length || 0;
    const success = logs?.filter(l => 
      l.event_type.includes('completed') || l.event_type.includes('sent')
    ).length || 0;

    // Get scheduled steps stats
    const { data: steps } = await supabase
      .from('scheduled_journey_steps')
      .select('status, user_journey_state:user_journey_states!scheduled_journey_steps_user_journey_state_id_fkey(journey_id)')
      .in('user_journey_state.journey_id', journeyIds);

    const userSteps = steps?.filter(s => 
      s.user_journey_state && journeyIds.includes((s.user_journey_state as any).journey_id)
    ) || [];

    const pending = userSteps.filter(s => s.status === 'pending').length;
    const processing = userSteps.filter(s => s.status === 'processing').length;
    const failed = userSteps.filter(s => s.status === 'failed').length;

    return NextResponse.json({
      success: true,
      stats: {
        totalLogs,
        errors,
        success,
        pending,
        processing,
        failed,
      },
      timeRange,
    });

  } catch (error: any) {
    console.error('[API] Error in GET /api/monitoring/stats:', error);
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