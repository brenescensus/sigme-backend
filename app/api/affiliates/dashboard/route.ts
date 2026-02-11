// app/api/affiliates/dashboard/route.ts
// Affiliate dashboard endpoint (authenticated)

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const userId = user.id;

    // Get affiliate account
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !affiliate) {
      return NextResponse.json(
        { success: false, error: 'Affiliate account not found' },
        { status: 404 }
      );
    }

    // Get recent clicks (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentClicks } = await supabase
      .from('affiliate_clicks')
      .select('created_at')
      .eq('affiliate_id', affiliate.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get referrals
    const { data: referrals } = await supabase
      .from('affiliate_referrals')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get pending commissions
    const { data: pendingCommissions } = await supabase
      .from('affiliate_commissions')
      .select('amount')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'pending');

    const pendingTotal = pendingCommissions?.reduce((sum, c) => sum + c.amount, 0) || 0;

    // Calculate conversion rate
    const conversionRate = affiliate.total_clicks > 0
      ? ((affiliate.total_conversions / affiliate.total_clicks) * 100).toFixed(2)
      : '0.00';

    return NextResponse.json({
      success: true,
      dashboard: {
        affiliate,
        stats: {
          total_clicks: affiliate.total_clicks,
          total_signups: affiliate.total_signups,
          total_conversions: affiliate.total_conversions,
          conversion_rate: conversionRate,
          total_earnings: affiliate.total_earnings,
          pending_earnings: pendingTotal,
          paid_earnings: affiliate.paid_earnings
        },
        recent_clicks: recentClicks?.length || 0,
        referrals: referrals || []
      }
    });

  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});