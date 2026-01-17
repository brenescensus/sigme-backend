// // FILE: app/api/subscribers/route.ts
// // Get subscribers for a website
// // ============================================================

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';

// export async function GET(req: NextRequest) {
//   try {
//     const supabase = await createClient();


//     const { data: { user }, error: authError } = await supabase.auth.getUser();
//     if (authError || !user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { searchParams } = new URL(req.url);
//     const websiteId = searchParams.get('websiteId');
//     const status = searchParams.get('status');
//     const platform = searchParams.get('platform');
//     const limit = parseInt(searchParams.get('limit') || '100');
//     const offset = parseInt(searchParams.get('offset') || '0');

//     if (!websiteId) {
//       return NextResponse.json(
//         { error: 'websiteId parameter is required' },
//         { status: 400 }
//       );
//     }

//     // Verify website ownership
//     const { data: website } = await supabase
//       .from('websites')
//       .select('id')
//       .eq('id', websiteId)
//       .eq('user_id', user.id)
//       .single();

//     if (!website) {
//       return NextResponse.json(
//         { error: 'Website not found or access denied' },
//         { status: 404 }
//       );
//     }

//     // Build query
//     let query = supabase
//       .from('subscribers')
//       .select('*', { count: 'exact' })
//       .eq('website_id', websiteId);

//     if (status) {
//       query = query.eq('status', status);
//     }

//     if (platform) {
//       query = query.eq('platform', platform);
//     }

//     query = query
//       .order('created_at', { ascending: false })
//       .range(offset, offset + limit - 1);

//     const { data, error, count } = await query;

//     if (error) {
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }

//     return NextResponse.json({
//       success: true,
//       subscribers: data,
//       total: count,
//       limit,
//       offset,
//     });
//   } catch (error: any) {
//     console.error('[Subscribers GET] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// FILE: app/api/subscribers/route.ts
// Get subscribers for user's websites
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId'); // Now optional
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query - get all subscribers from user's websites
    let query = supabase
      .from('subscribers')
      .select(`
        *,
        websites!inner (
          id,
          name,
          user_id
        )
      `, { count: 'exact' })
      .eq('websites.user_id', user.id); // Filter by user's websites

    // Optional: filter by specific website
    if (websiteId) {
      // Verify website ownership first
      const { data: website } = await supabase
        .from('websites')
        .select('id')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!website) {
        return NextResponse.json(
          { error: 'Website not found or access denied' },
          { status: 404 }
        );
      }

      query = query.eq('website_id', websiteId);
    }

    // Optional filters
    if (status) {
      query = query.eq('status', status);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    // Apply ordering and pagination
    query = query
      .order('subscribed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[Subscribers GET] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subscribers: data || [],
      total: count || 0,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error: any) {
    console.error('[Subscribers GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST - Add new subscriber (AUTHENTICATED)
============================================================ */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { websiteId, endpoint, p256dh, auth, platform, browser, os, deviceType } = body;

    if (!websiteId || !endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: 'websiteId, endpoint, p256dh, and auth are required' },
        { status: 400 }
      );
    }

    // Verify website ownership
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (websiteError || !website) {
      return NextResponse.json(
        { error: 'Website not found or access denied' },
        { status: 403 }
      );
    }

    // Check if subscriber already exists
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, status')
      .eq('endpoint', endpoint)
      .eq('website_id', websiteId)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json(
          { error: 'Subscriber already exists' },
          { status: 400 }
        );
      }

      // Reactivate if previously unsubscribed
      const { data, error } = await supabase
        .from('subscribers')
        .update({
          status: 'active',
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        subscriber: data,
        message: 'Subscriber reactivated',
      });
    }

    // Create new subscriber
    const { data, error } = await supabase
      .from('subscribers')
      .insert({
        website_id: websiteId,
        endpoint,
        p256dh_key: p256dh,
        auth_key: auth,
        platform: platform || 'web',
        browser,
        os,
        device_type: deviceType,
        status: 'active',
        subscribed_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subscriber: data,
      message: 'Subscriber added successfully',
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Subscribers POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}