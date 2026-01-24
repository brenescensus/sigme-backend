// app/api/settings/billing-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, AuthUser } from '@/lib/auth-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      console.log('💳 [Billing History] Fetching for user:', user.email);

      const { data: history, error } = await supabase
        .from('billing_history')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(20);

      if (error) {
        console.error('🔴 [Billing History] Fetch error:', error);
        throw error;
      }

      console.log(`✅ [Billing History] Returning ${history?.length || 0} records`);

      return NextResponse.json({
        success: true,
        billing_history: history || [],
      });

    } catch (error: any) {
      console.error('🔴 [Billing History] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch billing history' },
        { status: 500 }
      );
    }
  }
);