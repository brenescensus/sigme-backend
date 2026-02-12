// app/api/affiliates/account/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    // Get affiliate account
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !affiliate) {
      return NextResponse.json(
        { success: false, error: 'Affiliate account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      affiliate
    });

  } catch (error: any) {
    console.error('Account error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});