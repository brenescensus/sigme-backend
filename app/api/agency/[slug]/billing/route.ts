// ═══════════════════════════════════════════════════════════════════════════
// app/api/agency/[slug]/billing/route.ts
// GET — agency's own subscription/contract details
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

  // Full plan record
  const { data: plan } = await supabase
    .from('custom_plans')
    .select('*')
    .eq('id', agency.id)
    .single();

  // Usage
  const { data: usage } = await supabase
    .from('custom_plan_usage')
    .select('*')
    .eq('custom_plan_id', agency.id)
    .single();

  // Days remaining
  const daysLeft = plan?.contract_end_date
    ? Math.ceil((new Date(plan.contract_end_date).getTime() - Date.now()) / 86400000)
    : null;

  return NextResponse.json({
    plan: {
      plan_name: plan?.plan_name,
      plan_code: plan?.plan_code,
      status: plan?.status,
      contract_start_date: plan?.contract_start_date,
      contract_end_date: plan?.contract_end_date,
      auto_renew: plan?.auto_renew,
      days_left: daysLeft,
      billing_cycle: plan?.billing_cycle,
      notes: plan?.notes,
      sales_contact: plan?.sales_contact,
    },
    limits: {
      websites_limit: plan?.websites_limit,
      subscribers_limit: plan?.subscribers_limit,
      notifications_limit: plan?.notifications_limit,
      journeys_limit: plan?.journeys_limit,
      team_members_limit: plan?.team_members_limit,
    },
    usage: {
      websites_used: usage?.websites_used || 0,
      subscribers_used: usage?.subscribers_used || 0,
      notifications_used: usage?.notifications_used || 0,
      journeys_used: usage?.journeys_used || 0,
    },
  });
});
