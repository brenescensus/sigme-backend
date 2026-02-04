// app/api/journeys/[id]/analytics/route.ts - TypeScript Fixed
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/journeys/[id]/analytics
 * Get journey analytics
 * 
 *  FIXED: Proper null handling for TypeScript
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: journeyId } = await params;
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('range') || '7d';

    // Verify ownership
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('id, name, total_entered, total_active, total_completed')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    //  FIX: Extract values with null coalescing
    const totalEntered = journey.total_entered ?? 0;
    const totalActive = journey.total_active ?? 0;
    const totalCompleted = journey.total_completed ?? 0;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'all':
      default:
        startDate = new Date('2020-01-01');
    }

    // Get journey events for timeline
    const { data: events } = await supabase
      .from('journey_events')
      .select('event_type, created_at, step_id, metadata')
      .eq('journey_id', journeyId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Get user states for completion metrics
    const { data: userStates } = await supabase
      .from('user_journey_states')
      .select('status, entered_at, completed_at, exited_at, current_step_id')
      .eq('journey_id', journeyId)
      .gte('entered_at', startDate.toISOString());

    // Calculate analytics
    const analytics = {
      overview: {
        total_entered: totalEntered,
        total_active: totalActive,
        total_completed: totalCompleted,
        completion_rate: totalEntered > 0
          ? Math.round((totalCompleted / totalEntered) * 100)
          : 0,
      },
      timeline: generateTimeline(events || []),
      eventBreakdown: calculateEventBreakdown(events || []),
      averageCompletionTime: calculateAverageCompletionTime(userStates || []),
      stepPerformance: calculateStepPerformance(events || []),
      dropoffPoints: calculateDropoffPoints(userStates || []),
    };

    return NextResponse.json({
      success: true,
      analytics,
    });

  } catch (error: any) {
    console.error('[API] Error in GET /api/journeys/[id]/analytics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper functions
function generateTimeline(events: any[]) {
  const dailyStats: { [date: string]: { entered: number; completed: number; exited: number } } = {};

  events.forEach(event => {
    const date = event.created_at.split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { entered: 0, completed: 0, exited: 0 };
    }

    if (event.event_type === 'journey_entered') {
      dailyStats[date].entered++;
    } else if (event.event_type === 'journey_completed') {
      dailyStats[date].completed++;
    } else if (event.event_type === 'journey_exited') {
      dailyStats[date].exited++;
    }
  });

  return Object.entries(dailyStats).map(([date, stats]) => ({
    date,
    ...stats,
  }));
}

function calculateEventBreakdown(events: any[]) {
  const breakdown: { [key: string]: number } = {};

  events.forEach(event => {
    breakdown[event.event_type] = (breakdown[event.event_type] || 0) + 1;
  });

  return Object.entries(breakdown).map(([event_type, count]) => ({
    event_type,
    count,
  }));
}

function calculateAverageCompletionTime(userStates: any[]) {
  const completedStates = userStates.filter(
    state => state.completed_at && state.entered_at
  );

  if (completedStates.length === 0) return null;

  const totalTime = completedStates.reduce((sum, state) => {
    const entered = new Date(state.entered_at).getTime();
    const completed = new Date(state.completed_at).getTime();
    return sum + (completed - entered);
  }, 0);

  const averageMs = totalTime / completedStates.length;
  const averageHours = Math.round(averageMs / (1000 * 60 * 60));

  return {
    milliseconds: averageMs,
    hours: averageHours,
    formatted: formatDuration(averageMs),
  };
}

function calculateStepPerformance(events: any[]) {
  const stepStats: { 
    [stepId: string]: { 
      reached: number; 
      completed: number; 
      failed: number;
    } 
  } = {};

  events.forEach(event => {
    if (!event.step_id) return;

    if (!stepStats[event.step_id]) {
      stepStats[event.step_id] = { reached: 0, completed: 0, failed: 0 };
    }

    if (event.event_type === 'step_started' || event.event_type === 'notification_sent') {
      stepStats[event.step_id].reached++;
    } else if (event.event_type === 'step_completed') {
      stepStats[event.step_id].completed++;
    } else if (event.event_type === 'step_error') {
      stepStats[event.step_id].failed++;
    }
  });

  return Object.entries(stepStats).map(([step_id, stats]) => ({
    step_id,
    ...stats,
    success_rate: stats.reached > 0
      ? Math.round((stats.completed / stats.reached) * 100)
      : 0,
  }));
}

function calculateDropoffPoints(userStates: any[]) {
  const stepDropoffs: { [stepId: string]: number } = {};

  userStates
    .filter(state => state.status === 'exited' && state.current_step_id)
    .forEach(state => {
      stepDropoffs[state.current_step_id] = (stepDropoffs[state.current_step_id] || 0) + 1;
    });

  return Object.entries(stepDropoffs)
    .map(([step_id, dropoffs]) => ({ step_id, dropoffs }))
    .sort((a, b) => b.dropoffs - a.dropoffs);
}

function formatDuration(ms: number) {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}