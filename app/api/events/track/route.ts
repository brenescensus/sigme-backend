// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';
// import { trackEventWithJourneys } from '@/lib/journeys/entry-handler';
// // import { checkAdvancedTriggers } from '@/lib/journeys/advanced-entry-checker';

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

// //  HELPER: Create consistent CORS headers
// function getCorsHeaders(request: NextRequest) {
//   const origin = request.headers.get('origin') || '*';
  
//   return {
//     'Access-Control-Allow-Origin': origin,
//     'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
//     'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
//     'Access-Control-Allow-Credentials': 'false',
//   };
// }

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

//     if (!subscriber_id || !event_name) {
//       return NextResponse.json(
//         { success: false, error: 'subscriber_id and event_name are required' },
//         { status: 400, headers: getCorsHeaders(request) }
//       );
//     }

//     const { data: subscriber, error: subError } = await supabase
//       .from('subscribers')
//       .select('*')
//       .eq('id', subscriber_id)
//       .single();

//     if (subError || !subscriber) {
//       return NextResponse.json(
//         { success: false, error: 'Subscriber not found' },
//         { status: 404, headers: getCorsHeaders(request) }
//       );
//     }

//     const finalWebsiteId = website_id || subscriber.website_id;

//     if (!finalWebsiteId) {
//       return NextResponse.json(
//         { success: false, error: 'website_id is required' },
//         { status: 400, headers: getCorsHeaders(request) }
//       );
//     }

//     const mergedProperties = {
//       ...properties,
//       ...event_data,
//       current_url: current_url || properties.current_url || event_data?.current_url,
//     };

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
//       const journeyId = mergedProperties?.journey_id;

//       // Update notification logs
//       if (journeyId) {
//         const { data: logs } = await supabase
//           .from('notification_logs')
//           .select('*')
//           .eq('journey_id', journeyId)
//           .eq('subscriber_id', subscriber_id)
//           .is('clicked_at', null)
//           .order('created_at', { ascending: false })
//           .limit(1);

//         if (logs && logs.length > 0) {
//           await supabase
//             .from('notification_logs')
//             .update({ clicked_at: new Date().toISOString() })
//             .eq('id', logs[0].id);

//           console.log('[Event Track]  Updated notification log click');
//         }
//       }

//       if (campaignId) {
//         const { data: campaign } = await supabase
//           .from('campaigns')
//           .select('clicked_count')
//           .eq('id', campaignId)
//           .single();

//         if (campaign) {
//           await supabase
//             .from('campaigns')
//             .update({ clicked_count: (campaign.clicked_count || 0) + 1 })
//             .eq('id', campaignId);
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
//       console.error('[Event Track]  Insert error:', insertError);
//       return NextResponse.json(
//         { success: false, error: 'Failed to track event' },
//         { status: 500, headers: getCorsHeaders(request) }
//       );
//     }

//     console.log('[Event Track]  Event tracked:', event.id);

//     let journeysTriggered = 0;

//     try {
//            // Check legacy triggers
//       await trackEventWithJourneys({
//         subscriber_id,
//         website_id: finalWebsiteId,
//         event_name,
//         event_data: mergedProperties,
//         timestamp: new Date().toISOString(),
//       });

//     } catch (journeyError: any) {
//       console.error('[Event Track]  Journey error:', journeyError);
//     }

//     return NextResponse.json(
//       {
//         success: true,
//         event_id: event.id,
//         message: 'Event tracked successfully',
//         journeys_triggered: journeysTriggered,
//       },
//       {
//         headers: getCorsHeaders(request),
//       }
//     );

//   } catch (error: any) {
//     console.error('[Event Track]  Fatal error:', error);
//     return NextResponse.json(
//       { success: false, error: 'Internal server error' },
//       { status: 500, headers: getCorsHeaders(request) }
//     );
//   }
// }

// export async function OPTIONS(request: NextRequest) {
//   return new NextResponse(null, {
//     status: 204,
//     headers: {
//       ...getCorsHeaders(request),
//       'Access-Control-Max-Age': '86400',
//     },
//   });
// }

// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const subscriberId = searchParams.get('subscriber_id');
//     const limit = parseInt(searchParams.get('limit') || '50');

//     if (!subscriberId) {
//       return NextResponse.json(
//         { success: false, error: 'subscriber_id is required' },
//         { status: 400, headers: getCorsHeaders(request) }
//       );
//     }

//     const { data: events, error } = await supabase
//       .from('subscriber_events')
//       .select('*')
//       .eq('subscriber_id', subscriberId)
//       .order('created_at', { ascending: false })
//       .limit(limit);

//     if (error) {
//       return NextResponse.json(
//         { success: false, error: error.message },
//         { status: 500, headers: getCorsHeaders(request) }
//       );
//     }

//     return NextResponse.json(
//       {
//         success: true,
//         events: events || [],
//         count: events?.length || 0,
//       },
//       {
//         headers: getCorsHeaders(request),
//       }
//     );

//   } catch (error: any) {
//     console.error('[Event Track] GET error:', error);
//     return NextResponse.json(
//       { success: false, error: 'Internal server error' },
//       { status: 500, headers: getCorsHeaders(request) }
//     );
//   }
// }





import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { trackEventWithJourneys } from '@/lib/journeys/entry-handler';

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

//  FIXED: Explicit return type, consistent structure
function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin');
  
  if (origin) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };
  }
  
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      subscriber_id,
      event_name,
      event_data,
      properties = {},
      website_id,
      current_url,
    } = body;

    if (!subscriber_id || !event_name) {
      return NextResponse.json(
        { success: false, error: 'subscriber_id and event_name are required' },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', subscriber_id)
      .single();

    if (subError || !subscriber) {
      return NextResponse.json(
        { success: false, error: 'Subscriber not found' },
        { status: 404, headers: getCorsHeaders(request) }
      );
    }

    const finalWebsiteId = website_id || subscriber.website_id;

    if (!finalWebsiteId) {
      return NextResponse.json(
        { success: false, error: 'website_id is required' },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    const mergedProperties = {
      ...properties,
      ...event_data,
      current_url: current_url || properties.current_url || event_data?.current_url,
    };

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
      const journeyId = mergedProperties?.journey_id;

      if (journeyId) {
        const { data: logs } = await supabase
          .from('notification_logs')
          .select('*')
          .eq('journey_id', journeyId)
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
      }

      if (campaignId) {
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
      }
    }

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
      console.error('[Event Track]  Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to track event' },
        { status: 500, headers: getCorsHeaders(request) }
      );
    }

    try {
      await trackEventWithJourneys({
        subscriber_id,
        website_id: finalWebsiteId,
        event_name,
        event_data: mergedProperties,
        timestamp: new Date().toISOString(),
      });
    } catch (journeyError: any) {
      console.error('[Event Track] Journey error:', journeyError);
    }

    return NextResponse.json(
      {
        success: true,
        event_id: event.id,
        message: 'Event tracked successfully',
      },
      { headers: getCorsHeaders(request) }
    );

  } catch (error: any) {
    console.error('[Event Track] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriberId = searchParams.get('subscriber_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!subscriberId) {
      return NextResponse.json(
        { success: false, error: 'subscriber_id is required' },
        { status: 400, headers: getCorsHeaders(request) }
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
        { status: 500, headers: getCorsHeaders(request) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        events: events || [],
        count: events?.length || 0,
      },
      { headers: getCorsHeaders(request) }
    );

  } catch (error: any) {
    console.error('[Event Track] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}