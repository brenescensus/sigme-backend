// app/api/admin/analytics/overview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';
export const GET = withSuperAdmin(async (req, user) => {
  // const supabase = getAdminClient();
 const supabase = await getAdminClient();
   try {
    // Get all users
    const { data: { users } } = await supabase.auth.admin.listUsers();
    
    const totalUsers = users?.filter(u => 
      !['admin', 'super_admin'].includes(u.user_metadata?.role || 'user')
    ).length || 0;
    
    const totalAdmins = users?.filter(u => 
      ['admin', 'super_admin'].includes(u.user_metadata?.role || 'user')
    ).length || 0;

    // Get active plans
    const { count: activePlans } = await supabase
      .from('pricing_plans')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get monthly revenue
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: billingData } = await supabase
      .from('billing_history')
      .select('amount')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const monthlyRevenue = billingData?.reduce((sum, r) => sum + r.amount, 0) || 0;

    // Get system stats
    const { count: totalWebsites } = await supabase
      .from('websites')
      .select('*', { count: 'exact', head: true });

    const { count: totalSubscribers } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true });

    // Log activity
    await logAdminActivity(user.id, 'VIEW_ANALYTICS', 'system');

    return NextResponse.json({
      total_users: totalUsers,
      total_admins: totalAdmins,
      active_plans: activePlans || 0,
      monthly_revenue: monthlyRevenue,
      total_websites: totalWebsites || 0,
      total_subscribers: totalSubscribers || 0,
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
});