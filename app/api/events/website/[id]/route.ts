// // app/api/events/website/[id]/route.ts
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
//   { params }: { params: { websiteId: string } }
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

//     const { websiteId } = params;
//     const { searchParams } = new URL(request.url);
//     const limit = parseInt(searchParams.get('limit') || '1000');

//     console.log('[Events] Getting events for website:', websiteId);

//     // Verify user owns this website
//     const { data: website, error: websiteError } = await supabase
//       .from('websites')
//       .select('id, user_id')
//       .eq('id', websiteId)
//       .single();

//     if (websiteError || !website) {
//       return NextResponse.json(
//         { success: false, error: 'Website not found' },
//         { status: 404 }
//       );
//     }

//     if (website.user_id !== user.id) {
//       return NextResponse.json(
//         { success: false, error: 'Unauthorized' },
//         { status: 403 }
//       );
//     }

//     // Get all events for this website
//     const { data: events, error } = await supabase
//       .from('subscriber_events')
//       .select('*')
//       .eq('website_id', websiteId)
//       .order('created_at', { ascending: false })
//       .limit(limit);

//     if (error) {
//       console.error('[Events] Error fetching events:', error);
//       return NextResponse.json(
//         { success: false, error: error.message },
//         { status: 500 }
//       );
//     }

//     // Get unique event names for the EventSelector
//     const uniqueEvents = [...new Set(events?.map(e => e.event_name) || [])];

//     console.log('[Events] ✅ Found', events?.length, 'events');
//     console.log('[Events] 📊 Unique event types:', uniqueEvents.length);

//     return NextResponse.json({
//       success: true,
//       events: events || [],
//       count: events?.length || 0,
//       unique_events: uniqueEvents,
//     });

//   } catch (error: any) {
//     console.error('[Events] Fatal error:', error);
//     return NextResponse.json(
//       { success: false, error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }



// app/api/events/website/[id]/route.ts
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

    // ✅ Await params in Next.js 15+
    const params = await context.params;
    const websiteId = params.id;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');

    console.log('[Events] Getting events for website:', websiteId);

    // Verify user owns this website
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, user_id')
      .eq('id', websiteId)
      .single();

    if (websiteError || !website) {
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    if (website.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get all events for this website
    const { data: events, error } = await supabase
      .from('subscriber_events')
      .select('*')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Events] Error fetching events:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Get unique event names for the EventSelector
    const uniqueEvents = [...new Set(events?.map(e => e.event_name) || [])];

    console.log('[Events] ✅ Found', events?.length, 'events');
    console.log('[Events] 📊 Unique event types:', uniqueEvents.length);

    return NextResponse.json({
      success: true,
      events: events || [],
      count: events?.length || 0,
      unique_events: uniqueEvents,
    });

  } catch (error: any) {
    console.error('[Events] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}