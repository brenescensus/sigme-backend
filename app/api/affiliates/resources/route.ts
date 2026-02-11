// app/api/affiliates/resources/route.ts
// Get affiliate marketing resources (authenticated)

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');

    let query = supabase
      .from('affiliate_resources')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: resources, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      resources: resources || []
    });

  } catch (error: any) {
    console.error('Get resources error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});