
// // app/api/events/track/route.ts 

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';
// import { trackEventWithJourneys } from '@/lib/journeys/entry-handler';

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

// /**
//  * Track subscriber events and trigger journeys
//  */
// export async function POST(request: NextRequest) {
//   try {
//     console.log('[Event Track]  Request received');

//     const body = await request.json();
//     console.log('[Event Track]  Body:', JSON.stringify(body, null, 2));

//     const { 
//       subscriber_id, 
//       event_name,
//       event_data,
//       properties = {},
//       website_id,
//       current_url,
//       user_attributes,
//       tags
//     } = body;

//     // Validate
//     if (!subscriber_id || !event_name) {
//       return NextResponse.json(
//         { success: false, error: 'subscriber_id and event_name are required' },
//         { 
//           status: 400,
//           headers: {
//             'Access-Control-Allow-Origin': '*',
//             'Access-Control-Allow-Methods': 'POST, OPTIONS',
//             'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//           },
//         }
//       );
//     }

//     // Get subscriber
//     const { data: subscriber, error: subError } = await supabase
//       .from('subscribers')
//       .select('*')
//       .eq('id', subscriber_id)
//       .single();

//     if (subError || !subscriber) {
//       return NextResponse.json(
//         { success: false, error: 'Subscriber not found' },
//         { 
//           status: 404,
//           headers: {
//             'Access-Control-Allow-Origin': '*',
//             'Access-Control-Allow-Methods': 'POST, OPTIONS',
//             'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//           },
//         }
//       );
//     }

//     const finalWebsiteId = website_id || subscriber.website_id;

//     if (!finalWebsiteId) {
//       return NextResponse.json(
//         { success: false, error: 'website_id is required' },
//         { 
//           status: 400,
//           headers: {
//             'Access-Control-Allow-Origin': '*',
//             'Access-Control-Allow-Methods': 'POST, OPTIONS',
//             'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//           },
//         }
//       );
//     }

//     // Merge properties
//     const mergedProperties = {
//       ...properties,
//       ...event_data,
//       current_url: current_url || properties.current_url || event_data?.current_url,
//     };

//     // Update subscriber
//     await supabase
//       .from('subscribers')
//       .update({ 
//         last_active_at: new Date().toISOString(),
//         last_seen_at: new Date().toISOString()
//       })
//       .eq('id', subscriber_id);

//     // Handle notification clicks
//     if (event_name === 'notification_clicked') {
//       const campaignId = mergedProperties?.campaign_id;

//       if (campaignId) {
//         try {
//           const { data: logs } = await supabase
//             .from('notification_logs')
//             .select('*')
//             .eq('campaign_id', campaignId)
//             .eq('subscriber_id', subscriber_id)
//             .is('clicked_at', null)
//             .order('created_at', { ascending: false })
//             .limit(1);

//           if (logs && logs.length > 0) {
//             await supabase
//               .from('notification_logs')
//               .update({ clicked_at: new Date().toISOString() })
//               .eq('id', logs[0].id);
//           }

//           const { data: campaign } = await supabase
//             .from('campaigns')
//             .select('clicked_count')
//             .eq('id', campaignId)
//             .single();

//           if (campaign) {
//             await supabase
//               .from('campaigns')
//               .update({ clicked_count: (campaign.clicked_count || 0) + 1 })
//               .eq('id', campaignId);
//           }
//         } catch (error: any) {
//           console.error('[Event Track] Click tracking error:', error);
//         }
//       }
//     }

//     // Insert event
//     const { data: event, error: insertError } = await supabase
//       .from('subscriber_events')
//       .insert({
//         subscriber_id,
//         website_id: finalWebsiteId,
//         event_name,
//         properties: mergedProperties
//       })
//       .select()
//       .single();

//     if (insertError) {
//       console.error('[Event Track] Insert error:', insertError);
//       return NextResponse.json(
//         { success: false, error: 'Failed to track event' },
//         { 
//           status: 500,
//           headers: {
//             'Access-Control-Allow-Origin': '*',
//             'Access-Control-Allow-Methods': 'POST, OPTIONS',
//             'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//           },
//         }
//       );
//     }

//     // Trigger journeys (non-blocking)
//     try {
//       await trackEventWithJourneys({
//         subscriber_id,
//         website_id: finalWebsiteId,
//         event_name,
//         event_data: mergedProperties,
//         timestamp: new Date().toISOString(),
//       });
//     } catch (journeyError: any) {
//       console.error('[Event Track] Journey trigger error:', journeyError);
//     }

//     //  RETURN WITH CORS HEADERS
//     return NextResponse.json(
//       {
//         success: true,
//         event_id: event.id,
//         message: 'Event tracked successfully',
//       },
//       {
//         headers: {
//           'Access-Control-Allow-Origin': '*',
//           'Access-Control-Allow-Methods': 'POST, OPTIONS',
//           'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//         },
//       }
//     );

//   } catch (error: any) {
//     console.error('[Event Track] Fatal error:', error);
//     return NextResponse.json(
//       { success: false, error: 'Internal server error' },
//       { 
//         status: 500,
//         headers: {
//           'Access-Control-Allow-Origin': '*',
//           'Access-Control-Allow-Methods': 'POST, OPTIONS',
//           'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//         },
//       }
//     );
//   }
// }

// /**
//  * OPTIONS /api/events/track
//  * Handle CORS preflight requests
//  *  CRITICAL FIX: Include Authorization in allowed headers
//  */
// export async function OPTIONS(request: NextRequest) {
//   return new NextResponse(null, {
//     status: 204,
//     headers: {
//       'Access-Control-Allow-Origin': '*',
//       'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
//       'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
//       'Access-Control-Max-Age': '86400',
//       'Access-Control-Allow-Credentials': 'false',
//     },
//   });
// }

















// app/api/events/track/route.ts - COMPLETE WITH ADVANCED TRIGGERS

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { trackEventWithJourneys } from '@/lib/journeys/entry-handler';
import { checkAdvancedTriggers } from '@/lib/journeys/advanced-entry-checker';

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

/**
 * Track subscriber events and trigger journeys
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Event Track]  Request received');

    const body = await request.json();
    console.log('[Event Track]  Body:', JSON.stringify(body, null, 2));

    const {
      subscriber_id,
      event_name,
      event_data,
      properties = {},
      website_id,
      current_url,
      user_attributes,
      tags
    } = body;

    // Validate
    if (!subscriber_id || !event_name) {
      return NextResponse.json(
        { success: false, error: 'subscriber_id and event_name are required' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Get subscriber
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', subscriber_id)
      .single();

    if (subError || !subscriber) {
      return NextResponse.json(
        { success: false, error: 'Subscriber not found' },
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    const finalWebsiteId = website_id || subscriber.website_id;

    if (!finalWebsiteId) {
      return NextResponse.json(
        { success: false, error: 'website_id is required' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Merge properties
    const mergedProperties = {
      ...properties,
      ...event_data,
      current_url: current_url || properties.current_url || event_data?.current_url,
    };

    // Update subscriber
    await supabase
      .from('subscribers')
      .update({
        last_active_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      })
      .eq('id', subscriber_id);

    // Handle notification clicks
    if (event_name === 'notification_clicked') {
      const campaignId = mergedProperties?.campaign_id;

      if (campaignId) {
        try {
          const { data: logs } = await supabase
            .from('notification_logs')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('subscriber_id', subscriber_id)
            .is('clicked_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (logs && logs.length > 0) {
            await supabase
              .from('notification_logs')
              .update({ clicked_at: new Date().toISOString() })
              .eq('id', logs[0].id);
          }

          const { data: campaign } = await supabase
            .from('campaigns')
            .select('clicked_count')
            .eq('id', campaignId)
            .single();

          if (campaign) {
            await supabase
              .from('campaigns')
              .update({ clicked_count: (campaign.clicked_count || 0) + 1 })
              .eq('id', campaignId);
          }
        } catch (error: any) {
          console.error('[Event Track] Click tracking error:', error);
        }
      }
    }

    // Insert event
    const { data: event, error: insertError } = await supabase
      .from('subscriber_events')
      .insert({
        subscriber_id,
        website_id: finalWebsiteId,
        event_name,
        properties: mergedProperties
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Event Track] ❌ Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to track event' },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    console.log('[Event Track]  Event tracked in database:', event.id);

    //  ADVANCED TRIGGER INTEGRATION 
    let journeysTriggered = 0;

    try {
      // 1. Check advanced triggers (NEW!)
      const advancedMatches = await checkAdvancedTriggers(
        {
          event_name,
          properties: mergedProperties,
          subscriber_id,
          website_id: finalWebsiteId,
        },
        subscriber
      );

      journeysTriggered += advancedMatches.length;

      if (advancedMatches.length > 0) {
        console.log('[Event Track]  Advanced triggers matched:', advancedMatches.length);
        // advancedMatches.forEach(j => {
        //   console.log(`[Event Track]    - ${j.name} (${j.entry_trigger.type})`);

        //  Fixed with proper type assertion and safe access
        (advancedMatches as any[]).forEach((journey: any) => {
          const journeyName = journey?.name || journey?.id || 'Unknown Journey';
          const triggerType = journey?.entry_trigger?.type || 'event';
          console.log(`[Event Track]    - ${journeyName} (${triggerType})`);
        });
        // });
      }

      // 2. Check legacy triggers
      await trackEventWithJourneys({
        subscriber_id,
        website_id: finalWebsiteId,
        event_name,
        event_data: mergedProperties,
        timestamp: new Date().toISOString(),
      });

    } catch (journeyError: any) {
      console.error('[Event Track] ❌ Journey trigger error:', journeyError);
      // Don't fail the request if journey processing fails
    }

    // Return with journey count
    return NextResponse.json(
      {
        success: true,
        event_id: event.id,
        message: 'Event tracked successfully',
        journeys_triggered: journeysTriggered,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );

  } catch (error: any) {
    console.error('[Event Track] ❌ Fatal error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

/**
 * OPTIONS /api/events/track
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'false',
    },
  });
}

/**
 * GET /api/events/track
 * Retrieve tracked events for a subscriber
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriberId = searchParams.get('subscriber_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!subscriberId) {
      return NextResponse.json(
        { success: false, error: 'subscriber_id is required' },
        { status: 400 }
      );
    }

    const { data: events, error } = await supabase
      .from('subscriber_events')
      .select('*')
      .eq('subscriber_id', subscriberId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      events: events || [],
      count: events?.length || 0,
    });

  } catch (error: any) {
    console.error('[Event Track] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}