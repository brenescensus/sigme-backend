// // app/api/journeys/[id]/analytics/history/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';
// import { verifyToken } from '@/lib/auth-middleware';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
//   {
//     auth: {
//       autoRefreshToken: false,
//       persistSession: false,
//     },
//   }
// );

// export async function GET(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     // Authenticate user
//     const user = await verifyToken(request);
//     if (!user) {
//       return NextResponse.json(
//         { success: false, error: 'Unauthorized' },
//         { status: 401 }
//       );
//     }

//     const journeyId = params.id;
//     const { searchParams } = new URL(request.url);
//     const period = searchParams.get('period') || '30d';

//     console.log('[Journey Analytics] Getting history for journey:', journeyId);
//     console.log('[Journey Analytics] Period:', period);

//     // Verify user owns this journey
//     const { data: journey, error: journeyError } = await supabase
//       .from('journeys')
//       .select('id, user_id, name')
//       .eq('id', journeyId)
//       .single();

//     if (journeyError || !journey) {
//       return NextResponse.json(
//         { success: false, error: 'Journey not found' },
//         { status: 404 }
//       );
//     }

//     if (journey.user_id !== user.id) {
//       return NextResponse.json(
//         { success: false, error: 'Unauthorized' },
//         { status: 403 }
//       );
//     }

//     // Calculate date range
//     const days = parseInt(period.replace('d', '')) || 30;
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - days);

//     // Try to get journey_execution_stats first (if table exists)
//     const { data: stats, error: statsError } = await supabase
//       .from('journey_execution_stats')
//       .select('*')
//       .eq('journey_id', journeyId)
//       .gte('date', startDate.toISOString().split('T')[0])
//       .order('date', { ascending: true });

//     // If journey_execution_stats exists and has data, use it
//     if (!statsError && stats && stats.length > 0) {
//       console.log('[Journey Analytics]  Found', stats.length, 'daily snapshots');
      
//       return NextResponse.json({
//         success: true,
//         history: stats,
//         period,
//         days,
//       });
//     }

//     // Otherwise, generate history from user_journey_states
//     console.log('[Journey Analytics] 📊 Generating history from journey states...');

//     const { data: states, error: statesError } = await supabase
//       .from('user_journey_states')
//       .select('*')
//       .eq('journey_id', journeyId)
//       .gte('created_at', startDate.toISOString());

//     if (statesError) {
//       console.error('[Journey Analytics] Error:', statesError);
//       return NextResponse.json(
//         { success: false, error: statesError.message },
//         { status: 500 }
//       );
//     }

//     // Group by date and calculate metrics
//     const historyMap = new Map<string, any>();

//     states?.forEach(state => {
//       const date = new Date(state.created_at!).toISOString().split('T')[0];
      
//       if (!historyMap.has(date)) {
//         historyMap.set(date, {
//           date,
//           journey_id: journeyId,
//           total_entered: 0,
//           total_completed: 0,
//           total_exited: 0,
//           total_failed: 0,
//         });
//       }

//       const dayStats = historyMap.get(date)!;

//       // Count entered
//       if (state.entered_at) {
//         dayStats.total_entered++;
//       }

//       // Count completed
//       if (state.status === 'completed') {
//         dayStats.total_completed++;
//       }

//       // Count exited
//       if (state.status === 'exited') {
//         dayStats.total_exited++;
//       }

//       // Count failed
//       if (state.status === 'failed') {
//         dayStats.total_failed++;
//       }
//     });

//     const history = Array.from(historyMap.values()).sort((a, b) => 
//       a.date.localeCompare(b.date)
//     );

//     console.log('[Journey Analytics]  Generated', history.length, 'day snapshots');

//     return NextResponse.json({
//       success: true,
//       history,
//       period,
//       days,
//       generated: true, // Flag to indicate this was generated, not from stats table
//     });

//   } catch (error: any) {
//     console.error('[Journey Analytics] Fatal error:', error);
//     return NextResponse.json(
//       { success: false, error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// app/api/journeys/[id]/analytics/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { verifyToken } from '@/lib/auth-middleware';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    //  Await params in Next.js 15+
    const params = await context.params;
    const journeyId = params.id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    console.log('[Journey Analytics] Getting history for journey:', journeyId);
    console.log('[Journey Analytics] Period:', period);

    // Verify user owns this journey
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('id, user_id, name')
      .eq('id', journeyId)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json(
        { success: false, error: 'Journey not found' },
        { status: 404 }
      );
    }

    if (journey.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Calculate date range
    const days = parseInt(period.replace('d', '')) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Try to get journey_execution_stats first (if table exists)
    const { data: stats, error: statsError } = await supabase
      .from('journey_execution_stats')
      .select('*')
      .eq('journey_id', journeyId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // If journey_execution_stats exists and has data, use it
    if (!statsError && stats && stats.length > 0) {
      console.log('[Journey Analytics]  Found', stats.length, 'daily snapshots');
      
      return NextResponse.json({
        success: true,
        history: stats,
        period,
        days,
      });
    }

    // Otherwise, generate history from user_journey_states
    console.log('[Journey Analytics] 📊 Generating history from journey states...');

    const { data: states, error: statesError } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('journey_id', journeyId)
      .gte('created_at', startDate.toISOString());

    if (statesError) {
      console.error('[Journey Analytics] Error:', statesError);
      return NextResponse.json(
        { success: false, error: statesError.message },
        { status: 500 }
      );
    }

    // Group by date and calculate metrics
    const historyMap = new Map<string, any>();

    states?.forEach(state => {
      const date = new Date(state.created_at!).toISOString().split('T')[0];
      
      if (!historyMap.has(date)) {
        historyMap.set(date, {
          date,
          journey_id: journeyId,
          total_entered: 0,
          total_completed: 0,
          total_exited: 0,
          total_failed: 0,
        });
      }

      const dayStats = historyMap.get(date)!;

      // Count entered
      if (state.entered_at) {
        dayStats.total_entered++;
      }

      // Count completed
      if (state.status === 'completed') {
        dayStats.total_completed++;
      }

      // Count exited
      if (state.status === 'exited') {
        dayStats.total_exited++;
      }

      // Count failed
      if (state.status === 'failed') {
        dayStats.total_failed++;
      }
    });

    const history = Array.from(historyMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    console.log('[Journey Analytics]  Generated', history.length, 'day snapshots');

    return NextResponse.json({
      success: true,
      history,
      period,
      days,
      generated: true, 
    });

  } catch (error: any) {
    console.error('[Journey Analytics] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}