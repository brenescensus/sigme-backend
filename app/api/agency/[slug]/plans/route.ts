// ═══════════════════════════════════════════════════════════════════════════
// app/api/agency/[slug]/plans/route.ts
// GET — list plan tiers  |  POST — create
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getAdminClient } from '@/lib/admin-middleware';
import { resolveAgency, enforceCeiling} from '@/lib/agency-utils'; 


export const GET = withAuth(async (request: NextRequest, user, { params }: any) => {
  const { slug } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: plans, error } = await supabase
    .from('agency_plan_tiers')
    .select('*')
    .eq('agency_custom_plan_id', agency.id)
    .order('display_order');

  if (error) throw error;
  return NextResponse.json({ plans: plans || [] });
});

export const POST = withAuth(async (request: NextRequest, user, { params }: any) => {
  const { slug } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();

  const { data: plan, error } = await supabase
    .from('agency_plan_tiers')
    .insert({
      agency_custom_plan_id: agency.id,
      name: body.name,
      description: body.description,
      monthly_price: body.monthly_price,
      annual_price: body.annual_price || null,
      websites_limit: enforceCeiling(body.websites_limit, agency.websites_limit),
      subscribers_limit: enforceCeiling(body.subscribers_limit, agency.subscribers_limit),
      notifications_limit: enforceCeiling(body.notifications_limit, agency.notifications_limit),
      journeys_limit: enforceCeiling(body.journeys_limit, agency.journeys_limit),
      team_members_limit: enforceCeiling(body.team_members_limit, agency.team_members_limit), 
      is_popular: body.is_popular ?? false,
      is_active: body.is_active ?? true,
      features: body.features || [],
      display_order: body.display_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return NextResponse.json({ success: true, plan });
});
