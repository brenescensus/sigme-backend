// // // pages/api/events/subscriber
// // /**
// //  * Handle subscriber events that may trigger journey actions
// //  * This endpoint receives events and triggers GitHub Actions if needed
// //  */

// // import type { NextApiRequest, NextApiResponse } from 'next';
// // import { createClient } from '@supabase/supabase-js';
// // import type { Database } from '@/types/database';
// // import { Octokit } from '@octokit/rest';
// // import { handleSubscriberEvent } from '@/lib/journeys/journey-processor';

// // const supabase = createClient<Database>(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // // Initialize GitHub client (optional, for async processing)
// // const octokit = process.env.GITHUB_TOKEN ? new Octokit({
// //   auth: process.env.GITHUB_TOKEN,
// // }) : null;

// // const GITHUB_OWNER = process.env.GITHUB_REPOSITORY_OWNER || 'your-org';
// // const GITHUB_REPO = process.env.GITHUB_REPOSITORY_NAME || 'your-repo';

// // export default async function handler(
// //   req: NextApiRequest,
// //   res: NextApiResponse
// // ) {
// //   if (req.method !== 'POST') {
// //     return res.status(405).json({ error: 'Method not allowed' });
// //   }

// //   const { subscriber_id, event_name, event_data, async_processing } = req.body;

// //   if (!subscriber_id || !event_name) {
// //     return res.status(400).json({ 
// //       error: 'Missing required fields: subscriber_id, event_name' 
// //     });
// //   }

// //   try {
// //     // Log the event
// //     const { data: subscriber } = await supabase
// //       .from('subscribers')
// //       .select('website_id')
// //       .eq('id', subscriber_id)
// //       .single();

// //     if (!subscriber) {
// //       return res.status(404).json({ error: 'Subscriber not found' });
// //     }

// //     // Store the event
// //     await supabase.from('subscriber_events').insert({
// //       subscriber_id,
// //       website_id: subscriber.website_id,
// //       event_name,
// //       properties: event_data || {},
// //     });

// //     // Check if this event triggers any journeys
// //     const { data: activeJourneys } = await supabase
// //       .from('journeys')
// //       .select('id, entry_trigger')
// //       .eq('website_id', subscriber.website_id)
// //       .eq('status', 'active');

// //     const triggeredJourneys: string[] = [];

// //     for (const journey of activeJourneys || []) {
// //       const trigger = journey.entry_trigger as any;
      
// //       // Check if event matches trigger
// //       if (trigger.type === 'event' && trigger.event_name === event_name) {
// //         // Check segment filters if any
// //         const passesFilters = await checkSegmentFilters(
// //           subscriber_id,
// //           trigger.segment_filters,
// //           trigger.segment_logic
// //         );

// //         if (passesFilters) {
// //           triggeredJourneys.push(journey.id);
// //         }
// //       }
// //     }

// //     // Process synchronously or asynchronously based on flag
// //     if (async_processing && octokit) {
// //       // Trigger GitHub Actions for async processing
// //       await octokit.repos.createDispatchEvent({
// //         owner: GITHUB_OWNER,
// //         repo: GITHUB_REPO,
// //         event_type: 'subscriber_event',
// //         client_payload: {
// //           subscriber_id,
// //           event_name,
// //           event_data: event_data || {},
// //           triggered_at: new Date().toISOString(),
// //         },
// //       });

// //       return res.status(202).json({
// //         success: true,
// //         message: 'Event queued for async processing',
// //         triggered_journeys: triggeredJourneys,
// //       });
// //     } else {
// //       // Process synchronously
// //       await handleSubscriberEvent(subscriber_id, event_name, event_data || {});

// //       // Enroll in triggered journeys
// //       for (const journeyId of triggeredJourneys) {
// //         try {
// //           const { enrollSubscriber } = await import('@/lib/journey-processor');
// //           await enrollSubscriber(journeyId, subscriber_id, event_data || {});
// //         } catch (error) {
// //           console.error(`Failed to enroll in journey ${journeyId}:`, error);
// //         }
// //       }

// //       return res.status(200).json({
// //         success: true,
// //         message: 'Event processed successfully',
// //         triggered_journeys: triggeredJourneys,
// //       });
// //     }

// //   } catch (error: any) {
// //     console.error('Error handling subscriber event:', error);
// //     return res.status(500).json({
// //       error: 'Failed to process event',
// //       message: error.message,
// //     });
// //   }
// // }

// // async function checkSegmentFilters(
// //   subscriberId: string,
// //   filters: any[] | undefined,
// //   logic: 'AND' | 'OR' = 'AND'
// // ): Promise<boolean> {
// //   if (!filters || filters.length === 0) {
// //     return true;
// //   }

// //   const results = await Promise.all(
// //     filters.map(filter => checkSingleFilter(subscriberId, filter))
// //   );

// //   if (logic === 'AND') {
// //     return results.every(r => r);
// //   } else {
// //     return results.some(r => r);
// //   }
// // }

// // async function checkSingleFilter(subscriberId: string, filter: any): Promise<boolean> {
// //   const { data: subscriber } = await supabase
// //     .from('subscribers')
// //     .select('*')
// //     .eq('id', subscriberId)
// //     .single();

// //   if (!subscriber) {
// //     return false;
// //   }

// //   switch (filter.type) {
// //     case 'url_path':
// //       // Check if subscriber's last seen URL matches pattern
// //       const { data: recentEvent } = await supabase
// //         .from('subscriber_events')
// //         .select('properties')
// //         .eq('subscriber_id', subscriberId)
// //         .eq('event_name', 'page_view')
// //         .order('created_at', { ascending: false })
// //         .limit(1)
// //         .single();

// //       if (!recentEvent?.properties) {
// //         return false;
// //       }

// //       const url = (recentEvent.properties as any).url || '';
// //       const pattern = filter.url_pattern || '';

// //       switch (filter.url_match_type) {
// //         case 'exact':
// //           return url === pattern;
// //         case 'starts_with':
// //           return url.startsWith(pattern);
// //         case 'contains':
// //         default:
// //           return url.includes(pattern);
// //       }

// //     case 'tag':
// //       const tags = (subscriber.tags as string[]) || [];
// //       return tags.includes(filter.tag);

// //     case 'attribute':
// //       const attrs = subscriber.custom_attributes as any || {};
// //       const value = attrs[filter.attribute_key];
      
// //       switch (filter.attribute_operator) {
// //         case 'equals':
// //           return value === filter.attribute_value;
// //         case 'not_equals':
// //           return value !== filter.attribute_value;
// //         case 'contains':
// //           return String(value).includes(String(filter.attribute_value));
// //         case 'greater_than':
// //           return Number(value) > Number(filter.attribute_value);
// //         case 'less_than':
// //           return Number(value) < Number(filter.attribute_value);
// //         default:
// //           return false;
// //       }

// //     case 'behavior':
// //       if (filter.behavior?.type === 'last_active') {
// //         const days = filter.behavior.timeframe_days || 7;
// //         const cutoffDate = new Date();
// //         cutoffDate.setDate(cutoffDate.getDate() - days);

// //         const lastActive = subscriber.last_active_at 
// //           ? new Date(subscriber.last_active_at)
// //           : null;

// //         if (!lastActive) {
// //           return filter.behavior.comparison === 'outside';
// //         }

// //         const isWithin = lastActive >= cutoffDate;
// //         return filter.behavior.comparison === 'within' ? isWithin : !isWithin;
// //       }

// //       if (filter.behavior?.type === 'signup_incomplete') {
// //         return !subscriber.signup_completed;
// //       }

// //       return false;

// //     default:
// //       return false;
// //   }
// // }



// // pages/api/events/subscriber
// import type { NextApiRequest, NextApiResponse } from 'next';
// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   try {
//     const { subscriber_id, event_name, properties = {}, website_id } = req.body;

//     if (!subscriber_id || !event_name || !website_id) {
//       return res.status(400).json({ 
//         error: 'subscriber_id, event_name, and website_id are required' 
//       });
//     }

//     // Log the event
//     const { error: eventError } = await supabase
//       .from('subscriber_events')
//       .insert({
//         subscriber_id,
//         website_id,
//         event_name,
//         properties,
//       });

//     if (eventError) {
//       console.error('Error logging event:', eventError);
//       return res.status(500).json({ error: eventError.message });
//     }

//     // Find journeys triggered by this event
//     const { data: journeys, error: journeysError } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('website_id', website_id)
//       .eq('status', 'active')
//       .contains('entry_trigger', { type: 'event', event_name });

//     if (journeysError) {
//       console.error('Error fetching journeys:', journeysError);
//     }

//     // Enroll subscriber in matching journeys
//     const enrollments = [];
    
//     if (journeys && journeys.length > 0) {
//       for (const journey of journeys) {
//         try {
//           // Check segment filters
//           const passesFilters = await checkSegmentFilters(
//             subscriber_id,
//             journey.entry_trigger?.segment_filters || [],
//             journey.entry_trigger?.segment_logic || 'AND'
//           );

//           if (!passesFilters) {
//             console.log(`Subscriber ${subscriber_id} doesn't match filters for journey ${journey.id}`);
//             continue;
//           }

//           // Enroll subscriber
//           const { data: stateId, error: enrollError } = await supabase
//             .rpc('enroll_subscriber_in_journey', {
//               p_journey_id: journey.id,
//               p_subscriber_id: subscriber_id,
//             });

//           if (enrollError) {
//             console.error(`Enrollment error for journey ${journey.id}:`, enrollError.message);
//             continue;
//           }

//           enrollments.push({
//             journey_id: journey.id,
//             journey_name: journey.name,
//             state_id: stateId,
//           });

//           // Trigger first step processing
//           try {
//             await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/process-journey-step`, {
//               method: 'POST',
//               headers: { 'Content-Type': 'application/json' },
//               body: JSON.stringify({
//                 state_id: stateId,
//                 step_id: journey.flow_definition?.nodes?.[0]?.id,
//               }),
//             });
//           } catch (triggerError) {
//             console.error('Error triggering first step:', triggerError);
//           }

//         } catch (error) {
//           console.error(`Error processing journey ${journey.id}:`, error);
//         }
//       }
//     }

//     // Check for wait-until-event steps
//     const { data: waitingStates, error: waitingError } = await supabase
//       .from('user_journey_states')
//       .select(`
//         *,
//         journeys!inner(flow_definition)
//       `)
//       .eq('status', 'waiting')
//       .eq('subscriber_id', subscriber_id);

//     if (!waitingError && waitingStates) {
//       for (const state of waitingStates) {
//         try {
//           // Get the current node
//           const nodes = state.journeys.flow_definition?.nodes || [];
//           const currentNode = nodes.find((n: any) => n.id === state.current_step_id);

//           if (currentNode?.type === 'wait' && 
//               currentNode?.data?.mode === 'until_event' &&
//               currentNode?.data?.event?.name === event_name) {
            
//             // Event occurred! Move to next step
//             await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/process-journey-step`, {
//               method: 'POST',
//               headers: { 'Content-Type': 'application/json' },
//               body: JSON.stringify({
//                 state_id: state.id,
//                 step_id: state.current_step_id,
//                 event_triggered: true,
//               }),
//             });
//           }
//         } catch (error) {
//           console.error('Error processing waiting state:', error);
//         }
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       event_logged: true,
//       enrollments,
//       message: `Event processed: ${enrollments.length} journey(s) triggered`,
//     });

//   } catch (error: any) {
//     console.error('Subscriber event API error:', error);
//     return res.status(500).json({ 
//       success: false,
//       error: error.message || 'Internal server error' 
//     });
//   }
// }

// async function checkSegmentFilters(
//   subscriberId: string,
//   filters: any[],
//   logic: 'AND' | 'OR'
// ): Promise<boolean> {
//   if (!filters || filters.length === 0) {
//     return true; // No filters = all subscribers match
//   }

//   const results = await Promise.all(
//     filters.map(filter => checkSingleFilter(subscriberId, filter))
//   );

//   return logic === 'AND' 
//     ? results.every(r => r)
//     : results.some(r => r);
// }

// async function checkSingleFilter(
//   subscriberId: string,
//   filter: any
// ): Promise<boolean> {
//   try {
//     const { data: subscriber } = await supabase
//       .from('subscribers')
//       .select('*')
//       .eq('id', subscriberId)
//       .single();

//     if (!subscriber) return false;

//     switch (filter.type) {
//       case 'url_path':
//         // This would need to check recent page views
//         // For now, we'll assume it passes
//         return true;

//       case 'tag':
//         const tags = subscriber.tags || [];
//         if (filter.tag_match === 'has_any') {
//           return (filter.tags || []).some((t: string) => tags.includes(t));
//         } else {
//           return (filter.tags || []).every((t: string) => tags.includes(t));
//         }

//       case 'attribute':
//         const attrs = subscriber.custom_attributes || {};
//         const value = attrs[filter.attribute_key];
        
//         switch (filter.attribute_operator) {
//           case 'equals':
//             return value === filter.attribute_value;
//           case 'not_equals':
//             return value !== filter.attribute_value;
//           case 'contains':
//             return String(value).includes(String(filter.attribute_value));
//           case 'greater_than':
//             return Number(value) > Number(filter.attribute_value);
//           case 'less_than':
//             return Number(value) < Number(filter.attribute_value);
//           default:
//             return false;
//         }

//       case 'behavior':
//         if (filter.behavior?.type === 'last_active') {
//           const lastActive = new Date(subscriber.last_active_at || subscriber.created_at);
//           const now = new Date();
//           const daysDiff = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
//           const timeframeDays = filter.behavior.timeframe_days || 7;

//           if (filter.behavior.comparison === 'within') {
//             return daysDiff <= timeframeDays;
//           } else {
//             return daysDiff > timeframeDays;
//           }
//         }
//         return true;

//       default:
//         return true;
//     }
//   } catch (error) {
//     console.error('Error checking filter:', error);
//     return false;
//   }
// }












import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/events/subscriber
 * Logs subscriber events and triggers journeys
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      subscriber_id,
      event_name,
      properties = {},
      website_id,
    } = body;

    if (!subscriber_id || !event_name || !website_id) {
      return NextResponse.json(
        { error: 'subscriber_id, event_name, and website_id are required' },
        { status: 400 }
      );
    }

    // 1️⃣ Log the event
    const { error: eventError } = await supabase
      .from('subscriber_events')
      .insert({
        subscriber_id,
        website_id,
        event_name,
        properties,
      });

    if (eventError) {
      console.error('[EVENT LOG ERROR]', eventError);
      return NextResponse.json(
        { error: eventError.message },
        { status: 500 }
      );
    }

    // 2️⃣ Find journeys triggered by this event
    const { data: journeys, error: journeysError } = await supabase
      .from('journeys')
      .select('*')
      .eq('website_id', website_id)
      .eq('status', 'active')
      .contains('entry_trigger', {
        type: 'event',
        event_name,
      });

    if (journeysError) {
      console.error('[JOURNEY FETCH ERROR]', journeysError);
    }

    const enrollments: any[] = [];

    // 3️⃣ Enroll subscriber into matching journeys
    if (journeys?.length) {
      for (const journey of journeys) {
        const passesFilters = await checkSegmentFilters(
          subscriber_id,
          journey.entry_trigger?.segment_filters || [],
          journey.entry_trigger?.segment_logic || 'AND'
        );

        if (!passesFilters) continue;

        const { data: stateId, error: enrollError } = await supabase.rpc(
          'enroll_subscriber_in_journey',
          {
            p_journey_id: journey.id,
            p_subscriber_id: subscriber_id,
          }
        );

        if (enrollError) {
          console.error(
            `[ENROLL ERROR] Journey ${journey.id}`,
            enrollError.message
          );
          continue;
        }

        enrollments.push({
          journey_id: journey.id,
          journey_name: journey.name,
          state_id: stateId,
        });

        // Trigger first step
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/process-journey-step`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                state_id: stateId,
                step_id: journey.flow_definition?.nodes?.[0]?.id,
              }),
            }
          );
        } catch (err) {
          console.error('[FIRST STEP TRIGGER ERROR]', err);
        }
      }
    }

    // 4️⃣ Resume "wait until event" steps
    const { data: waitingStates } = await supabase
      .from('user_journey_states')
      .select(
        `
        *,
        journeys!inner(flow_definition)
      `
      )
      .eq('status', 'waiting')
      .eq('subscriber_id', subscriber_id);

    if (waitingStates?.length) {
      for (const state of waitingStates) {
        const nodes = state.journeys.flow_definition?.nodes || [];
        const currentNode = nodes.find(
          (n: any) => n.id === state.current_step_id
        );

        if (
          currentNode?.type === 'wait' &&
          currentNode?.data?.mode === 'until_event' &&
          currentNode?.data?.event?.name === event_name
        ) {
          try {
            await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/process-journey-step`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  state_id: state.id,
                  step_id: state.current_step_id,
                  event_triggered: true,
                }),
              }
            );
          } catch (err) {
            console.error('[WAIT STEP RESUME ERROR]', err);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      enrollments,
      message: `Event processed (${enrollments.length} journey(s) triggered)`,
    });

  } catch (error: any) {
    console.error('[SUBSCRIBER EVENT API ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Optional GET (health check / browser test)
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}

/* --------------------------------------------------
   Segment Filter Helpers
-------------------------------------------------- */

async function checkSegmentFilters(
  subscriberId: string,
  filters: any[],
  logic: 'AND' | 'OR'
): Promise<boolean> {
  if (!filters.length) return true;

  const results = await Promise.all(
    filters.map((f) => checkSingleFilter(subscriberId, f))
  );

  return logic === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean);
}

async function checkSingleFilter(
  subscriberId: string,
  filter: any
): Promise<boolean> {
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('*')
    .eq('id', subscriberId)
    .single();

  if (!subscriber) return false;

  switch (filter.type) {
    case 'tag':
      return (subscriber.tags || []).includes(filter.tag);

    case 'attribute': {
      const value = subscriber.custom_attributes?.[filter.attribute_key];
      if (filter.attribute_operator === 'equals')
        return value === filter.attribute_value;
      if (filter.attribute_operator === 'contains')
        return String(value).includes(String(filter.attribute_value));
      return false;
    }

    case 'behavior':
      return true;

    default:
      return true;
  }
}
