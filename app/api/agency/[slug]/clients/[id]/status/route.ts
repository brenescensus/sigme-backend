// ═══════════════════════════════════════════════════════════════════════════
// app/api/agency/[slug]/clients/[id]/status/route.ts
// PATCH — suspend | reactivate
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getAdminClient } from '@/lib/admin-middleware';
import { resolveAgency } from '@/lib/agency-utils';

export const PATCH = withAuth(async (request: NextRequest, user, { params }: any) => {
  const { slug, clientId } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { action } = await request.json(); // 'suspend' | 'reactivate'
  const newStatus = action === 'suspend' ? 'suspended' : 'active';

  // Update client status
  await supabase
    .from('agency_clients')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', clientId)
    .eq('agency_plan_id', agency.id);

  // Update subscription status
  await supabase
    .from('agency_client_subscriptions')
    .update({ status: newStatus })
    .eq('agency_client_id', clientId);

  // Update user_subscriptions to enforce on platform side
  const { data: ac } = await supabase
    .from('agency_clients')
    .select('user_id')
    .eq('id', clientId)
    .single();

  if (ac?.user_id) {
    await supabase
      .from('user_subscriptions')
      .update({ status: newStatus })
      .eq('user_id', ac.user_id);
  }

  return NextResponse.json({ success: true, status: newStatus });
});
