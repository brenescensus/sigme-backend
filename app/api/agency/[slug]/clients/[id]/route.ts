// app/api/agency/[slug]/clients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getAdminClient } from '@/lib/admin-middleware';

// ── Helper ────────────────────────────────────────────────────────────────
async function resolveAgency(slug: string, userId: string) {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('custom_plans')
    .select('*')
    .eq('agency_subdomain', slug)
    .eq('user_id', userId)
    .eq('is_agency', true)
    .eq('status', 'active')
    .single();

  if (error || !data) return null;
  return data;
}

// ── GET ───────────────────────────────────────────────────────────────────
export const GET = withAuth(async (request: NextRequest, user, { params }: any) => {
  const { slug, id: clientId } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: client, error } = await supabase
    .from('agency_clients')
    .select(`*, agency_client_subscriptions (*)`)
    .eq('id', clientId)
    .eq('agency_plan_id', agency.id)
    .single();

  if (error || !client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  return NextResponse.json({ client });
});

// ── PUT ───────────────────────────────────────────────────────────────────
export const PUT = withAuth(async (request: NextRequest, user, { params }: any) => {
  const { slug, id: clientId } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();

  const { data: client, error } = await supabase
    .from('agency_clients')
    .update({
      first_name: body.first_name,
      last_name: body.last_name,
      company_name: body.company_name,
      contact_email: body.contact_email,
      phone_country_code: body.phone_country_code,
      phone_number: body.phone_number,
      notes: body.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .eq('agency_plan_id', agency.id)
    .select()
    .single();

  if (error) throw error;
  return NextResponse.json({ success: true, client });
});

// ── DELETE ────────────────────────────────────────────────────────────────
export const DELETE = withAuth(async (request: NextRequest, user, { params }: any) => {
  const { slug, id: clientId } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabase
    .from('agency_clients')
    .delete()
    .eq('id', clientId)
    .eq('agency_plan_id', agency.id);

  if (error) throw error;
  return NextResponse.json({ success: true });
});