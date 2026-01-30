// // // // // // pages/api/journeys/[journeyId]/enroll.ts
// // // // // /**
// // // // //  * Enroll a subscriber in a journey
// // // // //  */

// // // // // import type { NextApiRequest, NextApiResponse } from 'next';
// // // // // import { enrollSubscriber } from '@/lib/journeys/journey-processor';

// // // // // export default async function handler(
// // // // //   req: NextApiRequest,
// // // // //   res: NextApiResponse
// // // // // ) {
// // // // //   if (req.method !== 'POST') {
// // // // //     return res.status(405).json({ error: 'Method not allowed' });
// // // // //   }

// // // // //   const { journeyId } = req.query;
// // // // //   const { subscriber_id, context } = req.body;

// // // // //   if (!journeyId || typeof journeyId !== 'string') {
// // // // //     return res.status(400).json({ error: 'Journey ID is required' });
// // // // //   }

// // // // //   if (!subscriber_id) {
// // // // //     return res.status(400).json({ error: 'Subscriber ID is required' });
// // // // //   }

// // // // //   try {
// // // // //     const journeyState = await enrollSubscriber(
// // // // //       journeyId,
// // // // //       subscriber_id,
// // // // //       context || {}
// // // // //     );

// // // // //     if (!journeyState) {
// // // // //       return res.status(200).json({
// // // // //         success: false,
// // // // //         message: 'Subscriber not enrolled (re-entry rules or other constraints)',
// // // // //       });
// // // // //     }

// // // // //     return res.status(200).json({
// // // // //       success: true,
// // // // //       message: 'Subscriber enrolled successfully',
// // // // //       journey_state: journeyState,
// // // // //     });

// // // // //   } catch (error: any) {
// // // // //     console.error('Error enrolling subscriber:', error);
// // // // //     return res.status(500).json({
// // // // //       error: 'Failed to enroll subscriber',
// // // // //       message: error.message,
// // // // //     });
// // // // //   }
// // // // // }








// // // // // pages/api/journeys/[id]/enroll.ts
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
// // // //   if (req.method !== 'POST') {
// // // //     return res.status(405).json({ error: 'Method not allowed' });
// // // //   }

// // // //   try {
// // // //     const { journeyId } = req.query;
// // // //     const { subscriber_id, force = false } = req.body;

// // // //     if (!journeyId || typeof journeyId !== 'string') {
// // // //       return res.status(400).json({ error: 'Journey ID is required' });
// // // //     }

// // // //     if (!subscriber_id) {
// // // //       return res.status(400).json({ error: 'Subscriber ID is required' });
// // // //     }

// // // //     // Enroll subscriber using database function
// // // //     const { data: stateId, error: enrollError } = await supabase
// // // //       .rpc('enroll_subscriber_in_journey', {
// // // //         p_journey_id: journeyId,
// // // //         p_subscriber_id: subscriber_id,
// // // //       });

// // // //     if (enrollError) {
// // // //       console.error('Enrollment error:', enrollError);
      
// // // //       // Handle specific error cases
// // // //       if (enrollError.message.includes('Re-entry not allowed')) {
// // // //         return res.status(409).json({ 
// // // //           success: false,
// // // //           error: 'Subscriber has already completed this journey and re-entry is not allowed' 
// // // //         });
// // // //       }
      
// // // //       if (enrollError.message.includes('Maximum entries exceeded')) {
// // // //         return res.status(409).json({ 
// // // //           success: false,
// // // //           error: 'Subscriber has reached maximum entries for this journey' 
// // // //         });
// // // //       }
      
// // // //       if (enrollError.message.includes('Cooldown period')) {
// // // //         return res.status(409).json({ 
// // // //           success: false,
// // // //           error: 'Subscriber must wait before re-entering this journey' 
// // // //         });
// // // //       }
      
// // // //       if (enrollError.message.includes('already in journey')) {
// // // //         return res.status(409).json({ 
// // // //           success: false,
// // // //           error: 'Subscriber is already active in this journey' 
// // // //         });
// // // //       }

// // // //       return res.status(500).json({ 
// // // //         success: false,
// // // //         error: enrollError.message 
// // // //       });
// // // //     }

// // // //     // Trigger processing of the first step
// // // //     try {
// // // //       // Get the first step from the journey
// // // //       const { data: journey } = await supabase
// // // //         .from('journeys')
// // // //         .select('flow_definition')
// // // //         .eq('id', journeyId)
// // // //         .single();

// // // //       if (journey?.flow_definition?.nodes?.[0]) {
// // // //         const firstNode = journey.flow_definition.nodes[0];
        
// // // //         // Queue the first step for immediate processing
// // // //         await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/process-journey-step`, {
// // // //           method: 'POST',
// // // //           headers: { 'Content-Type': 'application/json' },
// // // //           body: JSON.stringify({
// // // //             state_id: stateId,
// // // //             step_id: firstNode.id,
// // // //           }),
// // // //         });
// // // //       }
// // // //     } catch (triggerError) {
// // // //       console.error('Error triggering first step:', triggerError);
// // // //       // Don't fail the enrollment if trigger fails
// // // //     }

// // // //     return res.status(200).json({
// // // //       success: true,
// // // //       state_id: stateId,
// // // //       message: 'Subscriber enrolled successfully',
// // // //     });

// // // //   } catch (error: any) {
// // // //     console.error('Enrollment API error:', error);
// // // //     return res.status(500).json({ 
// // // //       success: false,
// // // //       error: error.message || 'Internal server error' 
// // // //     });
// // // //   }
// // // // }


// // // // pages/api/journeys/[id]/enroll.ts
// // // import { NextApiRequest, NextApiResponse } from 'next';
// // // import { createClient } from '@supabase/supabase-js';
// // // import type { Database } from '@/types/database';

// // // const supabase = createClient<Database>(
// // //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // // );

// // // /**
// // //  * POST /api/journeys/[id]/enroll - Manually enroll a subscriber in a journey
// // //  */
// // // export default async function handler(
// // //   req: NextApiRequest,
// // //   res: NextApiResponse
// // // ) {
// // //   if (req.method !== 'POST') {
// // //     return res.status(405).json({ error: 'Method not allowed' });
// // //   }

// // //   const { id } = req.query;
// // //   const { subscriber_id, context = {} } = req.body;

// // //   if (!id || typeof id !== 'string') {
// // //     return res.status(400).json({ error: 'Journey ID is required' });
// // //   }

// // //   if (!subscriber_id) {
// // //     return res.status(400).json({ error: 'subscriber_id is required' });
// // //   }

// // //   // Extract user ID from Authorization header
// // //   const authHeader = req.headers.authorization;
// // //   if (!authHeader?.startsWith('Bearer ')) {
// // //     return res.status(401).json({ error: 'Unauthorized' });
// // //   }

// // //   const token = authHeader.substring(7);
// // //   const { data: { user }, error: authError } = await supabase.auth.getUser(token);

// // //   if (authError || !user) {
// // //     return res.status(401).json({ error: 'Invalid token' });
// // //   }

// // //   try {
// // //     // Verify journey ownership and status
// // //     const { data: journey, error: journeyError } = await supabase
// // //       .from('journeys')
// // //       .select('*')
// // //       .eq('id', id)
// // //       .eq('user_id', user.id)
// // //       .single();

// // //     if (journeyError || !journey) {
// // //       return res.status(404).json({ error: 'Journey not found' });
// // //     }

// // //     if (journey.status !== 'active') {
// // //       return res.status(400).json({ error: 'Journey must be active to enroll subscribers' });
// // //     }

// // //     // Verify subscriber exists and belongs to the same website
// // //     const { data: subscriber, error: subscriberError } = await supabase
// // //       .from('subscribers')
// // //       .select('id, website_id')
// // //       .eq('id', subscriber_id)
// // //       .single();

// // //     if (subscriberError || !subscriber) {
// // //       return res.status(404).json({ error: 'Subscriber not found' });
// // //     }

// // //     if (subscriber.website_id !== journey.website_id) {
// // //       return res.status(400).json({ error: 'Subscriber does not belong to this journey\'s website' });
// // //     }

// // //     // Check re-entry rules
// // //     const reEntrySettings = journey.re_entry_settings || {
// // //       allow_re_entry: false,
// // //       cooldown_days: 0,
// // //       max_entries: 1,
// // //     };

// // //     // Check if subscriber is already in the journey
// // //     const { data: existingActiveState } = await supabase
// // //       .from('user_journey_states')
// // //       .select('id, status')
// // //       .eq('journey_id', id)
// // //       .eq('subscriber_id', subscriber_id)
// // //       .in('status', ['active', 'waiting'])
// // //       .maybeSingle();

// // //     if (existingActiveState) {
// // //       return res.status(400).json({ 
// // //         error: 'Subscriber is already active in this journey' 
// // //       });
// // //     }

// // //     // Check if re-entry is allowed
// // //     if (!reEntrySettings.allow_re_entry) {
// // //       const { data: previousStates } = await supabase
// // //         .from('user_journey_states')
// // //         .select('id')
// // //         .eq('journey_id', id)
// // //         .eq('subscriber_id', subscriber_id)
// // //         .limit(1);

// // //       if (previousStates && previousStates.length > 0) {
// // //         return res.status(400).json({ 
// // //           error: 'Re-entry not allowed for this journey' 
// // //         });
// // //       }
// // //     }

// // //     // Check cooldown period
// // //     if (reEntrySettings.cooldown_days > 0) {
// // //       const cooldownDate = new Date();
// // //       cooldownDate.setDate(cooldownDate.getDate() - reEntrySettings.cooldown_days);

// // //       const { data: recentState } = await supabase
// // //         .from('user_journey_states')
// // //         .select('completed_at, exited_at')
// // //         .eq('journey_id', id)
// // //         .eq('subscriber_id', subscriber_id)
// // //         .in('status', ['completed', 'exited'])
// // //         .order('created_at', { ascending: false })
// // //         .limit(1)
// // //         .maybeSingle();

// // //       if (recentState) {
// // //         const lastExitDate = recentState.completed_at || recentState.exited_at;
// // //         if (lastExitDate && new Date(lastExitDate) > cooldownDate) {
// // //           return res.status(400).json({
// // //             error: `Subscriber must wait ${reEntrySettings.cooldown_days} days before re-entering`,
// // //           });
// // //         }
// // //       }
// // //     }

// // //     // Check max entries
// // //     if (reEntrySettings.max_entries > 0) {
// // //       const { count } = await supabase
// // //         .from('user_journey_states')
// // //         .select('id', { count: 'exact', head: true })
// // //         .eq('journey_id', id)
// // //         .eq('subscriber_id', subscriber_id);

// // //       if (count && count >= reEntrySettings.max_entries) {
// // //         return res.status(400).json({
// // //           error: `Subscriber has reached maximum entries (${reEntrySettings.max_entries})`,
// // //         });
// // //       }
// // //     }

// // //     // Get first node in journey
// // //     const flowDefinition = journey.flow_definition;
// // //     const firstNode = flowDefinition.nodes?.[0];

// // //     if (!firstNode) {
// // //       return res.status(400).json({ error: 'Journey has no steps' });
// // //     }

// // //     // Create journey state
// // //     const { data: journeyState, error: stateError } = await supabase
// // //       .from('user_journey_states')
// // //       .insert({
// // //         journey_id: id,
// // //         subscriber_id: subscriber_id,
// // //         current_step_id: firstNode.id,
// // //         status: 'active',
// // //         context: context,
// // //         node_history: [],
// // //         entered_at: new Date().toISOString(),
// // //         last_processed_at: new Date().toISOString(),
// // //       })
// // //       .select()
// // //       .single();

// // //     if (stateError) {
// // //       throw stateError;
// // //     }

// // //     // Log enrollment event
// // //     await supabase.from('journey_events').insert({
// // //       journey_id: id,
// // //       subscriber_id: subscriber_id,
// // //       user_journey_state_id: journeyState.id,
// // //       event_type: 'journey_entered',
// // //       metadata: { 
// // //         enrollment_type: 'manual',
// // //         context: context,
// // //       } as any,
// // //     });

// // //     // Update journey counters
// // //     await supabase.rpc('increment', {
// // //       table_name: 'journeys',
// // //       column_name: 'total_entered',
// // //       row_id: id,
// // //     });

// // //     await supabase.rpc('increment', {
// // //       table_name: 'journeys',
// // //       column_name: 'total_active',
// // //       row_id: id,
// // //     });

// // //     // Trigger journey processor to start the journey
// // //     // This will be handled by the background processor
// // //     console.log(`[Journey ${id}] Subscriber ${subscriber_id} enrolled - State: ${journeyState.id}`);

// // //     return res.status(200).json({
// // //       success: true,
// // //       message: 'Subscriber enrolled successfully',
// // //       journey_state_id: journeyState.id,
// // //     });

// // //   } catch (error: any) {
// // //     console.error('[Journey Enroll] Error:', error);
// // //     return res.status(500).json({ 
// // //       error: error.message || 'Failed to enroll subscriber' 
// // //     });
// // //   }
// // // }


// // // pages/api/journeys/[id]/enroll
// // import { NextApiRequest, NextApiResponse } from 'next';
// // import { createClient } from '@supabase/supabase-js';
// // import type { Database } from '@/types/database';

// // const supabase = createClient<Database>(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // /**
// //  * POST /api/journeys/[id]/enroll - Manually enroll a subscriber in a journey
// //  */
// // export default async function handler(
// //   req: NextApiRequest,
// //   res: NextApiResponse
// // ) {
// //   if (req.method !== 'POST') {
// //     return res.status(405).json({ error: 'Method not allowed' });
// //   }

// //   const { id } = req.query;
// //   const { subscriber_id, context = {} } = req.body;

// //   if (!id || typeof id !== 'string') {
// //     return res.status(400).json({ error: 'Journey ID is required' });
// //   }

// //   if (!subscriber_id) {
// //     return res.status(400).json({ error: 'subscriber_id is required' });
// //   }

// //   // Extract user ID from Authorization header
// //   const authHeader = req.headers.authorization;
// //   if (!authHeader?.startsWith('Bearer ')) {
// //     return res.status(401).json({ error: 'Unauthorized' });
// //   }

// //   const token = authHeader.substring(7);
// //   const { data: { user }, error: authError } = await supabase.auth.getUser(token);

// //   if (authError || !user) {
// //     return res.status(401).json({ error: 'Invalid token' });
// //   }

// //   try {
// //     // Verify journey ownership and status
// //     const { data: journey, error: journeyError } = await supabase
// //       .from('journeys')
// //       .select('*')
// //       .eq('id', id)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (journeyError || !journey) {
// //       return res.status(404).json({ error: 'Journey not found' });
// //     }

// //     if (journey.status !== 'active') {
// //       return res.status(400).json({ error: 'Journey must be active to enroll subscribers' });
// //     }

// //     // Verify subscriber exists and belongs to the same website
// //     const { data: subscriber, error: subscriberError } = await supabase
// //       .from('subscribers')
// //       .select('id, website_id')
// //       .eq('id', subscriber_id)
// //       .single();

// //     if (subscriberError || !subscriber) {
// //       return res.status(404).json({ error: 'Subscriber not found' });
// //     }

// //     if (subscriber.website_id !== journey.website_id) {
// //       return res.status(400).json({ error: 'Subscriber does not belong to this journey\'s website' });
// //     }

// //     // Check re-entry rules
// //     const reEntrySettings = (journey.re_entry_settings as Record<string, any>) || {
// //       allow_re_entry: false,
// //       cooldown_days: 0,
// //       max_entries: 1,
// //     };

// //     // Check if subscriber is already in the journey
// //     const { data: existingActiveState } = await supabase
// //       .from('user_journey_states')
// //       .select('id, status')
// //       .eq('journey_id', id)
// //       .eq('subscriber_id', subscriber_id)
// //       .in('status', ['active', 'waiting'])
// //       .maybeSingle();

// //     if (existingActiveState) {
// //       return res.status(400).json({ 
// //         error: 'Subscriber is already active in this journey' 
// //       });
// //     }

// //     // Check if re-entry is allowed
// //     if (!reEntrySettings.allow_re_entry) {
// //       const { data: previousStates } = await supabase
// //         .from('user_journey_states')
// //         .select('id')
// //         .eq('journey_id', id)
// //         .eq('subscriber_id', subscriber_id)
// //         .limit(1);

// //       if (previousStates && previousStates.length > 0) {
// //         return res.status(400).json({ 
// //           error: 'Re-entry not allowed for this journey' 
// //         });
// //       }
// //     }

// //     // Check cooldown period
// //     if (reEntrySettings.cooldown_days > 0) {
// //       const cooldownDate = new Date();
// //       cooldownDate.setDate(cooldownDate.getDate() - reEntrySettings.cooldown_days);

// //       const { data: recentState } = await supabase
// //         .from('user_journey_states')
// //         .select('completed_at, exited_at')
// //         .eq('journey_id', id)
// //         .eq('subscriber_id', subscriber_id)
// //         .in('status', ['completed', 'exited'])
// //         .order('created_at', { ascending: false })
// //         .limit(1)
// //         .maybeSingle();

// //       if (recentState) {
// //         const lastExitDate = recentState.completed_at || recentState.exited_at;
// //         if (lastExitDate && new Date(lastExitDate) > cooldownDate) {
// //           return res.status(400).json({
// //             error: `Subscriber must wait ${reEntrySettings.cooldown_days} days before re-entering`,
// //           });
// //         }
// //       }
// //     }

// //     // Check max entries
// //     if (reEntrySettings.max_entries > 0) {
// //       const { count } = await supabase
// //         .from('user_journey_states')
// //         .select('id', { count: 'exact', head: true })
// //         .eq('journey_id', id)
// //         .eq('subscriber_id', subscriber_id);

// //       if (count && count >= reEntrySettings.max_entries) {
// //         return res.status(400).json({
// //           error: `Subscriber has reached maximum entries (${reEntrySettings.max_entries})`,
// //         });
// //       }
// //     }

// //     // Get first node in journey
// //     const flowDefinition = journey.flow_definition as { nodes?: Array<{ id: string }> };
// //     const firstNode = flowDefinition.nodes?.[0];

// //     if (!firstNode) {
// //       return res.status(400).json({ error: 'Journey has no steps' });
// //     }

// //     // Create journey state
// //     const { data: journeyState, error: stateError } = await supabase
// //       .from('user_journey_states')
// //       .insert({
// //         journey_id: id,
// //         subscriber_id: subscriber_id,
// //         current_step_id: firstNode.id,
// //         status: 'active',
// //         context: context,
// //         node_history: [],
// //         entered_at: new Date().toISOString(),
// //         last_processed_at: new Date().toISOString(),
// //       })
// //       .select()
// //       .single();

// //     if (stateError) {
// //       throw stateError;
// //     }

// //     // Log enrollment event
// //     await supabase.from('journey_events').insert({
// //       journey_id: id,
// //       subscriber_id: subscriber_id,
// //       user_journey_state_id: journeyState.id,
// //       event_type: 'journey_entered',
// //       metadata: { 
// //         enrollment_type: 'manual',
// //         context: context,
// //       },
// //     });

// //     // Update journey counters
// //     await supabase.rpc('increment', {
// //       table_name: 'journeys',
// //       column_name: 'total_entered',
// //       row_id: id,
// //     });

// //     await supabase.rpc('increment', {
// //       table_name: 'journeys',
// //       column_name: 'total_active',
// //       row_id: id,
// //     });

// //     // Trigger journey processor to start the journey
// //     // This will be handled by the background processor
// //     console.log(`[Journey ${id}] Subscriber ${subscriber_id} enrolled - State: ${journeyState.id}`);

// //     return res.status(200).json({
// //       success: true,
// //       message: 'Subscriber enrolled successfully',
// //       journey_state_id: journeyState.id,
// //     });

// //   } catch (error: any) {
// //     console.error('[Journey Enroll] Error:', error);
// //     return res.status(500).json({ 
// //       error: error.message || 'Failed to enroll subscriber' 
// //     });
// //   }
// // }



























// // app/api/journeys/[id]/enroll/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';
// import { enrollSubscriber } from '@/lib/journeys/processor';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// /**
//  * POST /api/journeys/[journeyId]/enroll
//  * Manually enroll a subscriber in a journey
//  */
// export async function POST(
//   req: NextRequest,
//   { params }: { params: { journeyId: string } }
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

//     const { journeyId } = params;
//     const body = await req.json();
//     const { subscriber_id, context } = body;

//     if (!subscriber_id) {
//       return NextResponse.json({ error: 'subscriber_id is required' }, { status: 400 });
//     }

//     // Verify journey ownership
//     const { data: journey, error: journeyError } = await supabase
//       .from('journeys')
//       .select('id, status, website_id')
//       .eq('id', journeyId)
//       .eq('user_id', user.id)
//       .single();

//     if (journeyError || !journey) {
//       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
//     }

//     if (journey.status !== 'active') {
//       return NextResponse.json({ 
//         error: `Journey must be active to enroll subscribers (current status: ${journey.status})` 
//       }, { status: 400 });
//     }

//     // Verify subscriber exists and belongs to journey's website
//     const { data: subscriber, error: subscriberError } = await supabase
//       .from('subscribers')
//       .select('id, website_id')
//       .eq('id', subscriber_id)
//       .eq('website_id', journey.website_id)
//       .single();

//     if (subscriberError || !subscriber) {
//       return NextResponse.json({ 
//         error: 'Subscriber not found or does not belong to this journey\'s website' 
//       }, { status: 404 });
//     }

//     // Enroll subscriber using processor
//     const journeyState = await enrollSubscriber(journeyId, subscriber_id, {
//       ...context,
//       manual_enrollment: true,
//       enrolled_by: user.email,
//       enrollment_timestamp: new Date().toISOString(),
//     });

//     if (!journeyState) {
//       return NextResponse.json({ 
//         error: 'Could not enroll subscriber. May not meet re-entry criteria or other enrollment conditions.' 
//       }, { status: 400 });
//     }

//     return NextResponse.json({
//       success: true,
//       journey_state: {
//         id: journeyState.id,
//         status: journeyState.status,
//         current_step_id: journeyState.current_step_id,
//         entered_at: journeyState.entered_at,
//       },
//       message: 'Subscriber enrolled successfully',
//     });

//   } catch (error: any) {
//     console.error('[API] Error in POST /api/journeys/[journeyId]/enroll:', error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }











// app/api/journeys/[id]/enroll/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { enrollSubscriber } from '@/lib/journeys/processor';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/journeys/[id]/enroll
 * Manually enroll a subscriber in a journey
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Note: params is a Promise now
) {
  try {
    // Await the params first
    const { id: journeyId } = await params;
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subscriber_id, context } = body;

    if (!subscriber_id) {
      return NextResponse.json({ error: 'subscriber_id is required' }, { status: 400 });
    }

    // Verify journey ownership
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('id, status, website_id')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    if (journey.status !== 'active') {
      return NextResponse.json({
        error: `Journey must be active to enroll subscribers (current status: ${journey.status})`
      }, { status: 400 });
    }

    // Verify subscriber exists and belongs to journey's website
    const { data: subscriber, error: subscriberError } = await supabase
      .from('subscribers')
      .select('id, website_id')
      .eq('id', subscriber_id)
      .eq('website_id', journey.website_id)
      .single();

    if (subscriberError || !subscriber) {
      return NextResponse.json({
        error: 'Subscriber not found or does not belong to this journey\'s website'
      }, { status: 404 });
    }

    // Enroll subscriber using processor
    const journeyState = await enrollSubscriber(journeyId, subscriber_id, {
      ...context,
      manual_enrollment: true,
      enrolled_by: user.email,
      enrollment_timestamp: new Date().toISOString(),
    });

    if (!journeyState) {
      return NextResponse.json({
        error: 'Could not enroll subscriber. May not meet re-entry criteria or other enrollment conditions.'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      journey_state: {
        id: journeyState.id,
        status: journeyState.status,
        current_step_id: journeyState.current_step_id,
        entered_at: journeyState.entered_at,
      },
      message: 'Subscriber enrolled successfully',
    });

  } catch (error: any) {
    console.error('[API] Error in POST /api/journeys/[id]/enroll:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}