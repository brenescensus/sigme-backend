// app/api/admin/affiliates/analytics/route.ts
// Admin: Get affiliate program analytics

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
    const period = searchParams.get('period') || '30d';

    // Calculate date range
    const days = parseInt(period.toString().replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total stats
    const { data: affiliates } = await supabase
      .from('affiliates')
      .select('status, total_clicks, total_signups, total_conversions, total_earnings');

    const stats = {
      total_affiliates: affiliates?.length || 0,
      active_affiliates: affiliates?.filter(a => a.status === 'active').length || 0,
      pending_affiliates: affiliates?.filter(a => a.status === 'pending').length || 0,
      total_clicks: affiliates?.reduce((sum, a) => sum + a.total_clicks, 0) || 0,
      total_signups: affiliates?.reduce((sum, a) => sum + a.total_signups, 0) || 0,
      total_conversions: affiliates?.reduce((sum, a) => sum + a.total_conversions, 0) || 0,
      total_earnings: affiliates?.reduce((sum, a) => sum + a.total_earnings, 0) || 0
    };

    // Top performers
    const topPerformers = affiliates
      ?.sort((a, b) => b.total_earnings - a.total_earnings)
      .slice(0, 10);

    // Recent activity
    const { data: recentClicks } = await supabase
      .from('affiliate_clicks')
      .select('created_at, converted')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    const activityByDate = groupByDate(recentClicks || []);

    return NextResponse.json({
      success: true,
      analytics: {
        stats,
        top_performers: topPerformers,
        activity: activityByDate,
        period
      }
    });

  } catch (error: any) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});

function groupByDate(items: any[]) {
  const groups: Record<string, any> = {};

  items.forEach(item => {
    const date = new Date(item.created_at).toISOString().split('T')[0];
    
    if (!groups[date]) {
      groups[date] = {
        date,
        clicks: 0,
        conversions: 0
      };
    }

    groups[date].clicks++;
    if (item.converted) {
      groups[date].conversions++;
    }
  });

  return Object.values(groups);
}