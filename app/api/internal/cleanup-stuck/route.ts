// // app/api/internal/cleanup-stuck/route.ts
// /**
//  * POST /api/internal/cleanup-stuck
//  * Cleanup stuck journeys and stale scheduled steps
//  */


// import { NextRequest, NextResponse } from 'next/server';
// import { processDueSteps } from '@/lib/journeys/processor';

// export async function POST_CLEANUP(req: NextRequest) {
//   try {
//     const apiKey = req.headers.get('x-api-key');
//     const expectedKey = process.env.INTERNAL_API_KEY;
    
//     if (expectedKey && apiKey !== expectedKey) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { createClient } = await import('@supabase/supabase-js');
//     const supabase = createClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.SUPABASE_SERVICE_ROLE_KEY!
//     );

//     console.log('🧹 [API] Cleaning up stuck journeys');

//     const now = new Date();
//     const stuckThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

//     // Find stuck active states (not processed in 24 hours)
//     const { data: stuckStates } = await supabase
//       .from('user_journey_states')
//       .select('id, journey_id, subscriber_id, last_processed_at')
//       .eq('status', 'active')
//       .lt('last_processed_at', stuckThreshold.toISOString());

//     let clearedStates = 0;
//     if (stuckStates && stuckStates.length > 0) {
//       console.log(`Found ${stuckStates.length} stuck states`);
      
//       for (const state of stuckStates) {
//         // Mark as exited with reason
//         await supabase
//           .from('user_journey_states')
//           .update({
//             status: 'exited',
//             exit_reason: 'stuck_state_cleanup',
//             completed_at: now.toISOString(),
//           })
//           .eq('id', state.id);

//         // Decrement active count
//         await supabase
//           .from('journeys')
//           .update({
//             total_active: supabase.rpc('GREATEST', {
//               a: 'total_active - 1',
//               b: 0,
//             }),
//           })
//           .eq('id', state.journey_id);

//         clearedStates++;
//       }
//     }

//     // Cancel stale scheduled steps (past execute_at by more than 1 hour)
//     const staleThreshold = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    
//     const { data: staleSteps, error: stepsError } = await supabase
//       .from('scheduled_journey_steps')
//       .update({
//         status: 'cancelled',
//         error: 'Stale step - missed execution window',
//         completed_at: now.toISOString(),
//       })
//       .eq('status', 'pending')
//       .lt('execute_at', staleThreshold.toISOString())
//       .select('id');

//     const cancelledSteps = staleSteps?.length || 0;

//     // Cleanup old completed steps (older than 30 days)
//     const { data: deleted } = await supabase
//       .rpc('cleanup_old_scheduled_steps');

//     return NextResponse.json({
//       success: true,
//       message: 'Cleanup completed',
//       result: {
//         stuck_states_cleared: clearedStates,
//         stale_steps_cancelled: cancelledSteps,
//         old_steps_deleted: deleted || 0,
//       },
//     });

//   } catch (error: any) {
//     console.error('[API] Error in POST /api/internal/cleanup-stuck:', error);
//     return NextResponse.json({ 
//       success: false,
//       error: error.message 
//     }, { status: 500 });
//   }
// }







import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/internal/cleanup-stuck
 * Cleanup stuck journeys and stale scheduled steps
 */
export async function POST(req: NextRequest) {
  try {
    // 🔐 API key protection
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🧹 [API] Cleaning up stuck journeys');

    const now = new Date();

    /* -----------------------------------------
       1️⃣ Cleanup stuck active journey states
    ----------------------------------------- */
    const stuckThreshold = new Date(
      now.getTime() - 24 * 60 * 60 * 1000 // 24 hours
    );

    const { data: stuckStates } = await supabase
      .from('user_journey_states')
      .select('id, journey_id')
      .eq('status', 'active')
      .lt('last_processed_at', stuckThreshold.toISOString());

    let clearedStates = 0;

    if (stuckStates?.length) {
      for (const state of stuckStates) {
        await supabase
          .from('user_journey_states')
          .update({
            status: 'exited',
            exit_reason: 'stuck_state_cleanup',
            completed_at: now.toISOString(),
          })
          .eq('id', state.id);

        clearedStates++;
      }
    }

    /* -----------------------------------------
       2️⃣ Cancel stale scheduled steps
    ----------------------------------------- */
    const staleThreshold = new Date(
      now.getTime() - 60 * 60 * 1000 // 1 hour
    );

    const { data: staleSteps } = await supabase
      .from('scheduled_journey_steps')
      .update({
        status: 'cancelled',
        error: 'Stale step - missed execution window',
        completed_at: now.toISOString(),
      })
      .eq('status', 'pending')
      .lt('execute_at', staleThreshold.toISOString())
      .select('id');

    const cancelledSteps = staleSteps?.length || 0;

    /* -----------------------------------------
       3️⃣ Cleanup old completed steps
    ----------------------------------------- */
    const { data: deleted } = await supabase
      .rpc('cleanup_old_scheduled_steps');

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      result: {
        stuck_states_cleared: clearedStates,
        stale_steps_cancelled: cancelledSteps,
        old_steps_deleted: deleted || 0,
      },
    });

  } catch (error: any) {
    console.error('[API] Cleanup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Optional GET – health check
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
