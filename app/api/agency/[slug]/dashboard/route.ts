// ═══════════════════════════════════════════════════════════════════════════
// app/api/agency/[slug]/dashboard/route.ts
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getAdminClient } from '@/lib/admin-middleware';

async function resolveAgency(slug: string, userId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('custom_plans')
    .select('id, user_id, status, websites_limit, subscribers_limit, notifications_limit, journeys_limit, team_members_limit')
    .eq('agency_subdomain', slug)
    .eq('is_agency', true)
    .single();
  if (error || !data || data.user_id !== userId) return null;
  return data;
}

export const GET = withAuth(async (request: NextRequest, user, { params }: any) => {
  const { slug } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Use the dashboard summary view
  const { data: summary } = await supabase
    .from('agency_dashboard_summary')
    .select('*')
    .eq('agency_plan_id', agency.id)
    .single();

  // Fetch clients with subscription data
  const { data: clients } = await supabase
    .from('agency_clients')
    .select(`
      *,
      agency_client_subscriptions (
        status, plan_name, plan_price,
        websites_limit, websites_used,
        subscribers_limit, subscribers_used,
        notifications_limit, notifications_used,
        subscription_starts_at, subscription_ends_at,
        agency_plan_tier_id
      )
    `)
    .eq('agency_plan_id', agency.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    stats: {
      total_clients: summary?.total_clients ?? 0,
      active_clients: summary?.active_clients ?? 0,
      total_websites: summary?.total_websites_used ?? 0,
      total_notifications: summary?.total_notifications_used ?? 0,
      monthly_revenue: summary?.monthly_revenue ?? 0,
    },
    ceiling: {
      websites_limit: agency.websites_limit,
      subscribers_limit: agency.subscribers_limit,
      notifications_limit: agency.notifications_limit,
    },
    clients: (clients || []).map((c: any) => ({
      id: c.id,
      user_id: c.user_id,
      first_name: c.first_name,
      last_name: c.last_name,
      company_name: c.company_name,
      contact_email: c.contact_email,
      phone_country_code: c.phone_country_code,
      phone_number: c.phone_number,
      status: c.status,
      notes: c.notes,
      created_at: c.created_at,
      ...c.agency_client_subscriptions?.[0],
    })),
  });
});
