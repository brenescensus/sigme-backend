// app/api/affiliates/analytics/route.ts
// Affiliate analytics endpoint (authenticated)

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
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';

    // Get affiliate ID
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!affiliate) {
      return NextResponse.json(
        { success: false, error: 'Affiliate account not found' },
        { status: 404 }
      );
    }

    // Calculate date range
    const days = parseInt(period.toString().replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get clicks over time
    const { data: clicks } = await supabase
      .from('affiliate_clicks')
      .select('created_at, converted')
      .eq('affiliate_id', affiliate.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Group by date
    const clicksByDate = groupByDate(clicks || []);

    // Get top referrers
    const { data: topReferrers } = await supabase
      .from('affiliate_clicks')
      .select('referrer')
      .eq('affiliate_id', affiliate.id)
      .gte('created_at', startDate.toISOString())
      .not('referrer', 'is', null);

    const referrerCounts = countOccurrences(topReferrers || [], 'referrer');

    // Get device breakdown
    const { data: devices } = await supabase
      .from('affiliate_clicks')
      .select('device_type')
      .eq('affiliate_id', affiliate.id)
      .gte('created_at', startDate.toISOString());

    const deviceCounts = countOccurrences(devices || [], 'device_type');

    return NextResponse.json({
      success: true,
      analytics: {
        clicks_over_time: clicksByDate,
        top_referrers: referrerCounts.slice(0, 10),
        device_breakdown: deviceCounts,
        period: period
      }
    });

  } catch (error: any) {
    console.error('Analytics error:', error);
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

function countOccurrences(items: any[], field: string) {
  const counts: Record<string, number> = {};

  items.forEach(item => {
    const value = item[field] || 'Unknown';
    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}