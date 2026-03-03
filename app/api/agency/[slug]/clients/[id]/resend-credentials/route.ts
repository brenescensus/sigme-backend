// // app/api/agency/[slug]/clients/[id]/resend-credentials/route.ts

// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth } from '@/lib/auth-middleware';
// import { getAdminClient } from '@/lib/admin-middleware';
// import { resolveAgency } from '@/lib/agency-utils';
// import { sendEmail } from '@/lib/email';

// function generatePassword(length = 12): string {
//   const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
//   const lower   = 'abcdefghjkmnpqrstuvwxyz';
//   const digits  = '23456789';
//   const special = '!@#$%';
//   const all     = upper + lower + digits + special;
//   const chars: string[] = [
//     upper  [Math.floor(Math.random() * upper.length)],
//     lower  [Math.floor(Math.random() * lower.length)],
//     digits [Math.floor(Math.random() * digits.length)],
//     special[Math.floor(Math.random() * special.length)],
//   ];
//   for (let i = 4; i < length; i++) {
//     chars.push(all[Math.floor(Math.random() * all.length)]);
//   }
//   return chars.sort(() => Math.random() - 0.5).join('');
// }

// type RouteContext = { params: Promise<{ slug: string; id: string }> };

// export const POST = withAuth(async (request: NextRequest, user, context: RouteContext) => {
//   const { slug, id } = await context.params;
//   const supabase = getAdminClient();

//   const agency = await resolveAgency(slug, user.id);
//   if (!agency) {
//     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
//   }

//   const { data: client, error: clientError } = await supabase
//     .from('agency_clients')
//     .select('*, agency_client_subscriptions ( plan_name )')
//     .eq('id', id)
//     .eq('agency_plan_id', agency.id)
//     .single();

//   if (clientError || !client) {
//     return NextResponse.json({ error: 'Client not found' }, { status: 404 });
//   }

//   if (!client.user_id) {
//     return NextResponse.json(
//       { error: 'This client has no linked user account. Please contact support.' },
//       { status: 400 }
//     );
//   }

//   const newPassword = generatePassword(12);

//   const { error: updateError } = await supabase.auth.admin.updateUserById(client.user_id, {
//     password: newPassword,
//     user_metadata: { must_change_password: true },
//   });

//   if (updateError) {
//     console.error('[Resend Credentials] Password update failed:', updateError);
//     return NextResponse.json(
//       { error: `Failed to reset password: ${updateError.message}` },
//       { status: 500 }
//     );
//   }

//   const agencyName = agency.organization_name || agency.plan_name || slug;
//   const loginUrl   = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/agency/${slug}/login`;

//   const emailText = `
// Hi ${client.first_name || client.contact_email},

// Your login credentials for ${agencyName}'s portal have been reset.

// Your new credentials:
//   Email:    ${client.contact_email}
//   Password: ${newPassword}

// Login here: ${loginUrl}

// ⚠ IMPORTANT: Please change your password immediately after logging in.

// If you did not request this, please contact your account manager immediately.

// Best regards,
// ${agencyName}
//   `.trim();

//   let emailWarning: string | undefined;

//   try {
//     await sendEmail({
//       to: client.contact_email,
//       subject: `Your new login credentials — ${agencyName}`,
//       text: emailText,
//     });
//     console.log('[Resend Credentials] Credentials emailed to:', client.contact_email);
//   } catch (emailError: any) {
//     console.warn('[Resend Credentials] ⚠ Email send failed:', emailError.message);
//     emailWarning = 'Password was reset but the email could not be delivered. Please send the credentials manually.';
//   }

//   return NextResponse.json({
//     success: true,
//     message: emailWarning ?? `New credentials have been sent to ${client.contact_email}.`,
//     ...(emailWarning ? { warning: true } : {}),
//   });
// });











// app/api/agency/[slug]/clients/[id]/resend-credentials/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getAdminClient } from '@/lib/admin-middleware';
import { resolveAgency } from '@/lib/agency-utils';
import { sendEmail } from '@/lib/email';

function generatePassword(length = 12): string {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const special = '!@#$%';
  const all     = upper + lower + digits + special;
  const chars: string[] = [
    upper  [Math.floor(Math.random() * upper.length)],
    lower  [Math.floor(Math.random() * lower.length)],
    digits [Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = 4; i < length; i++) {
    chars.push(all[Math.floor(Math.random() * all.length)]);
  }
  return chars.sort(() => Math.random() - 0.5).join('');
}

type RouteContext = { params: Promise<{ slug: string; id: string }> };

export const POST = withAuth(async (request: NextRequest, user, context: RouteContext) => {
  const { slug, id } = await context.params;
  const supabase = getAdminClient();

  const agency = await resolveAgency(slug, user.id);
  if (!agency) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: client, error: clientError } = await supabase
    .from('agency_clients')
    .select('*, agency_client_subscriptions ( plan_name )')
    .eq('id', id)
    .eq('agency_plan_id', agency.id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  if (!client.user_id) {
    return NextResponse.json(
      { error: 'This client has no linked user account. Please contact support.' },
      { status: 400 }
    );
  }

  const newPassword = generatePassword(12);

  const { error: updateError } = await supabase.auth.admin.updateUserById(client.user_id, {
    password: newPassword,
    user_metadata: { must_change_password: true },
  });

  if (updateError) {
    console.error('[Resend Credentials] Password update failed:', updateError);
    return NextResponse.json(
      { error: `Failed to reset password: ${updateError.message}` },
      { status: 500 }
    );
  }

  // ── Agency branding for email ─────────────────────────────────────────
  const { data: agencySettings } = await supabase
    .from('agency_settings')
    .select('name, support_email')
    .eq('custom_plan_id', agency.id)
    .single();

  const agencyName   = agencySettings?.name         || agency.plan_name || slug;
  const supportEmail = agencySettings?.support_email || null;

  // ── Login URL: main platform, NOT the agency portal ──────────────────
  // Agency clients log in at app.yourdomain.com just like regular users.
  // The agency portal (/agency/khadiagala/login) is only for the agency OWNER.
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

  const emailText = `
Hi ${client.first_name || client.contact_email},

Your login credentials for ${agencyName} have been reset.

Your new credentials:
  Email:    ${client.contact_email}
  Password: ${newPassword}

Login here: ${loginUrl}

⚠ IMPORTANT: Please change your password immediately after logging in.

${supportEmail ? `Questions? Contact us at ${supportEmail}` : 'If you did not request this, please contact your account manager immediately.'}

Best regards,
The ${agencyName} Team
`.trim();

  let emailWarning: string | undefined;

  try {
    await sendEmail({
      to:      client.contact_email,
      subject: `Your new login credentials — ${agencyName}`,
      text:    emailText,
    });
    console.log('[Resend Credentials] Credentials emailed to:', client.contact_email);
  } catch (emailError: any) {
    console.warn('[Resend Credentials] Email send failed:', emailError.message);
    emailWarning = 'Password was reset but the email could not be delivered. Please send the credentials manually.';
  }

  return NextResponse.json({
    success: true,
    message: emailWarning ?? `New credentials have been sent to ${client.contact_email}.`,
    ...(emailWarning ? { warning: true } : {}),
  });
});