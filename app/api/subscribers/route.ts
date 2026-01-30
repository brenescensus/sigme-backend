// // // // app/api/subscribers/route.ts - CONSOLIDATED VERSION
// // // import { NextRequest, NextResponse } from 'next/server';
// // // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // // // ==========================================
// // // // GET - List all subscribers for a website
// // // // ==========================================
// // // export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
// // //   try {
// // //     const { searchParams } = new URL(req.url);
// // //     const websiteId = searchParams.get('websiteId');

// // //     console.log('[Subscribers GET] User:', user.email, 'Website:', websiteId);

// // //     if (!websiteId) {
// // //       return NextResponse.json(
// // //         { error: 'websiteId parameter is required' },
// // //         { status: 400 }
// // //       );
// // //     }

// // //     // Get authenticated Supabase client
// // //     const supabase = await getAuthenticatedClient(req);

// // //     // First, verify the user owns this website
// // //     const { data: website, error: websiteError } = await supabase
// // //       .from('websites')
// // //       .select('id, user_id, name')
// // //       .eq('id', websiteId)
// // //       .eq('user_id', user.id)
// // //       .single();

// // //     if (websiteError || !website) {
// // //       console.error('[Subscribers GET] Website not found or unauthorized');
// // //       return NextResponse.json(
// // //         { error: 'Website not found or unauthorized' },
// // //         { status: 404 }
// // //       );
// // //     }

// // //     // Get optional filters from query params
// // //     const status = searchParams.get('status');
// // //     const platform = searchParams.get('platform');
// // //     const limit = parseInt(searchParams.get('limit') || '100');
// // //     const offset = parseInt(searchParams.get('offset') || '0');

// // //     // Build query
// // //     let query = supabase
// // //       .from('subscribers')
// // //       .select('*', { count: 'exact' })
// // //       .eq('website_id', websiteId)
// // //       .order('created_at', { ascending: false })
// // //       .range(offset, offset + limit - 1);

// // //     // Apply optional filters
// // //     if (status) {
// // //       query = query.eq('status', status);
// // //     }

// // //     if (platform) {
// // //       query = query.eq('platform', platform);
// // //     }

// // //     // Fetch subscribers
// // //     const { data: subscribers, error, count } = await query;

// // //     if (error) {
// // //       console.error('[Subscribers GET] Database error:', error);
// // //       return NextResponse.json(
// // //         { error: error.message },
// // //         { status: 500 }
// // //       );
// // //     }

// // //     console.log(`[Subscribers GET] Success, count: ${subscribers?.length || 0}`);

// // //     return NextResponse.json({
// // //       success: true,
// // //       subscribers: subscribers || [],
// // //       total: count || 0,
// // //       pagination: {
// // //         limit,
// // //         offset,
// // //         hasMore: (count || 0) > offset + limit,
// // //       },
// // //     });
// // //   } catch (error: any) {
// // //     console.error('[Subscribers GET] Error:', error);
// // //     return NextResponse.json(
// // //       { error: 'Internal server error' },
// // //       { status: 500 }
// // //     );
// // //   }
// // // });




// // // app/api/events/subscriber/route.ts - FIXED FOR NEXT.JS 15
// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@supabase/supabase-js';

// // const supabase = createClient(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // /**
// //  * POST /api/events/subscriber
// //  * Track subscriber events and trigger journeys
// //  */
// // export async function POST(req: NextRequest) {
// //   try {
// //     const body = await req.json();
// //     const { subscriber_id, event_name, event_data } = body;

// //     if (!subscriber_id || !event_name) {
// //       return NextResponse.json(
// //         { error: 'subscriber_id and event_name are required' },
// //         { status: 400 }
// //       );
// //     }

// //     console.log('[Event] Processing:', event_name, 'for subscriber:', subscriber_id);

// //     // Get subscriber
// //     const { data: subscriber, error: subError } = await supabase
// //       .from('subscribers')
// //       .select('*, website_id')
// //       .eq('id', subscriber_id)
// //       .single();

// //     if (subError || !subscriber) {
// //       return NextResponse.json(
// //         { error: 'Subscriber not found' },
// //         { status: 404 }
// //       );
// //     }

// //     // Save event
// //     const { error: eventError } = await supabase
// //       .from('subscriber_events')
// //       .insert({
// //         subscriber_id,
// //         website_id: subscriber.website_id,
// //         event_name,
// //         properties: event_data || {},
// //       });

// //     if (eventError) {
// //       console.error('[Event] Error saving event:', eventError);
// //     }

// //     // TODO: Trigger journey processing
// //     // This would check for journeys that match this event
// //     // and enroll the subscriber or advance them

// //     return NextResponse.json({
// //       success: true,
// //       message: 'Event tracked',
// //     });

// //   } catch (error: any) {
// //     console.error('[Event] Error:', error);
// //     return NextResponse.json(
// //       { error: 'Internal server error' },
// //       { status: 500 }
// //     );
// //   }
// // }

// // //  IMPORTANT: Remove any other exports that might be causing conflicts
// // // Don't export the route as a default export or named export other than POST

// // app/api/subscribers/route.ts - FIXED FOR NEXT.JS 15
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // ==========================================
// // GET - List all subscribers for a website
// // ==========================================
// async function handleGet(req: NextRequest, user: AuthUser) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const websiteId = searchParams.get('websiteId');

//     console.log('[Subscribers GET] User:', user.email, 'Website:', websiteId);

//     if (!websiteId) {
//       return NextResponse.json(
//         { error: 'websiteId parameter is required' },
//         { status: 400 }
//       );
//     }

//     // Get authenticated Supabase client
//     const supabase = await getAuthenticatedClient(req);

//     // First, verify the user owns this website
//     const { data: website, error: websiteError } = await supabase
//       .from('websites')
//       .select('id, user_id, name')
//       .eq('id', websiteId)
//       .eq('user_id', user.id)
//       .single();

//     if (websiteError || !website) {
//       console.error('[Subscribers GET] Website not found or unauthorized');
//       return NextResponse.json(
//         { error: 'Website not found or unauthorized' },
//         { status: 404 }
//       );
//     }

//     // Get optional filters from query params
//     const status = searchParams.get('status');
//     const platform = searchParams.get('platform');
//     const limit = parseInt(searchParams.get('limit') || '100');
//     const offset = parseInt(searchParams.get('offset') || '0');

//     // Build query
//     let query = supabase
//       .from('subscribers')
//       .select('*', { count: 'exact' })
//       .eq('website_id', websiteId)
//       .order('created_at', { ascending: false })
//       .range(offset, offset + limit - 1);

//     // Apply optional filters
//     if (status) {
//       query = query.eq('status', status);
//     }

//     if (platform) {
//       query = query.eq('platform', platform);
//     }

//     // Fetch subscribers
//     const { data: subscribers, error, count } = await query;

//     if (error) {
//       console.error('[Subscribers GET] Database error:', error);
//       return NextResponse.json(
//         { error: error.message },
//         { status: 500 }
//       );
//     }

//     console.log(`[Subscribers GET] Success, count: ${subscribers?.length || 0}`);

//     return NextResponse.json({
//       success: true,
//       subscribers: subscribers || [],
//       total: count || 0,
//       pagination: {
//         limit,
//         offset,
//         hasMore: (count || 0) > offset + limit,
//       },
//     });
//   } catch (error: any) {
//     console.error('[Subscribers GET] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// // Export the wrapped handler
// export const GET = withAuth(handleGet);
// app/api/subscribers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

async function handleGet(req: NextRequest, user: AuthUser) {
  const { searchParams } = new URL(req.url);
  const websiteId = searchParams.get('websiteId');

  if (!websiteId) {
    return NextResponse.json(
      { error: 'websiteId parameter is required' },
      { status: 400 }
    );
  }

  const supabase = await getAuthenticatedClient(req);

  const { data: website } = await supabase
    .from('websites')
    .select('id')
    .eq('id', websiteId)
    .eq('user_id', user.id)
    .single();

  if (!website) {
    return NextResponse.json(
      { error: 'Website not found or unauthorized' },
      { status: 404 }
    );
  }

  const { data, count, error } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact' })
    .eq('website_id', websiteId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    subscribers: data ?? [],
    total: count ?? 0,
  });
}

/**
 * THIS is what Next.js wants to see
 */
export async function GET(req: NextRequest) {
  return withAuth(handleGet)(req);
}
