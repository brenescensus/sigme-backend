// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// /**
//  * GET /api/internal/metrics
//  * Get journey processing metrics
//  */
// export async function GET(req: NextRequest) {
//   try {
//     // 🔐 Optional internal API key protection
//     const apiKey = req.headers.get('x-api-key');
//     const expectedKey = process.env.INTERNAL_API_KEY;

//     if (expectedKey && apiKey !== expectedKey) {
//       return NextResponse.json(
//         { error: 'Unauthorized' },
//         { status: 401 }
//       );
//     }

//     const supabase = createClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.SUPABASE_SERVICE_ROLE_KEY!
//     );

//     /* ----------------------------------------
//        1️⃣ Journeys by status
//     ---------------------------------------- */
//     const { data: journeys } = await supabase
//       .from('journeys')
//       .select('status');

//     const journeyStats = journeys?.reduce(
//       (acc: Record<string, number>, j) => {
//         acc[j.status] = (acc[j.status] || 0) + 1;
//         acc.total++;
//         return acc;
//       },
//       { total: 0 }
//     ) || { total: 0 };

//     /* ----------------------------------------
//        2️⃣ Journey states by status
//     ---------------------------------------- */
//     const { data: states } = await supabase
//       .from('user_journey_states')
//       .select('status');

//     const stateStats = states?.reduce(
//       (acc: Record<string, number>, s) => {
//         acc[s.status] = (acc[s.status] || 0) + 1;
//         acc.total++;
//         return acc;
//       },
//       { total: 0 }
//     ) || { total: 0 };

//     /* ----------------------------------------
//        3️⃣ Scheduled steps by status
//     ---------------------------------------- */
//     const { data: steps } = await supabase
//       .from('scheduled_journey_steps')
//       .select('status');

//     const stepStats = steps?.reduce(
//       (acc: Record<string, number>, s) => {
//         acc[s.status] = (acc[s.status] || 0) + 1;
//         acc.total++;
//         return acc;
//       },
//       { total: 0 }
//     ) || { total: 0 };

//     /* ----------------------------------------
//        4️⃣ Due steps (pending & executable now)
//     ---------------------------------------- */
//     const { count: dueSteps } = await supabase
//       .from('scheduled_journey_steps')
//       .select('id', { count: 'exact', head: true })
//       .eq('status', 'pending')
//       .lte('execute_at', new Date().toISOString());

//     return NextResponse.json({
//       success: true,
//       metrics: {
//         journeys: journeyStats,
//         journey_states: stateStats,
//         scheduled_steps: stepStats,
//         due_steps: dueSteps || 0,
//         timestamp: new Date().toISOString(),
//       },
//     });

//   } catch (error: any) {
//     console.error('[API] Metrics error:', error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message || 'Internal server error',
//       },
//       { status: 500 }
//     );
//   }
// }

// /**
//  * Optional health check
//  */
// export async function HEAD() {
//   return new NextResponse(null, { status: 200 });
// }






// app/api/internal/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Metrics] Fetching processor metrics...');

    // Get current time
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Count pending scheduled steps
    const { data: pendingSteps, error: pendingError } = await supabase
      .from('scheduled_journey_steps')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (pendingError) {
      console.error('❌ [Metrics] Error counting pending steps:', pendingError);
    }

    // Count active journeys
    const { data: activeJourneys, error: journeysError } = await supabase
      .from('journeys')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    if (journeysError) {
      console.error('❌ [Metrics] Error counting active journeys:', journeysError);
    }

    // Get last processor run (from execution logs)
    const { data: lastRun } = await supabase
      .from('journey_execution_logs')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Count active journey states
    const { data: activeStates, error: statesError } = await supabase
      .from('user_journey_states')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'waiting']);

    if (statesError) {
      console.error('❌ [Metrics] Error counting active states:', statesError);
    }

    // Count recent errors (last hour)
    const { data: recentErrors, error: errorsError } = await supabase
      .from('journey_execution_logs')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'error')
      .gte('created_at', oneHourAgo.toISOString());

    if (errorsError) {
      console.error('❌ [Metrics] Error counting errors:', errorsError);
    }

    const metrics = {
      success: true,
      processor_running: true, // Always true if API is responding
      pending_steps: pendingSteps?.length || 0,
      active_journeys: activeJourneys?.length || 0,
      active_states: activeStates?.length || 0,
      last_run: lastRun?.created_at || null,
      recent_errors: recentErrors?.length || 0,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ [Metrics] Returning metrics:', metrics);

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });

  } catch (error: any) {
    console.error('❌ [Metrics] Fatal error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch metrics',
        processor_running: false,
      },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}