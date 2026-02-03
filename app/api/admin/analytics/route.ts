// app/api/admin/analytics/route.ts
// Legacy analytics endpoint - maintained for backward compatibility
// Recommends using /unified endpoint for new implementations

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';

/**
 * GET /api/admin/analytics
 * Legacy endpoint - returns basic analytics
 * For comprehensive analytics, use /api/admin/analytics/unified
 */
export const GET = withSuperAdmin(async (req, user) => {
  const supabase = getAdminClient();

  try {
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || '30d';

    // Calculate date range
    const end = new Date();
    let start: Date;
    
    switch (timeRange) {
      case '24h':
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get all users
    const { data: { users: allUsers } } = await supabase.auth.admin.listUsers();
    
    const totalUsers = allUsers?.filter(u => 
      !['admin', 'super_admin'].includes(u.user_metadata?.role || 'user')
    ).length || 0;

    // Get new users in period
    const newUsers = allUsers?.filter(u => {
      const created = new Date(u.created_at);
      return created >= start && created <= end;
    }).length || 0;

    // Revenue metrics
    const { data: billingData } = await supabase
      .from('billing_history')
      .select('amount')
      .gte('created_at', start.toISOString());

    const revenue = billingData?.reduce((sum, r) => sum + r.amount, 0) || 0;

    // Website metrics
    const { count: totalWebsites } = await supabase
      .from('websites')
      .select('*', { count: 'exact', head: true });

    // Subscriber metrics
    const { count: totalSubscribers } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true });

    // Active campaigns
    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Log activity
    await logAdminActivity(
      user.id,
      'VIEW_ANALYTICS',
      'analytics',
      undefined,
      { timeRange, endpoint: 'legacy' }
    );

    return NextResponse.json({
      success: true,
      data: {
        total_users: totalUsers,
        new_users: newUsers,
        revenue: revenue,
        total_websites: totalWebsites || 0,
        total_subscribers: totalSubscribers || 0,
        active_campaigns: activeCampaigns || 0,
      },
      metadata: {
        time_range: timeRange,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        note: 'For comprehensive analytics, use /api/admin/analytics/unified',
      },
    });
  } catch (error: any) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
});