// ═══════════════════════════════════════════════════════════════════════════
// app/api/agency/[slug]/plans/[id]/route.ts
// PUT — update  |  DELETE — remove
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getAdminClient } from '@/lib/admin-middleware';
// import { resolveAgency } from '@/lib/agency-utils';
import { resolveAgency, enforceCeiling} from '@/lib/agency-utils'; 

export const PUT = withAuth(async (request: NextRequest, user, { params }: any) => {
  const { slug, planId } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();

  const { data: plan, error } = await supabase
    .from('agency_plan_tiers')
    .update({
      name: body.name,
      description: body.description,
      monthly_price: body.monthly_price,
      annual_price: body.annual_price || null,
      websites_limit: body.websites_limit !== undefined
        ? enforceCeiling(body.websites_limit, agency.websites_limit) : undefined,
      subscribers_limit: body.subscribers_limit !== undefined
        ? enforceCeiling(body.subscribers_limit, agency.subscribers_limit) : undefined,
      notifications_limit: body.notifications_limit !== undefined
        ? enforceCeiling(body.notifications_limit, agency.notifications_limit) : undefined,
      journeys_limit: body.journeys_limit,
      team_members_limit: body.team_members_limit,
      is_popular: body.is_popular,
      is_active: body.is_active,
      features: body.features,
      display_order: body.display_order,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .eq('agency_custom_plan_id', agency.id)
    .select()
    .single();

  if (error) throw error;
  return NextResponse.json({ success: true, plan });
});

export const DELETE = withAuth(async (request: NextRequest, user, { params }: any) => {
  const { slug, planId } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Check no active clients on this plan
  const { count } = await supabase
    .from('agency_client_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('agency_plan_tier_id', planId)
    .eq('status', 'active');

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${count} active client(s) are on this plan.` },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('agency_plan_tiers')
    .delete()
    .eq('id', planId)
    .eq('agency_custom_plan_id', agency.id);

  if (error) throw error;
  return NextResponse.json({ success: true });
});

