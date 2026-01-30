// app/api/monitoring/scheduled-steps/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/monitoring/scheduled-steps
 * Get scheduled journey steps
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
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get user's journeys first
    const { data: userJourneys } = await supabase
      .from('journeys')
      .select('id')
      .eq('user_id', user.id);

    const journeyIds = userJourneys?.map(j => j.id) || [];

    if (journeyIds.length === 0) {
      return NextResponse.json({
        success: true,
        steps: [],
        total: 0,
      });
    }

    // Build query for scheduled steps
    let query = supabase
      .from('scheduled_journey_steps')
      .select(`
        *,
        user_journey_state:user_journey_states!scheduled_journey_steps_user_journey_state_id_fkey(
          journey_id,
          subscriber_id
        )
      `)
      .order('execute_at', { ascending: false })
      .limit(limit);

    // Filter by status if not 'all'
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: allSteps, error } = await query;

    if (error) {
      console.error('[API] Error fetching scheduled steps:', error);
      return NextResponse.json({ error: 'Failed to fetch scheduled steps' }, { status: 500 });
    }

    // Filter to only steps from user's journeys
    const userSteps = allSteps?.filter(step => 
      step.user_journey_state && journeyIds.includes(step.user_journey_state.journey_id)
    ) || [];

    return NextResponse.json({
      success: true,
      steps: userSteps,
      total: userSteps.length,
      statusFilter: status,
    });

  } catch (error: any) {
    console.error('[API] Error in GET /api/monitoring/scheduled-steps:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}