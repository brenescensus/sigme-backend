// // FILE: app/api/websites/[id]/subscribers/route.ts
// // Get subscribers for a specific website

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';

//   //  GET - Get all subscribers for a specific website
// export async function GET(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id: websiteId } = await params;
//     const supabase = await createClient();

//     // Auth check
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return NextResponse.json(
//         { error: 'Unauthorized' },
//         { status: 401 }
//       );
//     }

//     // Verify website ownership
//     const { data: website, error: websiteError } = await supabase
//       .from('websites')
//       .select('id, name, user_id')
//       .eq('id', websiteId)
//       .eq('user_id', user.id)
//       .single();

//     if (websiteError || !website) {
//       return NextResponse.json(
//         { error: 'Website not found or access denied' },
//         { status: 404 }
//       );
//     }

//     // Get query parameters for filtering
//     const { searchParams } = new URL(req.url);
//     const status = searchParams.get('status') || 'active';
//     const platform = searchParams.get('platform');
//     const limit = parseInt(searchParams.get('limit') || '100');
//     const offset = parseInt(searchParams.get('offset') || '0');

//     // Build query
//     let query = supabase
//       .from('subscribers')
//       .select('*', { count: 'exact' })
//       .eq('website_id', websiteId)
//       .order('subscribed_at', { ascending: false })
//       .range(offset, offset + limit - 1);

//     // Optional filters
//     if (status) {
//       query = query.eq('status', status);
//     }

//     if (platform) {
//       query = query.eq('platform', platform);
//     }

//     const { data, error, count } = await query;

//     if (error) {
//       console.error('[Website Subscribers GET] Database error:', error);
//       return NextResponse.json(
//         { error: error.message },
//         { status: 500 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       website: {
//         id: website.id,
//         name: website.name,
//       },
//       subscribers: data || [],
//       total: count || 0,
//       pagination: {
//         limit,
//         offset,
//         hasMore: (count || 0) > offset + limit,
//       },
//     });

//   } catch (error) {
//     console.error('[Website Subscribers GET] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// /* ============================================================
//    POST - Add subscriber to specific website
// ============================================================ */
// export async function POST(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id: websiteId } = await params;
//     const supabase = await createClient();

//     // Auth check
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return NextResponse.json(
//         { error: 'Unauthorized' },
//         { status: 401 }
//       );
//     }

//     // Verify website ownership
//     const { data: website, error: websiteError } = await supabase
//       .from('websites')
//       .select('id')
//       .eq('id', websiteId)
//       .eq('user_id', user.id)
//       .single();

//     if (websiteError || !website) {
//       return NextResponse.json(
//         { error: 'Website not found or access denied' },
//         { status: 403 }
//       );
//     }

//     const body = await req.json();
//     const { endpoint, p256dh, auth, platform, browser, os, deviceType } = body;

//     if (!endpoint || !p256dh || !auth) {
//       return NextResponse.json(
//         { error: 'endpoint, p256dh, and auth are required' },
//         { status: 400 }
//       );
//     }

//     // Check if subscriber already exists
//     const { data: existing } = await supabase
//       .from('subscribers')
//       .select('id, status')
//       .eq('endpoint', endpoint)
//       .eq('website_id', websiteId)
//       .maybeSingle();

//     if (existing) {
//       if (existing.status === 'active') {
//         return NextResponse.json(
//           { error: 'Subscriber already exists' },
//           { status: 400 }
//         );
//       }

//       // Reactivate if previously unsubscribed
//       const { data, error } = await supabase
//         .from('subscribers')
//         .update({
//           status: 'active',
//           last_seen_at: new Date().toISOString(),
//         })
//         .eq('id', existing.id)
//         .select()
//         .single();

//       if (error) {
//         return NextResponse.json({ error: error.message }, { status: 500 });
//       }

//       return NextResponse.json({
//         success: true,
//         subscriber: data,
//         message: 'Subscriber reactivated',
//       });
//     }

//     // Create new subscriber
//     const { data, error } = await supabase
//       .from('subscribers')
//       .insert({
//         website_id: websiteId,
//         endpoint,
//         p256dh_key: p256dh,
//         auth_key: auth,
//         platform: platform || 'web',
//         browser,
//         os,
//         device_type: deviceType,
//         status: 'active',
//         subscribed_at: new Date().toISOString(),
//         last_seen_at: new Date().toISOString(),
//       })
//       .select()
//       .single();

//     if (error) {
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }

//     return NextResponse.json({
//       success: true,
//       subscriber: data,
//       message: 'Subscriber added successfully',
//     }, { status: 201 });

//   } catch (error) {
//     console.error('[Website Subscribers POST] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }



// app/api/websites/[id]/subscribers/route.ts
// Get subscribers for a specific website - Token-based authentication

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Verify JWT token from Authorization header
 */
function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      fullName: string;
    };
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// ==========================================
// GET - Get all subscribers for a specific website
// ==========================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: websiteId } = await params;

    // Verify JWT token
    const user = verifyToken(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify website ownership
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, name, user_id')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (websiteError || !website) {
      return NextResponse.json(
        { error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('subscribers')
      .select('*', { count: 'exact' })
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Optional filters
    if (status) {
      query = query.eq('status', status);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Website Subscribers GET] Database error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      website: {
        id: website.id,
        name: website.name,
      },
      subscribers: data || [],
      total: count || 0,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });

  } catch (error) {
    console.error('[Website Subscribers GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ==========================================
// POST - Add subscriber to specific website
// ==========================================
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: websiteId } = await params;

    // Verify JWT token
    const user = verifyToken(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify website ownership
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (websiteError || !website) {
      return NextResponse.json(
        { error: 'Website not found or access denied' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { endpoint, p256dh, auth, platform, browser, os, deviceType } = body;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: 'endpoint, p256dh, and auth are required' },
        { status: 400 }
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

  } catch (error) {
    console.error('[Website Subscribers POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}