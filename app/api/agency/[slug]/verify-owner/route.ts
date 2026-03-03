// app/api/agency/[slug]/verify-owner/route.ts
// GET — PROTECTED (requires agency_token / Bearer token)
//
// Called by AgencyPortalLayout / AgencyAuthGuard on every protected page load.
// Returns 200 + agency info if the token belongs to the owner of this slug.
// Returns 401 if no/invalid token, 403 if wrong user.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/admin-middleware';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // ── Extract Bearer token ──────────────────────────────────────────────
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }

  try {
    const adminSupabase = getAdminClient();

    // ── Verify the JWT and get the user ───────────────────────────────────
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userError } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // ── Resolve agency ────────────────────────────────────────────────────
    const { data: plan, error: planError } = await adminSupabase
      .from('custom_plans')
      .select('id, plan_name, user_id, is_agency, status, agency_subdomain')
      .eq('agency_subdomain', slug)
      .eq('is_agency', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    if (plan.status !== 'active') {
      return NextResponse.json({ error: 'Agency is not active' }, { status: 403 });
    }

    // ── Confirm ownership ─────────────────────────────────────────────────
    if (user.id !== plan.user_id) {
      return NextResponse.json(
        { error: 'You do not have access to this agency portal' },
        { status: 403 }
      );
    }

    // ── Fetch branding ────────────────────────────────────────────────────
    const { data: branding } = await adminSupabase
      .from('agency_settings')
      .select('name, logo_url, primary_color, accent_color, support_email, custom_css')
      .eq('custom_plan_id', plan.id)
      .single();

    return NextResponse.json({
      success: true,
      user: {
        id:         user.id,
        email:      user.email,
        first_name: user.user_metadata?.first_name || '',
        last_name:  user.user_metadata?.last_name  || '',
      },
      agency: {
        slug,
        plan_id:   plan.id,
        plan_name: plan.plan_name,
        status:    plan.status,
        branding:  branding || null,
      },
    });
  } catch (error: any) {
    console.error('[Agency verify-owner] Error:', error.message);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}