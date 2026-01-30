// // // // // // import { NextRequest, NextResponse } from 'next/server';
// // // // // // import { createClient } from '@supabase/supabase-js';
// // // // // // import { withAuth, AuthUser } from '@/lib/auth-middleware';

// // // // // // const supabase = createClient(
// // // // // //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // // // // //   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// // // // // // );

// // // // // // //  CORRECT: Export as GET, not GET_ANALYTICS
// // // // // // export const GET = withAuth(async (
// // // // // //   request: NextRequest,
// // // // // //   user: AuthUser,
// // // // // //   { params }: { params: { journeyId: string } }
// // // // // // ) => {
// // // // // //   try {
// // // // // //     // Verify journey ownership first
// // // // // //     const { data: journey } = await supabase
// // // // // //       .from('journeys')
// // // // // //       .select('id')
// // // // // //       .eq('id', params.journeyId)
// // // // // //       .eq('user_id', user.id)
// // // // // //       .single();

// // // // // //     if (!journey) {
// // // // // //       return NextResponse.json(
// // // // // //         { error: 'Journey not found' },
// // // // // //         { status: 404 }
// // // // // //       );
// // // // // //     }

// // // // // //     // Get journey stats
// // // // // //     const { data: states, error: statesError } = await supabase
// // // // // //       .from('user_journey_states')
// // // // // //       .select('status')
// // // // // //       .eq('journey_id', params.journeyId);

// // // // // //     if (statesError) throw statesError;

// // // // // //     const analytics = {
// // // // // //       total_entered: states?.length || 0,
// // // // // //       active: states?.filter(s => s.status === 'active').length || 0,
// // // // // //       completed: states?.filter(s => s.status === 'completed').length || 0,
// // // // // //       exited: states?.filter(s => s.status === 'exited').length || 0,
// // // // // //     };

// // // // // //     return NextResponse.json({
// // // // // //       success: true,
// // // // // //       analytics,
// // // // // //     });
// // // // // //   } catch (error: any) {
// // // // // //     console.error('Error fetching journey analytics:', error);
// // // // // //     return NextResponse.json(
// // // // // //       { success: false, error: error.message },
// // // // // //       { status: 500 }
// // // // // //     );
// // // // // //   }
// // // // // // });









// // // // // // pages/api/journeys/[journeyId]/analytics.ts
// // // // // /**
// // // // //  * Get detailed analytics for a journey
// // // // //  */

// // // // // import type { NextApiRequest, NextApiResponse } from 'next';
// // // // // import { createClient } from '@supabase/supabase-js';
// // // // // import type { Database } from '@/types/database';

// // // // // const supabase = createClient<Database>(
// // // // //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // // // //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // // // // );

// // // // // export default async function handler(
// // // // //   req: NextApiRequest,
// // // // //   res: NextApiResponse
// // // // // ) {
// // // // //   if (req.method !== 'GET') {
// // // // //     return res.status(405).json({ error: 'Method not allowed' });
// // // // //   }

// // // // //   const { journeyId } = req.query;

// // // // //   if (!journeyId || typeof journeyId !== 'string') {
// // // // //     return res.status(400).json({ error: 'Journey ID is required' });
// // // // //   }

// // // // //   try {
// // // // //     // Get basic analytics using the database function
// // // // //     const { data: basicAnalytics, error: analyticsError } = await supabase
// // // // //       .rpc('get_journey_analytics', { journey_uuid: journeyId });

// // // // //     if (analyticsError) {
// // // // //       throw analyticsError;
// // // // //     }

// // // // //     // Get step-level performance
// // // // //     const { data: stepPerformance, error: stepError } = await supabase
// // // // //       .from('journey_step_performance')
// // // // //       .select('*')
// // // // //       .eq('journey_id', journeyId)
// // // // //       .order('total_reached', { ascending: false });

// // // // //     if (stepError) {
// // // // //       throw stepError;
// // // // //     }

// // // // //     // Get recent events
// // // // //     const { data: recentEvents, error: eventsError } = await supabase
// // // // //       .from('journey_events')
// // // // //       .select('event_type, created_at, metadata')
// // // // //       .eq('journey_id', journeyId)
// // // // //       .order('created_at', { ascending: false })
// // // // //       .limit(100);

// // // // //     if (eventsError) {
// // // // //       throw eventsError;
// // // // //     }

// // // // //     // Calculate event distribution
// // // // //     const eventDistribution = recentEvents?.reduce((acc, event) => {
// // // // //       acc[event.event_type] = (acc[event.event_type] || 0) + 1;
// // // // //       return acc;
// // // // //     }, {} as Record<string, number>) || {};

// // // // //     // Get A/B test results if applicable
// // // // //     const abTestResults = stepPerformance
// // // // //       ?.filter(step => step.variant_id)
// // // // //       .reduce((acc, step) => {
// // // // //         if (!acc[step.step_id]) {
// // // // //           acc[step.step_id] = [];
// // // // //         }
// // // // //         acc[step.step_id].push({
// // // // //           variant: step.variant_id,
// // // // //           reached: step.total_reached,
// // // // //           completed: step.total_completed,
// // // // //           failed: step.total_failed,
// // // // //           completion_rate: step.total_reached > 0 
// // // // //             ? (step.total_completed / step.total_reached * 100).toFixed(2)
// // // // //             : '0',
// // // // //         });
// // // // //         return acc;
// // // // //       }, {} as Record<string, any[]>);

// // // // //     // Calculate average journey completion time
// // // // //     const { data: completedJourneys } = await supabase
// // // // //       .from('user_journey_states')
// // // // //       .select('entered_at, completed_at')
// // // // //       .eq('journey_id', journeyId)
// // // // //       .eq('status', 'completed')
// // // // //       .not('completed_at', 'is', null)
// // // // //       .limit(1000);

// // // // //     const avgCompletionTime = completedJourneys?.reduce((sum, journey) => {
// // // // //       const duration = new Date(journey.completed_at!).getTime() - new Date(journey.entered_at).getTime();
// // // // //       return sum + duration;
// // // // //     }, 0);

// // // // //     const avgCompletionTimeSeconds = completedJourneys && completedJourneys.length > 0
// // // // //       ? Math.floor(avgCompletionTime! / completedJourneys.length / 1000)
// // // // //       : 0;

// // // // //     return res.status(200).json({
// // // // //       success: true,
// // // // //       analytics: {
// // // // //         ...basicAnalytics,
// // // // //         avg_completion_time_seconds: avgCompletionTimeSeconds,
// // // // //         avg_completion_time_formatted: formatDuration(avgCompletionTimeSeconds),
// // // // //         step_performance: stepPerformance?.map(step => ({
// // // // //           step_id: step.step_id,
// // // // //           reached: step.total_reached,
// // // // //           completed: step.total_completed,
// // // // //           failed: step.total_failed,
// // // // //           completion_rate: step.total_reached > 0 
// // // // //             ? (step.total_completed / step.total_reached * 100).toFixed(2)
// // // // //             : '0',
// // // // //           avg_processing_time_ms: step.avg_processing_time_ms,
// // // // //         })) || [],
// // // // //         event_distribution: eventDistribution,
// // // // //         ab_test_results: abTestResults,
// // // // //       },
// // // // //     });

// // // // //   } catch (error: any) {
// // // // //     console.error('Error fetching journey analytics:', error);
// // // // //     return res.status(500).json({
// // // // //       error: 'Failed to fetch analytics',
// // // // //       message: error.message,
// // // // //     });
// // // // //   }
// // // // // }

// // // // // function formatDuration(seconds: number): string {
// // // // //   if (seconds < 60) {
// // // // //     return `${seconds}s`;
// // // // //   } else if (seconds < 3600) {
// // // // //     const minutes = Math.floor(seconds / 60);
// // // // //     return `${minutes}m`;
// // // // //   } else if (seconds < 86400) {
// // // // //     const hours = Math.floor(seconds / 3600);
// // // // //     const minutes = Math.floor((seconds % 3600) / 60);
// // // // //     return `${hours}h ${minutes}m`;
// // // // //   } else {
// // // // //     const days = Math.floor(seconds / 86400);
// // // // //     const hours = Math.floor((seconds % 86400) / 3600);
// // // // //     return `${days}d ${hours}h`;
// // // // //   }
// // // // // }


// // // // // pages/api/journeys/[id]/analytics.ts
// // // // import type { NextApiRequest, NextApiResponse } from 'next';
// // // // import { createClient } from '@supabase/supabase-js';

// // // // const supabase = createClient(
// // // //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // // //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // // // );

// // // // export default async function handler(
// // // //   req: NextApiRequest,
// // // //   res: NextApiResponse
// // // // ) {
// // // //   if (req.method !== 'GET') {
// // // //     return res.status(405).json({ error: 'Method not allowed' });
// // // //   }

// // // //   try {
// // // //     const { journeyId } = req.query;

// // // //     if (!journeyId || typeof journeyId !== 'string') {
// // // //       return res.status(400).json({ error: 'Journey ID is required' });
// // // //     }

// // // //     // Get analytics using the database function
// // // //     const { data: analyticsData, error: analyticsError } = await supabase
// // // //       .rpc('get_journey_analytics', { journey_uuid: journeyId });

// // // //     if (analyticsError) {
// // // //       console.error('Analytics error:', analyticsError);
// // // //       return res.status(500).json({ error: analyticsError.message });
// // // //     }

// // // //     // Get step-by-step performance
// // // //     const { data: journey, error: journeyError } = await supabase
// // // //       .from('journeys')
// // // //       .select('flow_definition')
// // // //       .eq('id', journeyId)
// // // //       .single();

// // // //     if (journeyError || !journey) {
// // // //       console.error('Journey fetch error:', journeyError);
// // // //       return res.status(404).json({ error: 'Journey not found' });
// // // //     }

// // // //     // Calculate step performance
// // // //     const nodes = journey.flow_definition?.nodes || [];
// // // //     const stepPerformance = [];

// // // //     for (const node of nodes) {
// // // //       // Count how many users reached this step
// // // //       const { count: reachedCount } = await supabase
// // // //         .from('user_journey_states')
// // // //         .select('*', { count: 'exact', head: true })
// // // //         .eq('journey_id', journeyId)
// // // //         .contains('node_history', [{ node_id: node.id }]);

// // // //       stepPerformance.push({
// // // //         step_id: node.id,
// // // //         step_name: getNodeLabel(node),
// // // //         reached: reachedCount || 0,
// // // //       });
// // // //     }

// // // //     const analytics = {
// // // //       ...analyticsData,
// // // //       step_performance: stepPerformance,
// // // //     };

// // // //     return res.status(200).json({
// // // //       success: true,
// // // //       analytics,
// // // //     });

// // // //   } catch (error: any) {
// // // //     console.error('Analytics API error:', error);
// // // //     return res.status(500).json({ 
// // // //       success: false,
// // // //       error: error.message || 'Internal server error' 
// // // //     });
// // // //   }
// // // // }

// // // // function getNodeLabel(node: any): string {
// // // //   switch (node.type) {
// // // //     case 'send_notification':
// // // //       return node.data?.title || 'Send Notification';
// // // //     case 'wait':
// // // //       if (node.data?.mode === 'until_event') {
// // // //         return `Wait for: ${node.data?.event?.name || 'event'}`;
// // // //       }
// // // //       const duration = node.data?.duration || 86400;
// // // //       const days = Math.floor(duration / 86400);
// // // //       const hours = Math.floor((duration % 86400) / 3600);
// // // //       if (days > 0) {
// // // //         return `Wait ${days} day${days !== 1 ? 's' : ''}`;
// // // //       } else if (hours > 0) {
// // // //         return `Wait ${hours} hour${hours !== 1 ? 's' : ''}`;
// // // //       }
// // // //       return `Wait ${Math.floor(duration / 60)} min`;
// // // //     case 'condition':
// // // //       const conditionLabels: Record<string, string> = {
// // // //         clicked_notification: 'Clicked notification?',
// // // //         visited_page: 'Visited page?',
// // // //         completed_action: 'Completed action?',
// // // //         has_tag: 'Has tag?',
// // // //       };
// // // //       return conditionLabels[node.data?.check] || 'Condition';
// // // //     case 'ab_split':
// // // //       return `A/B Split (${node.data?.branches?.length || 2} variants)`;
// // // //     default:
// // // //       return 'Unknown Step';
// // // //   }
// // // // }
























// // // // app/api/journeys/[id]/analytics/route.ts
// // // /**
// // //  * GET /api/journeys/[id]/analytics
// // //  * Get journey analytics
// // //  */

// // // import { NextRequest, NextResponse } from 'next/server';
// // // import { createClient } from '@supabase/supabase-js';
// // // import type { Database } from '@/types/database';
// // // import { enrollSubscriber } from '@/lib/journeys/processor';

// // // const supabase = createClient<Database>(
// // //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // // );

// // // export async function GET_ANALYTICS(
// // //   req: NextRequest,
// // //   { params }: { params: { journeyId: string } }
// // // ) {
// // //   try {
// // //     const authHeader = req.headers.get('authorization');
// // //     if (!authHeader) {
// // //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// // //     }

// // //     const token = authHeader.replace('Bearer ', '');
// // //     const { data: { user }, error: authError } = await supabase.auth.getUser(token);

// // //     if (authError || !user) {
// // //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// // //     }

// // //     const { journeyId } = params;
// // //     const { searchParams } = new URL(req.url);
// // //     const timeRange = searchParams.get('range') || '7d'; // 7d, 30d, 90d, all

// // //     // Verify ownership
// // //     const { data: journey, error: journeyError } = await supabase
// // //       .from('journeys')
// // //       .select('id, name, total_entered, total_active, total_completed')
// // //       .eq('id', journeyId)
// // //       .eq('user_id', user.id)
// // //       .single();

// // //     if (journeyError || !journey) {
// // //       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
// // //     }

// // //     // Calculate date range
// // //     const now = new Date();
// // //     let startDate = new Date();
    
// // //     switch (timeRange) {
// // //       case '7d':
// // //         startDate.setDate(now.getDate() - 7);
// // //         break;
// // //       case '30d':
// // //         startDate.setDate(now.getDate() - 30);
// // //         break;
// // //       case '90d':
// // //         startDate.setDate(now.getDate() - 90);
// // //         break;
// // //       case 'all':
// // //       default:
// // //         startDate = new Date('2020-01-01');
// // //     }

// // //     // Get journey events for timeline
// // //     const { data: events } = await supabase
// // //       .from('journey_events')
// // //       .select('event_type, created_at, step_id, metadata')
// // //       .eq('journey_id', journeyId)
// // //       .gte('created_at', startDate.toISOString())
// // //       .order('created_at', { ascending: true });

// // //     // Get user states for completion metrics
// // //     const { data: userStates } = await supabase
// // //       .from('user_journey_states')
// // //       .select('status, entered_at, completed_at, exited_at, current_step_id')
// // //       .eq('journey_id', journeyId)
// // //       .gte('entered_at', startDate.toISOString());

// // //     // Calculate analytics
// // //     const analytics = {
// // //       overview: {
// // //         total_entered: journey.total_entered || 0,
// // //         total_active: journey.total_active || 0,
// // //         total_completed: journey.total_completed || 0,
// // //         completion_rate: journey.total_entered > 0
// // //           ? Math.round((journey.total_completed / journey.total_entered) * 100)
// // //           : 0,
// // //       },
// // //       timeline: generateTimeline(events || []),
// // //       eventBreakdown: calculateEventBreakdown(events || []),
// // //       averageCompletionTime: calculateAverageCompletionTime(userStates || []),
// // //       stepPerformance: calculateStepPerformance(events || []),
// // //       dropoffPoints: calculateDropoffPoints(userStates || []),
// // //     };

// // //     return NextResponse.json({
// // //       success: true,
// // //       analytics,
// // //     });

// // //   } catch (error: any) {
// // //     console.error('[API] Error in GET /api/journeys/[journeyId]/analytics:', error);
// // //     return NextResponse.json({ error: error.message }, { status: 500 });
// // //   }
// // // }

// // // // Helper functions for analytics
// // // function generateTimeline(events: any[]) {
// // //   const dailyStats: { [date: string]: { entered: number; completed: number; exited: number } } = {};

// // //   events.forEach(event => {
// // //     const date = event.created_at.split('T')[0];
// // //     if (!dailyStats[date]) {
// // //       dailyStats[date] = { entered: 0, completed: 0, exited: 0 };
// // //     }

// // //     if (event.event_type === 'journey_entered') {
// // //       dailyStats[date].entered++;
// // //     } else if (event.event_type === 'journey_completed') {
// // //       dailyStats[date].completed++;
// // //     } else if (event.event_type === 'journey_exited') {
// // //       dailyStats[date].exited++;
// // //     }
// // //   });

// // //   return Object.entries(dailyStats).map(([date, stats]) => ({
// // //     date,
// // //     ...stats,
// // //   }));
// // // }

// // // function calculateEventBreakdown(events: any[]) {
// // //   const breakdown: { [key: string]: number } = {};

// // //   events.forEach(event => {
// // //     breakdown[event.event_type] = (breakdown[event.event_type] || 0) + 1;
// // //   });

// // //   return Object.entries(breakdown).map(([event_type, count]) => ({
// // //     event_type,
// // //     count,
// // //   }));
// // // }

// // // function calculateAverageCompletionTime(userStates: any[]) {
// // //   const completedStates = userStates.filter(
// // //     state => state.completed_at && state.entered_at
// // //   );

// // //   if (completedStates.length === 0) return null;

// // //   const totalTime = completedStates.reduce((sum, state) => {
// // //     const entered = new Date(state.entered_at).getTime();
// // //     const completed = new Date(state.completed_at).getTime();
// // //     return sum + (completed - entered);
// // //   }, 0);

// // //   const averageMs = totalTime / completedStates.length;
// // //   const averageHours = Math.round(averageMs / (1000 * 60 * 60));

// // //   return {
// // //     milliseconds: averageMs,
// // //     hours: averageHours,
// // //     formatted: formatDuration(averageMs),
// // //   };
// // // }

// // // function calculateStepPerformance(events: any[]) {
// // //   const stepStats: { 
// // //     [stepId: string]: { 
// // //       reached: number; 
// // //       completed: number; 
// // //       failed: number;
// // //     } 
// // //   } = {};

// // //   events.forEach(event => {
// // //     if (!event.step_id) return;

// // //     if (!stepStats[event.step_id]) {
// // //       stepStats[event.step_id] = { reached: 0, completed: 0, failed: 0 };
// // //     }

// // //     if (event.event_type === 'step_started' || event.event_type === 'notification_sent') {
// // //       stepStats[event.step_id].reached++;
// // //     } else if (event.event_type === 'step_completed') {
// // //       stepStats[event.step_id].completed++;
// // //     } else if (event.event_type === 'step_error') {
// // //       stepStats[event.step_id].failed++;
// // //     }
// // //   });

// // //   return Object.entries(stepStats).map(([step_id, stats]) => ({
// // //     step_id,
// // //     ...stats,
// // //     success_rate: stats.reached > 0
// // //       ? Math.round((stats.completed / stats.reached) * 100)
// // //       : 0,
// // //   }));
// // // }

// // // function calculateDropoffPoints(userStates: any[]) {
// // //   const stepDropoffs: { [stepId: string]: number } = {};

// // //   userStates
// // //     .filter(state => state.status === 'exited' && state.current_step_id)
// // //     .forEach(state => {
// // //       stepDropoffs[state.current_step_id] = (stepDropoffs[state.current_step_id] || 0) + 1;
// // //     });

// // //   return Object.entries(stepDropoffs)
// // //     .map(([step_id, dropoffs]) => ({ step_id, dropoffs }))
// // //     .sort((a, b) => b.dropoffs - a.dropoffs);
// // // }

// // // function formatDuration(ms: number) {
// // //   const days = Math.floor(ms / (1000 * 60 * 60 * 24));
// // //   const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
// // //   const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

// // //   if (days > 0) return `${days}d ${hours}h`;
// // //   if (hours > 0) return `${hours}h ${minutes}m`;
// // //   return `${minutes}m`;
// // // }















// // // app/api/internal/process-journeys/route.ts
// // import { NextRequest, NextResponse } from 'next/server';
// // import { processDueSteps } from '@/lib/journeys/processor';

// // /**
// //  * POST /api/internal/process-journeys
// //  * Manually trigger journey processor (for testing/debugging)
// //  * Should be called by cron job or manually for testing
// //  */
// // export async function POST(req: NextRequest) {
// //   try {
// //     // Optional: Add API key check for security
// //     const apiKey = req.headers.get('x-api-key');
// //     const expectedKey = process.env.INTERNAL_API_KEY;
    
// //     if (expectedKey && apiKey !== expectedKey) {
// //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// //     }

// //     console.log('🔄 [API] Manual journey processor trigger');

// //     const result = await processDueSteps();

// //     return NextResponse.json({
// //       success: true,
// //       message: 'Journey processor completed',
// //       result,
// //     });

// //   } catch (error: any) {
// //     console.error('[API] Error in POST /api/internal/process-journeys:', error);
// //     return NextResponse.json({ 
// //       success: false,
// //       error: error.message 
// //     }, { status: 500 });
// //   }
// // }

// // // Allow GET for easy browser testing
// // export async function GET(req: NextRequest) {
// //   return POST(req);
// // }

// // // app/api/internal/cleanup-stuck/route.ts
// // /**
// //  * POST /api/internal/cleanup-stuck
// //  * Cleanup stuck journeys and stale scheduled steps
// //  */
// // export async function POST_CLEANUP(req: NextRequest) {
// //   try {
// //     const apiKey = req.headers.get('x-api-key');
// //     const expectedKey = process.env.INTERNAL_API_KEY;
    
// //     if (expectedKey && apiKey !== expectedKey) {
// //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// //     }

// //     const { createClient } = await import('@supabase/supabase-js');
// //     const supabase = createClient(
// //       process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //       process.env.SUPABASE_SERVICE_ROLE_KEY!
// //     );

// //     console.log('🧹 [API] Cleaning up stuck journeys');

// //     const now = new Date();
// //     const stuckThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

// //     // Find stuck active states (not processed in 24 hours)
// //     const { data: stuckStates } = await supabase
// //       .from('user_journey_states')
// //       .select('id, journey_id, subscriber_id, last_processed_at')
// //       .eq('status', 'active')
// //       .lt('last_processed_at', stuckThreshold.toISOString());

// //     let clearedStates = 0;
// //     if (stuckStates && stuckStates.length > 0) {
// //       console.log(`Found ${stuckStates.length} stuck states`);
      
// //       for (const state of stuckStates) {
// //         // Mark as exited with reason
// //         await supabase
// //           .from('user_journey_states')
// //           .update({
// //             status: 'exited',
// //             exit_reason: 'stuck_state_cleanup',
// //             completed_at: now.toISOString(),
// //           })
// //           .eq('id', state.id);

// //         // Decrement active count
// //         await supabase
// //           .from('journeys')
// //           .update({
// //             total_active: supabase.rpc('GREATEST', {
// //               a: 'total_active - 1',
// //               b: 0,
// //             }),
// //           })
// //           .eq('id', state.journey_id);

// //         clearedStates++;
// //       }
// //     }

// //     // Cancel stale scheduled steps (past execute_at by more than 1 hour)
// //     const staleThreshold = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    
// //     const { data: staleSteps, error: stepsError } = await supabase
// //       .from('scheduled_journey_steps')
// //       .update({
// //         status: 'cancelled',
// //         error: 'Stale step - missed execution window',
// //         completed_at: now.toISOString(),
// //       })
// //       .eq('status', 'pending')
// //       .lt('execute_at', staleThreshold.toISOString())
// //       .select('id');

// //     const cancelledSteps = staleSteps?.length || 0;

// //     // Cleanup old completed steps (older than 30 days)
// //     const { data: deleted } = await supabase
// //       .rpc('cleanup_old_scheduled_steps');

// //     return NextResponse.json({
// //       success: true,
// //       message: 'Cleanup completed',
// //       result: {
// //         stuck_states_cleared: clearedStates,
// //         stale_steps_cancelled: cancelledSteps,
// //         old_steps_deleted: deleted || 0,
// //       },
// //     });

// //   } catch (error: any) {
// //     console.error('[API] Error in POST /api/internal/cleanup-stuck:', error);
// //     return NextResponse.json({ 
// //       success: false,
// //       error: error.message 
// //     }, { status: 500 });
// //   }
// // }

// // // app/api/internal/metrics/route.ts
// // /**
// //  * GET /api/internal/metrics
// //  * Get journey processing metrics
// //  */
// // export async function GET_METRICS(req: NextRequest) {
// //   try {
// //     const { createClient } = await import('@supabase/supabase-js');
// //     const supabase = createClient(
// //       process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //       process.env.SUPABASE_SERVICE_ROLE_KEY!
// //     );

// //     // Count journeys by status
// //     const { data: journeyStats } = await supabase
// //       .from('journeys')
// //       .select('status')
// //       .then(({ data }) => {
// //         const stats = { active: 0, draft: 0, paused: 0, archived: 0, total: 0 };
// //         data?.forEach(j => {
// //           stats[j.status as keyof typeof stats] = (stats[j.status as keyof typeof stats] || 0) + 1;
// //           stats.total++;
// //         });
// //         return { data: stats };
// //       });

// //     // Count journey states by status
// //     const { data: stateStats } = await supabase
// //       .from('user_journey_states')
// //       .select('status')
// //       .then(({ data }) => {
// //         const stats = { active: 0, waiting: 0, completed: 0, exited: 0, total: 0 };
// //         data?.forEach(s => {
// //           stats[s.status as keyof typeof stats] = (stats[s.status as keyof typeof stats] || 0) + 1;
// //           stats.total++;
// //         });
// //         return { data: stats };
// //       });

// //     // Count scheduled steps by status
// //     const { data: stepStats } = await supabase
// //       .from('scheduled_journey_steps')
// //       .select('status')
// //       .then(({ data }) => {
// //         const stats = { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0, total: 0 };
// //         data?.forEach(s => {
// //           stats[s.status as keyof typeof stats] = (stats[s.status as keyof typeof stats] || 0) + 1;
// //           stats.total++;
// //         });
// //         return { data: stats };
// //       });

// //     // Count pending steps due now
// //     const { data: dueSteps } = await supabase
// //       .from('scheduled_journey_steps')
// //       .select('id')
// //       .eq('status', 'pending')
// //       .lte('execute_at', new Date().toISOString());

// //     return NextResponse.json({
// //       success: true,
// //       metrics: {
// //         journeys: journeyStats,
// //         journey_states: stateStats,
// //         scheduled_steps: stepStats,
// //         due_steps: dueSteps?.length || 0,
// //         timestamp: new Date().toISOString(),
// //       },
// //     });

// //   } catch (error: any) {
// //     console.error('[API] Error in GET /api/internal/metrics:', error);
// //     return NextResponse.json({ 
// //       success: false,
// //       error: error.message 
// //     }, { status: 500 });
// //   }
// // }

// // // app/api/journeys/[journeyId]/user-states/route.ts
// // /**
// //  * GET /api/journeys/[journeyId]/user-states
// //  * Get all user states for a journey (who's in the journey)
// //  */
// // export async function GET_USER_STATES(
// //   req: NextRequest,
// //   { params }: { params: { journeyId: string } }
// // ) {
// //   try {
// //     const authHeader = req.headers.get('authorization');
// //     if (!authHeader) {
// //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// //     }

// //     const token = authHeader.replace('Bearer ', '');
// //     const { createClient } = await import('@supabase/supabase-js');
// //     const supabase = createClient(
// //       process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //       process.env.SUPABASE_SERVICE_ROLE_KEY!
// //     );

// //     const { data: { user }, error: authError } = await supabase.auth.getUser(token);

// //     if (authError || !user) {
// //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// //     }

// //     const { journeyId } = params;
// //     const { searchParams } = new URL(req.url);
// //     const status = searchParams.get('status') || 'active';
// //     const page = parseInt(searchParams.get('page') || '1');
// //     const limit = parseInt(searchParams.get('limit') || '50');
// //     const offset = (page - 1) * limit;

// //     // Verify journey ownership
// //     const { data: journey, error: journeyError } = await supabase
// //       .from('journeys')
// //       .select('id')
// //       .eq('id', journeyId)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (journeyError || !journey) {
// //       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
// //     }

// //     // Get user states
// //     let query = supabase
// //       .from('user_journey_states')
// //       .select(`
// //         *,
// //         subscriber:subscribers(id, platform, tags, created_at)
// //       `, { count: 'exact' })
// //       .eq('journey_id', journeyId)
// //       .order('entered_at', { ascending: false })
// //       .range(offset, offset + limit - 1);

// //     if (status && status !== 'all') {
// //       query = query.eq('status', status);
// //     }

// //     const { data: userStates, error, count } = await query;

// //     if (error) {
// //       console.error('[API] Error fetching user states:', error);
// //       return NextResponse.json({ error: 'Failed to fetch user states' }, { status: 500 });
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       user_states: userStates || [],
// //       pagination: {
// //         page,
// //         limit,
// //         total: count || 0,
// //         pages: Math.ceil((count || 0) / limit),
// //       },
// //     });

// //   } catch (error: any) {
// //     console.error('[API] Error in GET /api/journeys/[journeyId]/user-states:', error);
// //     return NextResponse.json({ error: error.message }, { status: 500 });
// //   }
// // }















// // app/api/journeys/[id]/analytics/route.ts - Next.js 15 Compatible
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// /**
//  * GET /api/journeys/[id]/analytics
//  * Get journey analytics
//  */
// export async function GET(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }  // ✅ Next.js 15: params is a Promise
// ) {
//   try {
//     const authHeader = req.headers.get('authorization');
//     if (!authHeader) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const token = authHeader.replace('Bearer ', '');
//     const { data: { user }, error: authError } = await supabase.auth.getUser(token);

//     if (authError || !user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { id: journeyId } = await params;  // ✅ Await params
//     const { searchParams } = new URL(req.url);
//     const timeRange = searchParams.get('range') || '7d';

//     // Verify ownership
//     const { data: journey, error: journeyError } = await supabase
//       .from('journeys')
//       .select('id, name, total_entered, total_active, total_completed')
//       .eq('id', journeyId)
//       .eq('user_id', user.id)
//       .single();

//     if (journeyError || !journey) {
//       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
//     }

//     // Calculate date range
//     const now = new Date();
//     let startDate = new Date();
    
//     switch (timeRange) {
//       case '7d':
//         startDate.setDate(now.getDate() - 7);
//         break;
//       case '30d':
//         startDate.setDate(now.getDate() - 30);
//         break;
//       case '90d':
//         startDate.setDate(now.getDate() - 90);
//         break;
//       case 'all':
//       default:
//         startDate = new Date('2020-01-01');
//     }

//     // Get journey events for timeline
//     const { data: events } = await supabase
//       .from('journey_events')
//       .select('event_type, created_at, step_id, metadata')
//       .eq('journey_id', journeyId)
//       .gte('created_at', startDate.toISOString())
//       .order('created_at', { ascending: true });

//     // Get user states for completion metrics
//     const { data: userStates } = await supabase
//       .from('user_journey_states')
//       .select('status, entered_at, completed_at, exited_at, current_step_id')
//       .eq('journey_id', journeyId)
//       .gte('entered_at', startDate.toISOString());

//     // Calculate analytics
//     const analytics = {
//       overview: {
//         total_entered: journey.total_entered || 0,
//         total_active: journey.total_active || 0,
//         total_completed: journey.total_completed || 0,
//         completion_rate: journey.total_entered > 0
//           ? Math.round((journey.total_completed / journey.total_entered) * 100)
//           : 0,
//       },
//       timeline: generateTimeline(events || []),
//       eventBreakdown: calculateEventBreakdown(events || []),
//       averageCompletionTime: calculateAverageCompletionTime(userStates || []),
//       stepPerformance: calculateStepPerformance(events || []),
//       dropoffPoints: calculateDropoffPoints(userStates || []),
//     };

//     return NextResponse.json({
//       success: true,
//       analytics,
//     });

//   } catch (error: any) {
//     console.error('[API] Error in GET /api/journeys/[id]/analytics:', error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

// // Helper functions
// function generateTimeline(events: any[]) {
//   const dailyStats: { [date: string]: { entered: number; completed: number; exited: number } } = {};

//   events.forEach(event => {
//     const date = event.created_at.split('T')[0];
//     if (!dailyStats[date]) {
//       dailyStats[date] = { entered: 0, completed: 0, exited: 0 };
//     }

//     if (event.event_type === 'journey_entered') {
//       dailyStats[date].entered++;
//     } else if (event.event_type === 'journey_completed') {
//       dailyStats[date].completed++;
//     } else if (event.event_type === 'journey_exited') {
//       dailyStats[date].exited++;
//     }
//   });

//   return Object.entries(dailyStats).map(([date, stats]) => ({
//     date,
//     ...stats,
//   }));
// }

// function calculateEventBreakdown(events: any[]) {
//   const breakdown: { [key: string]: number } = {};

//   events.forEach(event => {
//     breakdown[event.event_type] = (breakdown[event.event_type] || 0) + 1;
//   });

//   return Object.entries(breakdown).map(([event_type, count]) => ({
//     event_type,
//     count,
//   }));
// }

// function calculateAverageCompletionTime(userStates: any[]) {
//   const completedStates = userStates.filter(
//     state => state.completed_at && state.entered_at
//   );

//   if (completedStates.length === 0) return null;

//   const totalTime = completedStates.reduce((sum, state) => {
//     const entered = new Date(state.entered_at).getTime();
//     const completed = new Date(state.completed_at).getTime();
//     return sum + (completed - entered);
//   }, 0);

//   const averageMs = totalTime / completedStates.length;
//   const averageHours = Math.round(averageMs / (1000 * 60 * 60));

//   return {
//     milliseconds: averageMs,
//     hours: averageHours,
//     formatted: formatDuration(averageMs),
//   };
// }

// function calculateStepPerformance(events: any[]) {
//   const stepStats: { 
//     [stepId: string]: { 
//       reached: number; 
//       completed: number; 
//       failed: number;
//     } 
//   } = {};

//   events.forEach(event => {
//     if (!event.step_id) return;

//     if (!stepStats[event.step_id]) {
//       stepStats[event.step_id] = { reached: 0, completed: 0, failed: 0 };
//     }

//     if (event.event_type === 'step_started' || event.event_type === 'notification_sent') {
//       stepStats[event.step_id].reached++;
//     } else if (event.event_type === 'step_completed') {
//       stepStats[event.step_id].completed++;
//     } else if (event.event_type === 'step_error') {
//       stepStats[event.step_id].failed++;
//     }
//   });

//   return Object.entries(stepStats).map(([step_id, stats]) => ({
//     step_id,
//     ...stats,
//     success_rate: stats.reached > 0
//       ? Math.round((stats.completed / stats.reached) * 100)
//       : 0,
//   }));
// }

// function calculateDropoffPoints(userStates: any[]) {
//   const stepDropoffs: { [stepId: string]: number } = {};

//   userStates
//     .filter(state => state.status === 'exited' && state.current_step_id)
//     .forEach(state => {
//       stepDropoffs[state.current_step_id] = (stepDropoffs[state.current_step_id] || 0) + 1;
//     });

//   return Object.entries(stepDropoffs)
//     .map(([step_id, dropoffs]) => ({ step_id, dropoffs }))
//     .sort((a, b) => b.dropoffs - a.dropoffs);
// }

// function formatDuration(ms: number) {
//   const days = Math.floor(ms / (1000 * 60 * 60 * 24));
//   const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
//   const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

//   if (days > 0) return `${days}d ${hours}h`;
//   if (hours > 0) return `${hours}h ${minutes}m`;
//   return `${minutes}m`;
// }












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
 * ✅ FIXED: Proper null handling for TypeScript
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

    // ✅ FIX: Extract values with null coalescing
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