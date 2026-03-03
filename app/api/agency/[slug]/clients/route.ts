// // ═══════════════════════════════════════════════════════════════════════════
// // app/api/agency/[slug]/clients/route.ts
// // GET — list all clients  |  POST — create new client
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

//   const { searchParams } = new URL(request.url);
//   const search = searchParams.get('search') || '';
//   const status = searchParams.get('status') || '';

//   let query = supabase
//     .from('agency_clients')
//     .select(`
//       *,
//       agency_client_subscriptions (
//         status, plan_name, plan_price,
//         websites_limit, websites_used,
//         subscribers_limit, subscribers_used,
//         notifications_limit, notifications_used,
//         subscription_starts_at, subscription_ends_at,
//         agency_plan_tier_id
//       )
//     `)
//     .eq('agency_plan_id', agency.id)
//     .order('created_at', { ascending: false });

//   if (status) query = query.eq('status', status);

//   const { data: clients, error } = await query;
//   if (error) throw error;

//   const filtered = search
//     ? clients?.filter((c: any) =>
//         c.first_name?.toLowerCase().includes(search.toLowerCase()) ||
//         c.last_name?.toLowerCase().includes(search.toLowerCase()) ||
//         c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
//         c.contact_email?.toLowerCase().includes(search.toLowerCase())
//       )
//     : clients;

//   return NextResponse.json({ clients: filtered || [] });
// });

// export const POST = withAuth(async (request: NextRequest, user, { params }: any) => {
//   const { slug } = await params;
//   const supabase = getAdminClient();

//   const agency = await resolveAgency(slug, user.id);
//   if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

//   const body = await request.json();
//   const {
//     first_name, last_name, company_name, contact_email,
//     phone_country_code, phone_number,
//     plan_id, subscription_start, subscription_end,
//     temp_password, notes,
//   } = body;

//   if (!first_name || !last_name || !contact_email || !plan_id || !temp_password) {
//     return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
//   }

//   // Resolve plan tier
//   const { data: tier } = await supabase
//     .from('agency_plan_tiers')
//     .select('*')
//     .eq('id', plan_id)
//     .eq('agency_custom_plan_id', agency.id)
//     .single();

//   if (!tier) return NextResponse.json({ error: 'Plan tier not found' }, { status: 404 });

//   // Check if user exists, create if not
//   let clientUserId: string;
//   const { data: existing } = await supabase.auth.admin.listUsers();
//   const existingUser = existing?.users?.find((u: any) => u.email === contact_email);

//   if (existingUser) {
//     clientUserId = existingUser.id;
//   } else {
//     const { data: newUser, error: authErr } = await supabase.auth.admin.createUser({
//       email: contact_email,
//       password: temp_password,
//       email_confirm: true,
//       user_metadata: {
//         first_name, last_name,
//         full_name: `${first_name} ${last_name}`,
//         company_name,
//         account_type: 'agency_client',
//         agency_slug: slug,
//         must_change_password: true,
//       },
//     });
//     if (authErr) throw authErr;
//     clientUserId = newUser.user.id;

//     // Create profile
//     await supabase.from('user_profiles').upsert({ id: clientUserId, first_name, last_name });
//   }

//   // Create agency_clients record
//   const { data: client, error: clientErr } = await supabase
//     .from('agency_clients')
//     .insert({
//       agency_plan_id: agency.id,
//       user_id: clientUserId,
//       first_name, last_name, company_name,
//       contact_email, phone_country_code, phone_number,
//       notes, status: 'active',
//     })
//     .select()
//     .single();

//   if (clientErr) throw clientErr;

//   // Create subscription
//   await supabase.from('agency_client_subscriptions').insert({
//     agency_client_id: client.id,
//     agency_plan_tier_id: tier.id,
//     plan_name: tier.name,
//     plan_price: tier.monthly_price,
//     websites_limit: tier.websites_limit,
//     subscribers_limit: tier.subscribers_limit,
//     notifications_limit: tier.notifications_limit,
//     journeys_limit: tier.journeys_limit,
//     team_members_limit: tier.team_members_limit,
//     status: 'active',
//     subscription_starts_at: subscription_start || new Date().toISOString(),
//     subscription_ends_at: subscription_end || null,
//   });

//   // Mirror limits in user_subscriptions so the platform enforces them
//   await supabase.from('user_subscriptions').upsert({
//     user_id: clientUserId,
//     plan_tier: 'agency_client',
//     plan_name: tier.name,
//     websites_limit: tier.websites_limit,
//     notifications_limit: tier.notifications_limit ?? 0,
//     subscribers_limit: tier.subscribers_limit,
//     status: 'active',
//     subscription_starts_at: subscription_start || new Date().toISOString(),
//     subscription_ends_at: subscription_end || null,
//   }, { onConflict: 'user_id' });

//   // TODO: Send welcome email
//   // await sendAgencyClientWelcomeEmail({ to: contact_email, firstName: first_name, ... });

//   return NextResponse.json({ success: true, client });
// });





// app/api/agency/[slug]/clients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getAdminClient } from '@/lib/admin-middleware';
import { resolveAgency } from '@/lib/agency-utils';
import { sendAgencyClientWelcomeEmail } from '@/lib/emails/agency-client-welcome';

export const GET = withAuth(async (request: NextRequest, user, { params }: any) => {
  const { slug } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';

  let query = supabase
    .from('agency_clients')
    .select(`
      *,
      agency_client_subscriptions (
        status, plan_name, plan_price,
        websites_limit, websites_used,
        subscribers_limit, subscribers_used,
        notifications_limit, notifications_used,
        subscription_starts_at, subscription_ends_at,
        agency_plan_tier_id
      )
    `)
    .eq('agency_plan_id', agency.id)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data: clients, error } = await query;
  if (error) throw error;

  const filtered = search
    ? clients?.filter((c: any) =>
        c.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.last_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.contact_email?.toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  return NextResponse.json({ clients: filtered || [] });
});

export const POST = withAuth(async (request: NextRequest, user, { params }: any) => {
  const { slug } = await params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const {
    first_name, last_name, company_name, contact_email,
    phone_country_code, phone_number,
    plan_id, subscription_start, subscription_end,
    temp_password, notes,
  } = body;

  if (!first_name || !last_name || !contact_email || !plan_id || !temp_password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // ── Resolve plan tier ────────────────────────────────────────────────
  const { data: tier } = await supabase
    .from('agency_plan_tiers')
    .select('*')
    .eq('id', plan_id)
    .eq('agency_custom_plan_id', agency.id)
    .single();

  if (!tier) return NextResponse.json({ error: 'Plan tier not found' }, { status: 404 });

  // ── Fetch agency branding for the welcome email ──────────────────────
  const { data: agencySettings } = await supabase
    .from('agency_settings')
    .select('name, primary_color, support_email')
    .eq('custom_plan_id', agency.id)
    .single();

  const agencyName   = agencySettings?.name          || agency.plan_name || slug;
  const primaryColor = agencySettings?.primary_color  || '#1e3a5f';
  const supportEmail = agencySettings?.support_email  || undefined;

  // ── Create or find auth user ─────────────────────────────────────────
  let clientUserId: string;
  const { data: existing } = await supabase.auth.admin.listUsers();
  const existingUser = existing?.users?.find((u: any) => u.email === contact_email);

  if (existingUser) {
    clientUserId = existingUser.id;
  } else {
    const { data: newUser, error: authErr } = await supabase.auth.admin.createUser({
      email: contact_email,
      password: temp_password,
      email_confirm: true,
      user_metadata: {
        first_name, last_name,
        full_name: `${first_name} ${last_name}`,
        company_name,
        account_type: 'agency_client',
        agency_slug: slug,
        must_change_password: true,
      },
    });
    if (authErr) throw authErr;
    clientUserId = newUser.user.id;

    await supabase.from('user_profiles').upsert({ id: clientUserId, first_name, last_name });
  }

  // ── Create agency_clients record ─────────────────────────────────────
  const { data: client, error: clientErr } = await supabase
    .from('agency_clients')
    .insert({
      agency_plan_id: agency.id,
      user_id: clientUserId,
      first_name, last_name, company_name,
      contact_email, phone_country_code, phone_number,
      notes, status: 'active',
    })
    .select()
    .single();

  if (clientErr) throw clientErr;

  // ── Create subscription ──────────────────────────────────────────────
  await supabase.from('agency_client_subscriptions').insert({
    agency_client_id:    client.id,
    agency_plan_tier_id: tier.id,
    plan_name:           tier.name,
    plan_price:          tier.monthly_price,
    websites_limit:      tier.websites_limit,
    subscribers_limit:   tier.subscribers_limit,
    notifications_limit: tier.notifications_limit,
    journeys_limit:      tier.journeys_limit,
    team_members_limit:  tier.team_members_limit,
    status:              'active',
    subscription_starts_at: subscription_start || new Date().toISOString(),
    subscription_ends_at:   subscription_end   || null,
  });

  // ── Mirror limits in user_subscriptions ──────────────────────────────
  await supabase.from('user_subscriptions').upsert({
    user_id:             clientUserId,
    plan_tier:           'agency_client',
    plan_name:           tier.name,
    plan_price:          tier.monthly_price,
    custom_plan_id:      agency.id,
    websites_limit:      tier.websites_limit,
    notifications_limit: tier.notifications_limit ?? 0,
    subscribers_limit:   tier.subscribers_limit,
    status:              'active',
    subscription_starts_at: subscription_start || new Date().toISOString(),
    subscription_ends_at:   subscription_end   || null,
  }, { onConflict: 'user_id' });

  // ── Send branded welcome email (non-fatal) ────────────────────────────
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

  try {
    await sendAgencyClientWelcomeEmail({
      to:           contact_email,
      firstName:    first_name,
      lastName:     last_name,
      agencyName,
      planName:     tier.name,
      tempPassword: temp_password,
      loginUrl,
      supportEmail,
      primaryColor,
    });
  } catch (emailErr: any) {
    // Client is already created — email failure must not roll back the whole request
    console.warn('[Agency Clients] Welcome email failed (non-fatal):', emailErr.message);
  }

  return NextResponse.json({ success: true, client });
});