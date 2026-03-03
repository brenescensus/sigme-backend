// ═══════════════════════════════════════════════════════════════════════════
// app/api/agency/[slug]/analytics/route.ts
// GET — aggregate performance across all clients
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getAdminClient } from '@/lib/admin-middleware';
import { resolveAgency } from '@/lib/agency-utils';

export const GET = withAuth(async (request: NextRequest, user, { params }: any) => {
  const { slug } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Get all client user IDs for this agency
  const { data: clients } = await supabase
    .from('agency_clients')
    .select('user_id, agency_client_subscriptions(websites_used, subscribers_used, notifications_used)')
    .eq('agency_plan_id', agency.id);

  const userIds = (clients || []).map((c: any) => c.user_id).filter(Boolean);

  // Subscriber growth over time (from websites owned by these users)
  const { data: subGrowth } = userIds.length
    ? await supabase
        .from('subscribers')
        .select('created_at')
        .in('website_id',
          (await supabase.from('websites').select('id').in('user_id', userIds)).data?.map((w: any) => w.id) || []
        )
        .gte('created_at', since)
    : { data: [] };

  // Notification logs
  const { data: notifLogs } = userIds.length
    ? await supabase
        .from('notification_logs')
        .select('status, created_at')
        .in('website_id',
          (await supabase.from('websites').select('id').in('user_id', userIds)).data?.map((w: any) => w.id) || []
        )
        .gte('created_at', since)
    : { data: [] };

  // Aggregate by day
  const subsByDay: Record<string, number> = {};
  const notifsByDay: Record<string, number> = {};

  (subGrowth || []).forEach((s: any) => {
    const day = s.created_at.slice(0, 10);
    subsByDay[day] = (subsByDay[day] || 0) + 1;
  });

  (notifLogs || []).forEach((n: any) => {
    const day = n.created_at.slice(0, 10);
    notifsByDay[day] = (notifsByDay[day] || 0) + 1;
  });

  // Client plan distribution
  const { data: planDist } = await supabase
    .from('agency_client_subscriptions')
    .select('plan_name')
    .in('agency_client_id',
      (clients || []).map((c: any) => c.id)
    );

  const planCounts: Record<string, number> = {};
  (planDist || []).forEach((p: any) => {
    planCounts[p.plan_name] = (planCounts[p.plan_name] || 0) + 1;
  });

  // Totals from subscriptions
  const totals = (clients || []).reduce((acc: any, c: any) => {
    const sub = c.agency_client_subscriptions?.[0];
    acc.websites += sub?.websites_used || 0;
    acc.subscribers += sub?.subscribers_used || 0;
    acc.notifications += sub?.notifications_used || 0;
    return acc;
  }, { websites: 0, subscribers: 0, notifications: 0 });

  return NextResponse.json({
    period_days: days,
    totals,
    subscribers_by_day: subsByDay,
    notifications_by_day: notifsByDay,
    plan_distribution: Object.entries(planCounts).map(([name, count]) => ({ name, count })),
    delivery_rate: notifLogs?.length
      ? Math.round(
          (notifLogs.filter((n: any) => n.status === 'delivered').length / notifLogs.length) * 100
        )
      : 0,
  });
});

