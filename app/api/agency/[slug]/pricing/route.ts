// app/api/agency/[slug]/pricing/route.ts  (PUBLIC — no auth)
// GET — public plan tiers for the agency's pricing page
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getAdminClient } from '@/lib/admin-middleware';

export const GET = async (request: NextRequest, { params }: any) => {
  const { slug } = await params;
  const supabase = getAdminClient();

  const { data: agency } = await supabase
    .from('custom_plans')
    .select('id, agency_settings(name, logo_url, primary_color, accent_color)')
    .eq('agency_subdomain', slug)
    .eq('is_agency', true)
    .eq('status', 'active')
    .single();

  if (!agency) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: plans } = await supabase
    .from('agency_plan_tiers')
    .select('id, name, description, monthly_price, annual_price, websites_limit, subscribers_limit, notifications_limit, journeys_limit, team_members_limit, features, is_popular, display_order')
    .eq('agency_custom_plan_id', agency.id)
    .eq('is_active', true)
    .order('display_order');

  return NextResponse.json({
    branding: (agency as any).agency_settings?.[0] || null,
    plans: plans || [],
  });
};
