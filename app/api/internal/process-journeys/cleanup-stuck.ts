// pages/api/internal/cleanup-stuck.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/internal/cleanup-stuck - Cleanup stuck journey states
 * This will find and fix journey states that are stuck or have errors
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
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
    console.log('🧹 [Internal] Cleanup stuck journeys triggered by:', user.id);

    const results = {
      stuck_waiting: 0,
      old_active: 0,
      failed_steps: 0,
      orphaned_states: 0,
    };

    // 1. Find journey states stuck in "waiting" for too long (>7 days past next_execution_at)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: stuckWaiting } = await supabase
      .from('user_journey_states')
      .select('id, journey_id, subscriber_id')
      .eq('status', 'waiting')
      .lt('next_execution_at', sevenDaysAgo.toISOString());

    if (stuckWaiting && stuckWaiting.length > 0) {
      console.log(`📍 Found ${stuckWaiting.length} stuck waiting states`);
      
      for (const state of stuckWaiting) {
        // Mark as exited
        await supabase
          .from('user_journey_states')
          .update({
            status: 'exited',
            exit_reason: 'cleanup_timeout',
            exited_at: new Date().toISOString(),
          })
          .eq('id', state.id);

        // Log event
        await supabase.from('journey_events').insert({
          journey_id: state.journey_id,
          subscriber_id: state.subscriber_id,
          user_journey_state_id: state.id,
          event_type: 'journey_exited',
          metadata: { reason: 'cleanup_timeout', automatic: true } as any,
        });

        results.stuck_waiting++;
      }
    }

    // 2. Find active states that haven't been processed in 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: oldActive } = await supabase
      .from('user_journey_states')
      .select('id, journey_id, subscriber_id, last_processed_at')
      .eq('status', 'active')
      .lt('last_processed_at', twentyFourHoursAgo.toISOString());

    if (oldActive && oldActive.length > 0) {
      console.log(`📍 Found ${oldActive.length} old active states`);
      
      for (const state of oldActive) {
        // Try to reprocess or mark as stuck
        await supabase
          .from('user_journey_states')
          .update({
            status: 'exited',
            exit_reason: 'cleanup_stale',
            exited_at: new Date().toISOString(),
          })
          .eq('id', state.id);

        await supabase.from('journey_events').insert({
          journey_id: state.journey_id,
          subscriber_id: state.subscriber_id,
          user_journey_state_id: state.id,
          event_type: 'journey_exited',
          metadata: { reason: 'cleanup_stale', automatic: true } as any,
        });

        results.old_active++;
      }
    }

    // 3. Clean up failed scheduled steps (older than 7 days)
    const { data: failedSteps } = await supabase
      .from('scheduled_journey_steps')
      .select('id')
      .eq('status', 'failed')
      .lt('created_at', sevenDaysAgo.toISOString());

    if (failedSteps && failedSteps.length > 0) {
      console.log(`📍 Found ${failedSteps.length} failed steps to clean`);
      
      const { error: deleteError } = await supabase
        .from('scheduled_journey_steps')
        .delete()
        .in('id', failedSteps.map(s => s.id));

      if (!deleteError) {
        results.failed_steps = failedSteps.length;
      }
    }

    // 4. Find orphaned journey states (journey no longer exists)
    const { data: allStates } = await supabase
      .from('user_journey_states')
      .select('id, journey_id')
      .in('status', ['active', 'waiting'])
      .limit(1000);

    if (allStates && allStates.length > 0) {
      const journeyIds = [...new Set(allStates.map(s => s.journey_id))];
      
      const { data: existingJourneys } = await supabase
        .from('journeys')
        .select('id')
        .in('id', journeyIds);

      const existingIds = new Set(existingJourneys?.map(j => j.id) || []);
      
      const orphaned = allStates.filter(s => !existingIds.has(s.journey_id));
      
      if (orphaned.length > 0) {
        console.log(`📍 Found ${orphaned.length} orphaned states`);
        
        await supabase
          .from('user_journey_states')
          .update({
            status: 'exited',
            exit_reason: 'cleanup_orphaned',
            exited_at: new Date().toISOString(),
          })
          .in('id', orphaned.map(s => s.id));

        results.orphaned_states = orphaned.length;
      }
    }

    // 5. Recalculate journey counters
    const { data: journeys } = await supabase
      .from('journeys')
      .select('id')
      .eq('status', 'active');

    if (journeys) {
      for (const journey of journeys) {
        // Count active users
        const { count: activeCount } = await supabase
          .from('user_journey_states')
          .select('id', { count: 'exact', head: true })
          .eq('journey_id', journey.id)
          .in('status', ['active', 'waiting']);

        // Update counter
        await supabase
          .from('journeys')
          .update({ total_active: activeCount || 0 })
          .eq('id', journey.id);
      }
    }

    console.log('✅ [Internal] Cleanup complete:', results);

    return res.status(200).json({
      success: true,
      message: 'Cleanup completed successfully',
      cleaned: results,
    });

  } catch (error: any) {
    console.error('❌ [Internal] Cleanup error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to cleanup stuck journeys',
      details: error.stack,
    });
  }
}