// ═══════════════════════════════════════════════════════════════════════════
// app/api/agency/[slug]/clients/[id]/extend/route.ts
// POST — extend subscription period (works on active OR expired)
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getAdminClient } from '@/lib/admin-middleware';
import { resolveAgency } from '@/lib/agency-utils';

export const POST = withAuth(async (request: NextRequest, user, { params }: any) => {
  const { slug, clientId } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { new_end_date } = await request.json();
  if (!new_end_date) return NextResponse.json({ error: 'new_end_date required' }, { status: 400 });

  // Fetch current subscription for old date (audit purposes)
  const { data: sub } = await supabase
    .from('agency_client_subscriptions')
    .select('subscription_ends_at')
    .eq('agency_client_id', clientId)
    .single();

  // Extend subscription
  await supabase
    .from('agency_client_subscriptions')
    .update({
      subscription_ends_at: new_end_date,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('agency_client_id', clientId);

  // Reactivate client if expired
  await supabase
    .from('agency_clients')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', clientId)
    .eq('agency_plan_id', agency.id);

  // Sync to user_subscriptions
  const { data: ac } = await supabase
    .from('agency_clients')
    .select('user_id')
    .eq('id', clientId)
    .single();

  if (ac?.user_id) {
    await supabase
      .from('user_subscriptions')
      .update({ subscription_ends_at: new_end_date, status: 'active' })
      .eq('user_id', ac.user_id);
  }

  return NextResponse.json({
    success: true,
    previous_end_date: sub?.subscription_ends_at,
    new_end_date,
  });
});

