// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@supabase/supabase-js';
// // import { withAuth, AuthUser } from '@/lib/auth-middleware';

// // const supabase = createClient(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// // );

// // //  CORRECT: Export as GET, not GET_ANALYTICS
// // export const GET = withAuth(async (
// //   request: NextRequest,
// //   user: AuthUser,
// //   { params }: { params: { journeyId: string } }
// // ) => {
// //   try {
// //     // Verify journey ownership first
// //     const { data: journey } = await supabase
// //       .from('journeys')
// //       .select('id')
// //       .eq('id', params.journeyId)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (!journey) {
// //       return NextResponse.json(
// //         { error: 'Journey not found' },
// //         { status: 404 }
// //       );
// //     }

// //     // Get journey stats
// //     const { data: states, error: statesError } = await supabase
// //       .from('user_journey_states')
// //       .select('status')
// //       .eq('journey_id', params.journeyId);

// //     if (statesError) throw statesError;

// //     const analytics = {
// //       total_entered: states?.length || 0,
// //       active: states?.filter(s => s.status === 'active').length || 0,
// //       completed: states?.filter(s => s.status === 'completed').length || 0,
// //       exited: states?.filter(s => s.status === 'exited').length || 0,
// //     };

// //     return NextResponse.json({
// //       success: true,
// //       analytics,
// //     });
// //   } catch (error: any) {
// //     console.error('Error fetching journey analytics:', error);
// //     return NextResponse.json(
// //       { success: false, error: error.message },
// //       { status: 500 }
// //     );
// //   }
// // });









// // pages/api/journeys/[journeyId]/analytics.ts
// /**
//  * Get detailed analytics for a journey
//  */

// import type { NextApiRequest, NextApiResponse } from 'next';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   if (req.method !== 'GET') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   const { journeyId } = req.query;

//   if (!journeyId || typeof journeyId !== 'string') {
//     return res.status(400).json({ error: 'Journey ID is required' });
//   }

//   try {
//     // Get basic analytics using the database function
//     const { data: basicAnalytics, error: analyticsError } = await supabase
//       .rpc('get_journey_analytics', { journey_uuid: journeyId });

//     if (analyticsError) {
//       throw analyticsError;
//     }

//     // Get step-level performance
//     const { data: stepPerformance, error: stepError } = await supabase
//       .from('journey_step_performance')
//       .select('*')
//       .eq('journey_id', journeyId)
//       .order('total_reached', { ascending: false });

//     if (stepError) {
//       throw stepError;
//     }

//     // Get recent events
//     const { data: recentEvents, error: eventsError } = await supabase
//       .from('journey_events')
//       .select('event_type, created_at, metadata')
//       .eq('journey_id', journeyId)
//       .order('created_at', { ascending: false })
//       .limit(100);

//     if (eventsError) {
//       throw eventsError;
//     }

//     // Calculate event distribution
//     const eventDistribution = recentEvents?.reduce((acc, event) => {
//       acc[event.event_type] = (acc[event.event_type] || 0) + 1;
//       return acc;
//     }, {} as Record<string, number>) || {};

//     // Get A/B test results if applicable
//     const abTestResults = stepPerformance
//       ?.filter(step => step.variant_id)
//       .reduce((acc, step) => {
//         if (!acc[step.step_id]) {
//           acc[step.step_id] = [];
//         }
//         acc[step.step_id].push({
//           variant: step.variant_id,
//           reached: step.total_reached,
//           completed: step.total_completed,
//           failed: step.total_failed,
//           completion_rate: step.total_reached > 0 
//             ? (step.total_completed / step.total_reached * 100).toFixed(2)
//             : '0',
//         });
//         return acc;
//       }, {} as Record<string, any[]>);

//     // Calculate average journey completion time
//     const { data: completedJourneys } = await supabase
//       .from('user_journey_states')
//       .select('entered_at, completed_at')
//       .eq('journey_id', journeyId)
//       .eq('status', 'completed')
//       .not('completed_at', 'is', null)
//       .limit(1000);

//     const avgCompletionTime = completedJourneys?.reduce((sum, journey) => {
//       const duration = new Date(journey.completed_at!).getTime() - new Date(journey.entered_at).getTime();
//       return sum + duration;
//     }, 0);

//     const avgCompletionTimeSeconds = completedJourneys && completedJourneys.length > 0
//       ? Math.floor(avgCompletionTime! / completedJourneys.length / 1000)
//       : 0;

//     return res.status(200).json({
//       success: true,
//       analytics: {
//         ...basicAnalytics,
//         avg_completion_time_seconds: avgCompletionTimeSeconds,
//         avg_completion_time_formatted: formatDuration(avgCompletionTimeSeconds),
//         step_performance: stepPerformance?.map(step => ({
//           step_id: step.step_id,
//           reached: step.total_reached,
//           completed: step.total_completed,
//           failed: step.total_failed,
//           completion_rate: step.total_reached > 0 
//             ? (step.total_completed / step.total_reached * 100).toFixed(2)
//             : '0',
//           avg_processing_time_ms: step.avg_processing_time_ms,
//         })) || [],
//         event_distribution: eventDistribution,
//         ab_test_results: abTestResults,
//       },
//     });

//   } catch (error: any) {
//     console.error('Error fetching journey analytics:', error);
//     return res.status(500).json({
//       error: 'Failed to fetch analytics',
//       message: error.message,
//     });
//   }
// }

// function formatDuration(seconds: number): string {
//   if (seconds < 60) {
//     return `${seconds}s`;
//   } else if (seconds < 3600) {
//     const minutes = Math.floor(seconds / 60);
//     return `${minutes}m`;
//   } else if (seconds < 86400) {
//     const hours = Math.floor(seconds / 3600);
//     const minutes = Math.floor((seconds % 3600) / 60);
//     return `${hours}h ${minutes}m`;
//   } else {
//     const days = Math.floor(seconds / 86400);
//     const hours = Math.floor((seconds % 86400) / 3600);
//     return `${days}d ${hours}h`;
//   }
// }


// pages/api/journeys/[id]/analytics.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { journeyId } = req.query;

    if (!journeyId || typeof journeyId !== 'string') {
      return res.status(400).json({ error: 'Journey ID is required' });
    }

    // Get analytics using the database function
    const { data: analyticsData, error: analyticsError } = await supabase
      .rpc('get_journey_analytics', { journey_uuid: journeyId });

    if (analyticsError) {
      console.error('Analytics error:', analyticsError);
      return res.status(500).json({ error: analyticsError.message });
    }

    // Get step-by-step performance
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('flow_definition')
      .eq('id', journeyId)
      .single();

    if (journeyError || !journey) {
      console.error('Journey fetch error:', journeyError);
      return res.status(404).json({ error: 'Journey not found' });
    }

    // Calculate step performance
    const nodes = journey.flow_definition?.nodes || [];
    const stepPerformance = [];

    for (const node of nodes) {
      // Count how many users reached this step
      const { count: reachedCount } = await supabase
        .from('user_journey_states')
        .select('*', { count: 'exact', head: true })
        .eq('journey_id', journeyId)
        .contains('node_history', [{ node_id: node.id }]);

      stepPerformance.push({
        step_id: node.id,
        step_name: getNodeLabel(node),
        reached: reachedCount || 0,
      });
    }

    const analytics = {
      ...analyticsData,
      step_performance: stepPerformance,
    };

    return res.status(200).json({
      success: true,
      analytics,
    });

  } catch (error: any) {
    console.error('Analytics API error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error' 
    });
  }
}

function getNodeLabel(node: any): string {
  switch (node.type) {
    case 'send_notification':
      return node.data?.title || 'Send Notification';
    case 'wait':
      if (node.data?.mode === 'until_event') {
        return `Wait for: ${node.data?.event?.name || 'event'}`;
      }
      const duration = node.data?.duration || 86400;
      const days = Math.floor(duration / 86400);
      const hours = Math.floor((duration % 86400) / 3600);
      if (days > 0) {
        return `Wait ${days} day${days !== 1 ? 's' : ''}`;
      } else if (hours > 0) {
        return `Wait ${hours} hour${hours !== 1 ? 's' : ''}`;
      }
      return `Wait ${Math.floor(duration / 60)} min`;
    case 'condition':
      const conditionLabels: Record<string, string> = {
        clicked_notification: 'Clicked notification?',
        visited_page: 'Visited page?',
        completed_action: 'Completed action?',
        has_tag: 'Has tag?',
      };
      return conditionLabels[node.data?.check] || 'Condition';
    case 'ab_split':
      return `A/B Split (${node.data?.branches?.length || 2} variants)`;
    default:
      return 'Unknown Step';
  }
}