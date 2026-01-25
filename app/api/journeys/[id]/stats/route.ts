// ============================================
// FILE: app/api/journeys/[id]/stats/route.ts
// Get journey statistics
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthUser } from '@/lib/auth-middleware';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleGetStats(
  req: NextRequest,
  user: AuthUser,
  { params }: { params: { id: string } }
) {
  try {
    // Verify ownership
    const { data: journey } = await supabase
      .from('journeys')
      .select('*, websites!inner(user_id)')
      .eq('id', params.id)
      .single();

    const journeyData = journey as any;

    if (!journey || journeyData.websites?.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Journey not found' },
        { status: 404 }
      );
    }

    // Get journey events for analytics
    const { data: events, error: eventsError } = await supabase
      .from('journey_events')
      .select('event_type, created_at')
      .eq('journey_id', params.id);

    if (eventsError) throw eventsError;

    // Calculate stats
    const stats = {
      total_entered: journey.total_entered || 0,
      total_active: journey.total_active || 0,
      total_completed: journey.total_completed || 0,
      completion_rate: journey.total_entered 
        ? ((journey.total_completed || 0) / journey.total_entered * 100).toFixed(1)
        : '0',
      events_by_type: events?.reduce((acc: Record<string, number>, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {}),
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('[Journeys] Stats error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetStats);