// app/api/agency/[slug]/login/route.ts
// POST — PUBLIC (no auth required — this IS the auth endpoint)
//
// 1. Verify the slug maps to a real, active agency plan
// 2. Sign in with Supabase using email + password
// 3. Confirm the signed-in user owns this agency (their user_id matches the plan)
// 4. Return tokens + user info

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/admin-middleware';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // ── 1. Resolve agency by subdomain ───────────────────────────────────
    const { data: plan, error: planError } = await supabase
      .from('custom_plans')
      .select('id, plan_name, user_id, is_agency, status, agency_subdomain')
      .eq('agency_subdomain', slug)
      .eq('is_agency', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    if (plan.status !== 'active') {
      return NextResponse.json(
        { error: 'This agency account is not active. Please contact support.' },
        { status: 403 }
      );
    }

    // ── 2. Sign in with Supabase Auth ────────────────────────────────────
    // Use a non-admin client so we get a real user session back
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: session, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !session?.user) {
      console.log('[Agency Login] Auth failed:', authError?.message);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // ── 3. Verify the signed-in user owns THIS agency ────────────────────
    // Prevents one agency owner from logging into another agency's portal
    if (session.user.id !== plan.user_id) {
      console.warn(
        `[Agency Login] User ${session.user.id} attempted to access agency ${slug} (owner: ${plan.user_id})`
      );
      return NextResponse.json(
        { error: 'You do not have access to this agency portal' },
        { status: 403 }
      );
    }

    // ── 4. Fetch branding for the response (nice-to-have) ────────────────
    const { data: branding } = await supabase
      .from('agency_settings')
      .select('name, logo_url, primary_color, accent_color')
      .eq('custom_plan_id', plan.id)
      .single();

    console.log(`[Agency Login] ${email} logged into agency portal: ${slug}`);

    return NextResponse.json({
      success: true,
      access_token:  session.session?.access_token,
      refresh_token: session.session?.refresh_token,
      user: {
        id:         session.user.id,
        email:      session.user.email,
        first_name: session.user.user_metadata?.first_name || '',
        last_name:  session.user.user_metadata?.last_name  || '',
      },
      agency: {
        slug,
        plan_id:    plan.id,
        plan_name:  plan.plan_name,
        branding:   branding || null,
      },
    });
  } catch (error: any) {
    console.error('[Agency Login] Error:', error.message);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}