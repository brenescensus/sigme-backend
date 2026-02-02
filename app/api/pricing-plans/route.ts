// app/api/pricing-plans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Use service role for public endpoint (no auth required)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Get only active plans, ordered by display_order
    const { data: plans, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      plans: plans || [],
    });
  } catch (error: any) {
    console.error(' Error fetching pricing plans:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pricing plans' },
      { status: 500 }
    );
  }
}