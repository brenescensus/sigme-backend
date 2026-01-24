// //api/events/subscriber/[id]
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// /**
//  * Get events for a specific subscriber
//  * GET /api/events/subscriber/[id]?limit=50&event_name=notification_clicked
//  */
// export async function GET(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const { id } = params;
//     const { searchParams } = new URL(request.url);
//     const limit = parseInt(searchParams.get('limit') || '50');
//     const eventName = searchParams.get('event_name');

//     let query = supabase
//       .from('subscriber_events')
//       .select('*')
//       .eq('subscriber_id', id)
//       .order('created_at', { ascending: false })
//       .limit(limit);

//     if (eventName) {
//       query = query.eq('event_name', eventName);
//     }

//     const { data: events, error } = await query;

//     if (error) throw error;

//     return NextResponse.json({
//       success: true,
//       events: events || []
//     });
//   } catch (error) {
//     console.error('[Events] Error fetching events:', error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: 'Failed to fetch events'
//       },
//       { status: 500 }
//     );
//   }
// }

//api/events/subscriber/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get events for a specific subscriber
 * GET /api/events/subscriber/[id]?limit=50&event_name=notification_clicked
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Await params before accessing properties
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const eventName = searchParams.get('event_name');

    let query = supabase
      .from('subscriber_events')
      .select('*')
      .eq('subscriber_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventName) {
      query = query.eq('event_name', eventName);
    }

    const { data: events, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      events: events || []
    });
  } catch (error) {
    console.error('[Events] Error fetching events:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch events'
      },
      { status: 500 }
    );
  }
}