// app/api/subscribers/route.ts - CONSOLIDATED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// ==========================================
// GET - List all subscribers for a website
// ==========================================
export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
  try {
    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId');

    console.log('[Subscribers GET] User:', user.email, 'Website:', websiteId);

    if (!websiteId) {
      return NextResponse.json(
        { error: 'websiteId parameter is required' },
        { status: 400 }
      );
    }

    // Get authenticated Supabase client
    const supabase = await getAuthenticatedClient(req);

    // First, verify the user owns this website
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, user_id, name')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (websiteError || !website) {
      console.error('[Subscribers GET] Website not found or unauthorized');
      return NextResponse.json(
        { error: 'Website not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get optional filters from query params
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

    // Apply optional filters
    if (status) {
      query = query.eq('status', status);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    // Fetch subscribers
    const { data: subscribers, error, count } = await query;

    if (error) {
      console.error('[Subscribers GET] Database error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log(`[Subscribers GET] Success, count: ${subscribers?.length || 0}`);

    return NextResponse.json({
      success: true,
      subscribers: subscribers || [],
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
});