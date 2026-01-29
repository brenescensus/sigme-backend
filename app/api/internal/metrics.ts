// pages/api/internal/metrics.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/internal/metrics - Get journey processing metrics
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract user ID from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Get system-wide journey metrics
    
    // 1. Total journeys by status
    const { data: journeyStats } = await supabase
      .from('journeys')
      .select('status')
      .eq('user_id', user.id);

    const statusCounts = journeyStats?.reduce((acc: any, j: any) => {
      acc[j.status] = (acc[j.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // 2. Active journey states
    const { count: activeStates } = await supabase
      .from('user_journey_states')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: waitingStates } = await supabase
      .from('user_journey_states')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'waiting');

    const { count: completedStates } = await supabase
      .from('user_journey_states')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');

    // 3. Scheduled steps
    const { count: pendingSteps } = await supabase
      .from('scheduled_journey_steps')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: processingSteps } = await supabase
      .from('scheduled_journey_steps')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'processing');

    const { count: failedSteps } = await supabase
      .from('scheduled_journey_steps')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed');

    // 4. Due steps (should be processed)
    const now = new Date().toISOString();
    const { count: dueSteps } = await supabase
      .from('scheduled_journey_steps')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('execute_at', now);

    // 5. Recent events (last hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: recentEvents } = await supabase
      .from('journey_events')
      .select('event_type')
      .gte('created_at', oneHourAgo.toISOString());

    const eventCounts = recentEvents?.reduce((acc: any, e: any) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    }, {}) || {};

    // 6. Error states (states with high retry count)
    const { data: errorStates } = await supabase
      .from('user_journey_states')
      .select('id, retry_count, last_error')
      .gt('retry_count', 3)
      .limit(10);

    // 7. Performance metrics (if available)
    const { data: performanceData } = await supabase
      .from('journey_step_performance')
      .select('avg_processing_time_ms')
      .limit(100);

    const avgProcessingTime = performanceData && performanceData.length > 0
      ? performanceData.reduce((sum, p) => sum + (p.avg_processing_time_ms || 0), 0) / performanceData.length
      : null;

    const metrics = {
      journeys: {
        total: journeyStats?.length || 0,
        by_status: statusCounts,
      },
      
      user_states: {
        active: activeStates || 0,
        waiting: waitingStates || 0,
        completed: completedStates || 0,
        total: (activeStates || 0) + (waitingStates || 0) + (completedStates || 0),
      },
      
      scheduled_steps: {
        pending: pendingSteps || 0,
        processing: processingSteps || 0,
        failed: failedSteps || 0,
        due_now: dueSteps || 0,
      },
      
      recent_activity: {
        last_hour_events: recentEvents?.length || 0,
        event_breakdown: eventCounts,
      },
      
      health: {
        error_states_count: errorStates?.length || 0,
        error_states: errorStates || [],
        avg_processing_time_ms: avgProcessingTime ? Math.round(avgProcessingTime) : null,
      },
      
      system_status: {
        healthy: (failedSteps || 0) < 10 && (dueSteps || 0) < 100,
        needs_attention: (dueSteps || 0) > 50 || (failedSteps || 0) > 5,
        critical: (dueSteps || 0) > 100 || (failedSteps || 0) > 20,
      },
      
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      metrics,
    });

  } catch (error: any) {
    console.error('❌ [Internal] Metrics error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch metrics',
    });
  }
}