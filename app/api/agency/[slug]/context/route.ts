// // app/api/agency/[slug]/context/route.ts
// // GET — PUBLIC (no auth required)
// //
// // Used by AgencyLayout (before login) to:
// //   - Confirm the agency slug exists and is active
// //   - Return branding for CSS var injection and white-label UI
// //   - Redirect to /agency-not-found if slug is unknown
// //
// // Only safe, non-sensitive fields are returned.

// import { NextRequest, NextResponse } from 'next/server';
// import { getAdminClient } from '@/lib/admin-middleware';

// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ slug: string }> }
// ) {
//   const { slug } = await params;

//   try {
//     const supabase = getAdminClient();

//     // ── Resolve agency by subdomain ──────────────────────────────────────
//     const { data: plan, error: planError } = await supabase
//       .from('custom_plans')
//       .select('id, plan_name, is_agency, status, agency_subdomain')
//       .eq('agency_subdomain', slug)
//       .eq('is_agency', true)
//       .single();

//     if (planError || !plan) {
//       return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
//     }

//     if (plan.status !== 'active') {
//       return NextResponse.json(
//         { error: 'This agency is not currently active' },
//         { status: 403 }
//       );
//     }

//     // ── Fetch branding (may not exist yet — default values used) ─────────
//     const { data: branding } = await supabase
//       .from('agency_settings')
//       .select('name, logo_url, primary_color, accent_color, support_email')
//       .eq('custom_plan_id', plan.id)
//       .single();

//     return NextResponse.json({
//       slug,
//       plan_name: plan.plan_name,
//       agency_branding: branding
//         ? {
//             name:          branding.name          || plan.plan_name,
//             logo_url:      branding.logo_url       || null,
//             primary_color: branding.primary_color  || '#1e3a5f',
//             accent_color:  branding.accent_color   || '#e8a020',
//             support_email: branding.support_email  || null,
//           }
//         : {
//             name:          plan.plan_name,
//             logo_url:      null,
//             primary_color: '#1e3a5f',
//             accent_color:  '#e8a020',
//             support_email: null,
//           },
//     });
//   } catch (error: any) {
//     console.error('[Agency context] Error:', error.message);
//     return NextResponse.json({ error: 'Failed to load agency context' }, { status: 500 });
//   }
// }










// app/api/agency/[slug]/context/route.ts
// GET — PUBLIC (no auth required)

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/admin-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const supabase = getAdminClient();

    // ── Resolve agency + ceiling limits in one query ─────────────────────
    const { data: plan, error: planError } = await supabase
      .from('custom_plans')
      .select(`
        id,
        plan_name,
        is_agency,
        status,
        agency_subdomain,
        websites_limit,
        subscribers_limit,
        notifications_limit,
        journeys_limit,
        team_members_limit
      `)
      .eq('agency_subdomain', slug)
      .eq('is_agency', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    if (plan.status !== 'active') {
      return NextResponse.json(
        { error: 'This agency is not currently active' },
        { status: 403 }
      );
    }

    // ── Fetch branding ────────────────────────────────────────────────────
    const { data: branding } = await supabase
      .from('agency_settings')
      .select('name, logo_url, primary_color, accent_color, support_email')
      .eq('custom_plan_id', plan.id)
      .single();

    return NextResponse.json({
      slug,
      plan_name: plan.plan_name,

      // Ceiling — the limits the agency's own custom_plan grants them.
      // AgencyContext reads this under data.ceiling to build the ceiling object.
      ceiling: {
        websites_limit:      plan.websites_limit      ?? 0,
        subscribers_limit:   plan.subscribers_limit   ?? 0,
        notifications_limit: plan.notifications_limit ?? 0,
        journeys_limit:      plan.journeys_limit      ?? 0,
        team_members_limit:  plan.team_members_limit  ?? 0,
      },

      agency_branding: branding
        ? {
            name:          branding.name          || plan.plan_name,
            logo_url:      branding.logo_url       || null,
            primary_color: branding.primary_color  || null,
            accent_color:  branding.accent_color   || null,
            support_email: branding.support_email  || null,
          }
        : {
            name:          plan.plan_name,
            logo_url:      null,
            primary_color: null,
            accent_color:  null,
            support_email: null,
          },
    });
  } catch (error: any) {
    console.error('[Agency context] Error:', error.message);
    return NextResponse.json({ error: 'Failed to load agency context' }, { status: 500 });
  }
}