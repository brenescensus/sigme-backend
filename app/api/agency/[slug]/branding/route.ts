// // ═══════════════════════════════════════════════════════════════════════════
// // app/api/agency/[slug]/branding/route.ts
// // GET  |  PUT
// // ═══════════════════════════════════════════════════════════════════════════
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth } from '@/lib/auth-middleware';
// import { getAdminClient } from '@/lib/admin-middleware';
// import { resolveAgency } from '@/lib/agency-utils';

// export const GET = withAuth(async (request: NextRequest, user, { params }: any) => {
//   const { slug } = await params;
//   const supabase = getAdminClient();

//   const agency = await resolveAgency(slug, user.id);
//   if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

//   const { data: branding } = await supabase
//     .from('agency_settings')
//     .select('*')
//     .eq('custom_plan_id', agency.id)
//     .single();

//   return NextResponse.json({ branding: branding || null });
// });

// export const PUT= withAuth(async (request: NextRequest, user, { params }: any) => {
//   const { slug } = await params;
//   const supabase = getAdminClient();

//   const agency = await resolveAgency(slug, user.id);
//   if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

//   const body = await request.json();

//   const { data: branding, error } = await supabase
//     .from('agency_settings')
//     .upsert({
//       custom_plan_id: agency.id,
//       name: body.name,
//       logo_url: body.logo_url || null,
//       primary_color: body.primary_color || '#1e3a5f',
//       accent_color: body.accent_color || '#e8a020',
//       support_email: body.support_email || null,
//       custom_css: body.custom_css || null,
//       updated_at: new Date().toISOString(),
//     }, { onConflict: 'custom_plan_id' })
//     .select()
//     .single();

//   if (error) throw error;
//   return NextResponse.json({ success: true, branding });
// });



// app/api/agency/[slug]/branding/route.ts
// GET  — PUBLIC  (no auth — needed by login page to render white-label branding)
// PUT  — PROTECTED (agency owner only)

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getAdminClient } from '@/lib/admin-middleware';
import { resolveAgency } from '@/lib/agency-utils';

// ── GET — public, no token required ─────────────────────────────────────────
// The login page calls this before the user has authenticated, so we cannot
// use withAuth here. We only expose safe branding fields (no PII).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = getAdminClient();

  // Resolve agency by subdomain — no ownership check needed (public data)
  const { data: plan, error: planError } = await supabase
    .from('custom_plans')
    .select('id, plan_name, is_agency, status, agency_subdomain')
    .eq('agency_subdomain', slug)
    .eq('is_agency', true)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
  }

  if (plan.status !== 'active') {
    return NextResponse.json({ error: 'Agency is not active' }, { status: 403 });
  }

  const { data: branding } = await supabase
    .from('agency_settings')
    .select('name, logo_url, primary_color, accent_color, support_email')
    .eq('custom_plan_id', plan.id)
    .single();

  return NextResponse.json({
    branding: branding
      ? {
          agency_name:   branding.name          || plan.plan_name,
          logo_url:      branding.logo_url       || null,
          primary_color: branding.primary_color  || '#1e3a5f',
          accent_color:  branding.accent_color   || '#e8a020',
          support_email: branding.support_email  || null,
        }
      : {
          agency_name:   plan.plan_name,
          logo_url:      null,
          primary_color: '#1e3a5f',
          accent_color:  '#e8a020',
          support_email: null,
        },
  });
}

// ── PUT — protected, agency owner only ──────────────────────────────────────
export const PUT = withAuth(async (
  request: NextRequest,
  user: any,
  { params }: any
) => {
  const { slug } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();

  const { data: branding, error } = await supabase
    .from('agency_settings')
    .upsert({
      custom_plan_id: agency.id,
      name:           body.name           || null,
      logo_url:       body.logo_url       || null,
      primary_color:  body.primary_color  || '#1e3a5f',
      accent_color:   body.accent_color   || '#e8a020',
      support_email:  body.support_email  || null,
      custom_css:     body.custom_css     || null,
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'custom_plan_id' })
    .select()
    .single();

  if (error) throw error;
  return NextResponse.json({ success: true, branding });
});

