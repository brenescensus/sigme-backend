// app/api/admin/affiliates/route.ts
// Admin: Get all affiliates

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/admin-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET = withAdmin(async (req: NextRequest, adminUser) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('affiliates')
      .select(`
        *,
        user_with_profile!affiliates_user_id_fkey (
          email,
          first_name,
          last_name
        )
      `, { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`company_name.ilike.%${search}%,affiliate_code.ilike.%${search}%`);
    }

    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: affiliates, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      affiliates: affiliates || [],
      pagination: {
        total: count || 0,
        page: page,
        limit: limit,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('Get all affiliates error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});