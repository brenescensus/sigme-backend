// // // // app/api/admin/custom-plans/route.ts

// // // import { NextRequest, NextResponse } from 'next/server';
// // // import { withSuperAdmin, getAdminClient } from '@/lib/admin-middleware';

// // // // ============================================
// // // // GET - List all custom plans
// // // // ============================================
// // // export const GET = withSuperAdmin(async (request, user) => {
// // //   try {
// // //     const supabase = await getAdminClient();

// // //     const { data: plans, error } = await supabase
// // //       .from('custom_plans')
// // //       .select(`
// // //         *,
// // //         user_subscriptions (
// // //           user_id,
// // //           status,
// // //           subscription_starts_at,
// // //           subscription_ends_at
// // //         ),
// // //         custom_plan_usage (
// // //           subscribers_used,
// // //           websites_used,
// // //           notifications_used,
// // //           journeys_used,
// // //           team_members_used,
// // //           api_calls_used,
// // //           updated_at
// // //         )
// // //       `)
// // //       .order('created_at', { ascending: false });

// // //     if (error) throw error;

// // //     return NextResponse.json({ success: true, plans });
// // //   } catch (error: any) {
// // //     console.error('[Custom Plans API] GET error:', error);
// // //     return NextResponse.json({ error: error.message }, { status: 500 });
// // //   }
// // // });

// // // // ============================================
// // // // POST - Create new custom plan
// // // // ============================================
// // // export const POST = withSuperAdmin(async (request, user) => {
// // //   try {
// // //     const supabase = await getAdminClient();
// // //     const body = await request.json();

// // //         const {
// // //       plan_code,
// // //       plan_name,
// // //       description,
// // //       user_id,  // Client's user ID
// // //       organization_name,
// // //       contact_email,
// // //       monthly_price,
// // //       annual_price,
// // //       billing_cycle,
      
// // //       // Limits
// // //       subscribers_limit,
// // //       websites_limit,
// // //       notifications_limit,
// // //       journeys_limit,
// // //       team_members_limit,
// // //       api_calls_limit,
// // //       data_retention_days,
      
// // //       // Features
// // //       features,
      
// // //       // Contract
// // //       contract_start_date,
// // //       contract_end_date,
// // //       auto_renew,
      
// // //       // Metadata
// // //       notes,
// // //       sales_contact,
// // //     } = body;

// // //     // Validation
// // //     if (!plan_code || !plan_name || !user_id) {
// // //       return NextResponse.json(
// // //         { error: 'Missing required fields: plan_code, plan_name, user_id' },
// // //         { status: 400 }
// // //       );
// // //     }

// // //     // Create custom plan
// // //     const { data: customPlan, error: planError } = await supabase
// // //       .from('custom_plans')
// // //       .insert({
// // //         plan_code,
// // //         plan_name,
// // //         description,
// // //         user_id,
// // //         organization_name,
// // //         contact_email,
// // //         monthly_price: monthly_price || 0,
// // //         annual_price: annual_price || 0,
// // //         billing_cycle: billing_cycle || 'monthly',
// // //         subscribers_limit: subscribers_limit ?? -1,
// // //         websites_limit: websites_limit ?? -1,
// // //         notifications_limit: notifications_limit ?? -1,
// // //         journeys_limit: journeys_limit ?? -1,
// // //         team_members_limit: team_members_limit ?? -1,
// // //         api_calls_limit: api_calls_limit ?? -1,
// // //         data_retention_days: data_retention_days ?? -1,
// // //         features: features || {},
// // //         contract_start_date,
// // //         contract_end_date,
// // //         auto_renew: auto_renew ?? false,
// // //         notes,
// // //         sales_contact,
// // //         created_by: user.id,
// // //         status: 'draft', // Start as draft
// // //       })
// // //       .select()
// // //       .single();

// // //     if (planError) throw planError;

// // //     // Initialize usage tracking
// // //     const { error: usageError } = await supabase
// // //       .from('custom_plan_usage')
// // //       .insert({
// // //         custom_plan_id: customPlan.id,
// // //         user_id: user_id,
// // //         subscribers_used: 0,
// // //         websites_used: 0,
// // //         notifications_used: 0,
// // //         journeys_used: 0,
// // //         team_members_used: 0,
// // //         api_calls_used: 0,
// // //         period_start: contract_start_date || new Date().toISOString(),
// // //         period_end: contract_end_date,
// // //       });

// // //     if (usageError) {
// // //       console.error('[Custom Plans] Usage init error:', usageError);
// // //     }

// // //     // Log creation
// // //     await supabase.from('custom_plan_audit_log').insert({
// // //       custom_plan_id: customPlan.id,
// // //       action: 'created',
// // //       changes: { plan: customPlan },
// // //       performed_by: user.id,
// // //       performed_by_email: user.email,
// // //     });

// // //     return NextResponse.json({
// // //       success: true,
// // //       plan: customPlan,
// // //       message: 'Custom plan created successfully. Activate it to assign to user.',
// // //     });

// // //   } catch (error: any) {
// // //     console.error('[Custom Plans API] POST error:', error);
// // //     return NextResponse.json(
// // //       { error: error.message },
// // //       { status: 500 }
// // //     );
// // //   }
// // // });











// // // app/api/admin/custom-plans/route.ts

// // import { NextRequest, NextResponse } from 'next/server';
// // import { withSuperAdmin, getAdminClient } from '@/lib/admin-middleware';

// // // ============================================
// // // GET - List all custom plans
// // // ============================================
// // export const GET = withSuperAdmin(async (request, user) => {
// //   try {
// //     const supabase = getAdminClient();

// //     const { data: plans, error } = await supabase
// //       .from('custom_plans')
// //       .select(`
// //         *,
// //         user_subscriptions (
// //           user_id,
// //           status,
// //           subscription_starts_at,
// //           subscription_ends_at
// //         ),
// //         custom_plan_usage (
// //           subscribers_used,
// //           websites_used,
// //           notifications_used,
// //           journeys_used,
// //           team_members_used,
// //           api_calls_used,
// //           updated_at
// //         )
// //       `)
// //       .order('created_at', { ascending: false });

// //     if (error) throw error;

// //     return NextResponse.json({ success: true, plans });
// //   } catch (error: any) {
// //     console.error('[Custom Plans API] GET error:', error);
// //     return NextResponse.json({ error: error.message }, { status: 500 });
// //   }
// // });

// // // ============================================
// // // POST - Create new custom plan + new user
// // // ============================================
// // export const POST = withSuperAdmin(async (request, user) => {
// //   const supabase = getAdminClient();

// //   try {
// //     const body = await request.json();

// //     const {
// //       // Client / new user details
// //       first_name,
// //       last_name,
// //       contact_email,
// //       phone_country_code,
// //       phone_number,
// //       company_name,
// //       organization_name, // alias
// //       temp_password,

// //       // Plan
// //       plan_code,
// //       plan_name,
// //       description,

// //       // Limits
// //       subscribers_limit,
// //       websites_limit,
// //       notifications_limit,
// //       journeys_limit,
// //       team_members_limit,
// //       api_calls_limit,
// //       data_retention_days,
// //       features,

// //       // Period
// //       contract_start_date,
// //       contract_end_date,
// //       auto_renew,

// //       // Agency
// //       is_agency,
// //       agency_subdomain,

// //       // Internal
// //       notes,
// //       sales_contact,
// //     } = body;

// //     const orgName = company_name || organization_name;

// //     // ── Validation ────────────────────────────────────────────────
// //     if (!plan_code || !plan_name) {
// //       return NextResponse.json(
// //         { error: 'Missing required fields: plan_code, plan_name' },
// //         { status: 400 }
// //       );
// //     }
// //     if (!contact_email || !first_name || !last_name) {
// //       return NextResponse.json(
// //         { error: 'Missing required client fields: first_name, last_name, contact_email' },
// //         { status: 400 }
// //       );
// //     }
// //     if (!temp_password || temp_password.length < 8) {
// //       return NextResponse.json(
// //         { error: 'A temporary password of at least 8 characters is required' },
// //         { status: 400 }
// //       );
// //     }
// //     if (is_agency && !agency_subdomain) {
// //       return NextResponse.json(
// //         { error: 'Agency subdomain is required for agency accounts' },
// //         { status: 400 }
// //       );
// //     }

// //     // ── Create or find Supabase Auth user ─────────────────────────
// //     let clientUserId: string;

// //     // Check if user already exists
// //     const { data: existingUsers } = await supabase.auth.admin.listUsers();
// //     const existingUser = existingUsers?.users?.find(u => u.email === contact_email);

// //     if (existingUser) {
// //       clientUserId = existingUser.id;
// //       console.log('[Custom Plans] Using existing user:', clientUserId);
// //     } else {
// //       // Create new auth user
// //       const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
// //         email: contact_email,
// //         password: temp_password,
// //         email_confirm: true, // auto-confirm so they can log in immediately
// //         user_metadata: {
// //           first_name,
// //           last_name,
// //           full_name: `${first_name} ${last_name}`,
// //           company_name: orgName,
// //           phone: phone_country_code && phone_number ? `${phone_country_code}${phone_number}` : undefined,
// //           account_type: 'enterprise',
// //           is_agency: is_agency ?? false,
// //           must_change_password: true, // frontend should check this flag
// //         },
// //       });

// //       if (authError || !newAuthUser?.user) {
// //         console.error('[Custom Plans] Auth user creation failed:', authError);
// //         return NextResponse.json(
// //           { error: `Failed to create user account: ${authError?.message}` },
// //           { status: 500 }
// //         );
// //       }

// //       clientUserId = newAuthUser.user.id;
// //       console.log('[Custom Plans] Created new auth user:', clientUserId);

// //       // Create user profile
// //       await supabase.from('user_profiles').upsert({
// //         id: clientUserId,
// //         first_name,
// //         last_name,
// //       });
// //     }

// //     // ── Create custom plan ────────────────────────────────────────
// //     const { data: customPlan, error: planError } = await supabase
// //       .from('custom_plans')
// //       .insert({
// //         plan_code,
// //         plan_name,
// //         description,
// //         user_id: clientUserId,
// //         organization_name: orgName,
// //         contact_email,
// //         // No pricing stored — billing handled externally via EFT/Bank Transfer
// //         monthly_price: 0,
// //         annual_price: 0,
// //         billing_cycle: 'custom',

// //         // Contact
// //         // We store phone in user_metadata; notes field for internal reference
// //         phone_country_code: phone_country_code || null,
// //         phone_number: phone_number || null,
// //         first_name,
// //         last_name,

// //         // Limits
// //         subscribers_limit: subscribers_limit ?? -1,
// //         websites_limit: websites_limit ?? -1,
// //         notifications_limit: notifications_limit ?? -1,
// //         journeys_limit: journeys_limit ?? -1,
// //         team_members_limit: team_members_limit ?? -1,
// //         api_calls_limit: api_calls_limit ?? -1,
// //         data_retention_days: data_retention_days ?? 365,
// //         features: features || {},

// //         // Period
// //         contract_start_date: contract_start_date || new Date().toISOString(),
// //         contract_end_date: contract_end_date || null,
// //         auto_renew: auto_renew ?? false,

// //         // Agency
// //         is_agency: is_agency ?? false,
// //         agency_subdomain: is_agency ? agency_subdomain : null,

// //         // Meta
// //         notes,
// //         sales_contact,
// //         created_by: user.id,
// //         status: 'draft',
// //       })
// //       .select()
// //       .single();

// //     if (planError) {
// //       console.error('[Custom Plans] Plan insert error:', planError);
// //       throw planError;
// //     }

// //     // ── Initialise usage tracking ─────────────────────────────────
// //     await supabase.from('custom_plan_usage').insert({
// //       custom_plan_id: customPlan.id,
// //       user_id: clientUserId,
// //       subscribers_used: 0,
// //       websites_used: 0,
// //       notifications_used: 0,
// //       journeys_used: 0,
// //       team_members_used: 0,
// //       api_calls_used: 0,
// //       period_start: contract_start_date || new Date().toISOString(),
// //       period_end: contract_end_date || null,
// //     });

// //     // ── Audit log ─────────────────────────────────────────────────
// //     await supabase.from('custom_plan_audit_log').insert({
// //       custom_plan_id: customPlan.id,
// //       action: 'created',
// //       changes: { plan: customPlan, created_by_email: user.email },
// //       performed_by: user.id,
// //       performed_by_email: user.email,
// //     });

// //     // ── Send welcome email ────────────────────────────────────────
// //     // Trigger welcome email with credentials via your email service.
// //     // Adapt this to your email provider (Resend, SendGrid, etc.)
// //     try {
// //       await sendWelcomeEmail({
// //         to: contact_email,
// //         firstName: first_name,
// //         lastName: last_name,
// //         companyName: orgName,
// //         tempPassword: temp_password,
// //         planName: plan_name,
// //         isAgency: is_agency ?? false,
// //         agencySubdomain: agency_subdomain,
// //         loginUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://app.yourdomain.com',
// //       });
// //     } catch (emailError: any) {
// //       // Non-fatal — plan was created; log warning
// //       console.warn('[Custom Plans] Welcome email failed:', emailError.message);
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       plan: customPlan,
// //       user_id: clientUserId,
// //       user_created: !existingUser,
// //       message: existingUser
// //         ? 'Custom plan created for existing user.'
// //         : 'Custom plan created and welcome email sent to client.',
// //     });
// //   } catch (error: any) {
// //     console.error('[Custom Plans API] POST error:', error);
// //     return NextResponse.json({ error: error.message }, { status: 500 });
// //   }
// // });

// // // ============================================
// // // Helper: Send welcome email
// // // Adapt to your email provider
// // // ============================================
// // async function sendWelcomeEmail(params: {
// //   to: string;
// //   firstName: string;
// //   lastName: string;
// //   companyName: string;
// //   tempPassword: string;
// //   planName: string;
// //   isAgency: boolean;
// //   agencySubdomain?: string;
// //   loginUrl: string;
// // }) {
// //   const {
// //     to, firstName, lastName, companyName, tempPassword,
// //     planName, isAgency, agencySubdomain, loginUrl,
// //   } = params;

// //   const agencyNote = isAgency && agencySubdomain
// //     ? `\n\nAs a Marketing Agency partner, your white-label dashboard will be accessible at:\n${agencySubdomain}.yourdomain.com\n\nYou can set your own pricing and manage your clients from there.`
// //     : '';

// //   const emailBody = `
// // Hi ${firstName},

// // Welcome to ${companyName}'s enterprise platform! Your custom plan "${planName}" has been set up and is ready to use.

// // Your login credentials:
// //   Email:    ${to}
// //   Password: ${tempPassword}

// // Login here: ${loginUrl}

// // ⚠ IMPORTANT: For your security, please change your password immediately after your first login. You will be prompted to do so automatically.${agencyNote}

// // If you have any questions or need assistance getting started, please don't hesitate to reach out.

// // Best regards,
// // The Enterprise Team
// //   `.trim();

// //   // ── Example: Resend ──────────────────────────────────────────
// //   // const resend = new Resend(process.env.RESEND_API_KEY);
// //   // await resend.emails.send({
// //   //   from: 'Enterprise <noreply@yourdomain.com>',
// //   //   to,
// //   //   subject: `Welcome to ${planName} — Your login credentials`,
// //   //   text: emailBody,
// //   // });

// //   // ── Example: SendGrid ────────────────────────────────────────
// //   // const sgMail = require('@sendgrid/mail');
// //   // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// //   // await sgMail.send({ to, from: 'noreply@yourdomain.com', subject: `...`, text: emailBody });

// //   // ── Fallback: log to console (replace with real provider) ────
// //   console.log('[Email] Welcome email would be sent to:', to);
// //   console.log('[Email] Body preview:\n', emailBody.slice(0, 300), '...');

// //   // Throw if your email call fails — the POST handler will catch it non-fatally.
// // }





































// // app/api/admin/custom-plans/route.ts
// // POST handler — creates plan + user account + sends welcome email via lib/email.ts

// import { NextRequest, NextResponse } from 'next/server';
// import { withSuperAdmin, getAdminClient } from '@/lib/admin-middleware';
// import { sendEmail } from '@/lib/email';

// // ============================================
// // GET - List all custom plans
// // ============================================
// export const GET = withSuperAdmin(async (request, user) => {
//   try {
//     const supabase = getAdminClient();

//     const { data: plans, error } = await supabase
//       .from('custom_plans')
//       .select(`
//         *,
//         user_subscriptions (
//           user_id, status,
//           subscription_starts_at, subscription_ends_at
//         ),
//         custom_plan_usage (
//           subscribers_used, websites_used, notifications_used,
//           journeys_used, team_members_used, api_calls_used, updated_at
//         )
//       `)
//       .order('created_at', { ascending: false });

//     if (error) throw error;

//     return NextResponse.json({ success: true, plans });
//   } catch (error: any) {
//     console.error('[Custom Plans API] GET error:', error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// });

// // ============================================
// // POST - Create custom plan + user + send email
// // ============================================
// export const POST = withSuperAdmin(async (request, user) => {
//   const supabase = getAdminClient();

//   try {
//     const body = await request.json();

//     const {
//       first_name, last_name, contact_email,
//       phone_country_code, phone_number,
//       company_name, organization_name,
//       temp_password,
//       plan_code, plan_name, description,
//       subscribers_limit, websites_limit, notifications_limit,
//       journeys_limit, team_members_limit, api_calls_limit,
//       data_retention_days, features,
//       contract_start_date, contract_end_date, auto_renew,
//       is_agency, agency_subdomain,
//       notes, sales_contact,
//     } = body;

//     const orgName = company_name || organization_name;

//     // ── Validation ──────────────────────────────────────────────
//     if (!plan_code || !plan_name) {
//       return NextResponse.json(
//         { error: 'Missing required fields: plan_code, plan_name' },
//         { status: 400 }
//       );
//     }
//     if (!contact_email || !first_name || !last_name) {
//       return NextResponse.json(
//         { error: 'Missing required client fields: first_name, last_name, contact_email' },
//         { status: 400 }
//       );
//     }
//     if (!temp_password || temp_password.length < 8) {
//       return NextResponse.json(
//         { error: 'A temporary password of at least 8 characters is required' },
//         { status: 400 }
//       );
//     }
//     if (is_agency && !agency_subdomain) {
//       return NextResponse.json(
//         { error: 'Agency subdomain is required for agency accounts' },
//         { status: 400 }
//       );
//     }

//     // ── Create or find auth user ────────────────────────────────
//     let clientUserId: string;
//     let userCreated = false;

//     const { data: existingUsers } = await supabase.auth.admin.listUsers();
//     const existingUser = existingUsers?.users?.find(u => u.email === contact_email);

//     if (existingUser) {
//       clientUserId = existingUser.id;
//       console.log('[Custom Plans] Existing user found — resetting password:', clientUserId);

//       // Always reset password so the emailed temp_password actually works
//       const { error: pwError } = await supabase.auth.admin.updateUserById(clientUserId, {
//         password: temp_password,
//         user_metadata: { must_change_password: true },
//       });

//       if (pwError) {
//         console.error('[Custom Plans] Failed to reset existing user password:', pwError);
//         return NextResponse.json(
//           { error: `Failed to reset user password: ${pwError.message}` },
//           { status: 500 }
//         );
//       }

//       console.log('[Custom Plans] Password reset for existing user:', clientUserId);
//     } else {
//       const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
//         email: contact_email,
//         password: temp_password,
//         email_confirm: true,
//         user_metadata: {
//           first_name, last_name,
//           full_name: `${first_name} ${last_name}`,
//           company_name: orgName,
//           phone: phone_country_code && phone_number
//             ? `${phone_country_code}${phone_number}` : undefined,
//           account_type: 'enterprise',
//           is_agency: is_agency ?? false,
//           must_change_password: true,
//         },
//       });

//       if (authError || !newAuthUser?.user) {
//         return NextResponse.json(
//           { error: `Failed to create user account: ${authError?.message}` },
//           { status: 500 }
//         );
//       }

//       clientUserId = newAuthUser.user.id;
//       userCreated = true;
//       console.log('[Custom Plans] Created new auth user:', clientUserId);

//       await supabase.from('user_profiles').upsert({ id: clientUserId, first_name, last_name });
//     }

//     // ── Create custom plan row ──────────────────────────────────
//     const { data: customPlan, error: planError } = await supabase
//       .from('custom_plans')
//       .insert({
//         plan_code, plan_name, description,
//         user_id: clientUserId,
//         organization_name: orgName,
//         contact_email,
//         monthly_price: 0,
//         annual_price: 0,
//         billing_cycle: 'custom',
//         phone_country_code: phone_country_code || null,
//         phone_number: phone_number || null,
//         first_name, last_name,
//         subscribers_limit:    subscribers_limit    ?? -1,
//         websites_limit:       websites_limit       ?? -1,
//         notifications_limit:  notifications_limit  ?? -1,
//         journeys_limit:       journeys_limit       ?? -1,
//         team_members_limit:   team_members_limit   ?? -1,
//         api_calls_limit:      api_calls_limit      ?? -1,
//         data_retention_days:  data_retention_days  ?? 365,
//         features: features || {},
//         contract_start_date: contract_start_date || new Date().toISOString(),
//         contract_end_date: contract_end_date || null,
//         auto_renew: auto_renew ?? false,
//         is_agency: is_agency ?? false,
//         agency_subdomain: is_agency ? agency_subdomain : null,
//         notes, sales_contact,
//         created_by: user.id,
//         status: 'draft',
//       })
//       .select()
//       .single();

//     if (planError) throw planError;

//     // ── Usage tracking ──────────────────────────────────────────
//     await supabase.from('custom_plan_usage').insert({
//       custom_plan_id: customPlan.id,
//       user_id: clientUserId,
//       subscribers_used: 0, websites_used: 0, notifications_used: 0,
//       journeys_used: 0, team_members_used: 0, api_calls_used: 0,
//       period_start: contract_start_date || new Date().toISOString(),
//       period_end: contract_end_date || null,
//     });

//     // ── Audit log ───────────────────────────────────────────────
//     await supabase.from('custom_plan_audit_log').insert({
//       custom_plan_id: customPlan.id,
//       action: 'created',
//       changes: { plan: customPlan, created_by_email: user.email },
//       performed_by: user.id,
//       performed_by_email: user.email,
//     });

//     // ── Welcome email ───────────────────────────────────────────
//     const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:8080';

//     const agencyNote = is_agency && agency_subdomain
//       ? `\n\nAs a Marketing Agency partner, your white-label dashboard will be accessible at:\n` +
//         `${agency_subdomain}.yourdomain.com\n\n` +
//         `You can set your own pricing and manage your clients from there.`
//       : '';

//     const emailText = `
// Hi ${first_name},

// Welcome to ${orgName}'s enterprise platform! Your custom plan "${plan_name}" has been set up and is ready to use.

// Your login credentials:
//   Email:    ${contact_email}
//   Password: ${temp_password}

// Login here: ${frontendUrl}

// ⚠ IMPORTANT: For your security, please change your password immediately after your first login. You will be prompted to do so automatically.${agencyNote}

// If you have any questions, please don't hesitate to reach out.

// Best regards,
// The Enterprise Team
//     `.trim();

//     try {
//       await sendEmail({
//         to: contact_email,
//         subject: `Welcome to ${plan_name} — Your login credentials`,
//         text: emailText,
//         from: process.env.EMAIL_FROM,
//       });
//     } catch (emailError: any) {
//       // Non-fatal — plan was created successfully
//       console.warn('[Custom Plans] Welcome email failed (non-fatal):', emailError.message);
//     }

//     return NextResponse.json({
//       success: true,
//       plan: customPlan,
//       user_id: clientUserId,
//       user_created: userCreated,
//       message: userCreated
//         ? 'Custom plan created and welcome email sent to client.'
//         : 'Custom plan created for existing user.',
//     });
//   } catch (error: any) {
//     console.error('[Custom Plans API] POST error:', error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// });




































































// app/api/admin/custom-plans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, getAdminClient } from '@/lib/admin-middleware';
import { sendEmail } from '@/lib/email';

export const GET = withSuperAdmin(async (request, user) => {
  try {
    const supabase = getAdminClient();
    const { data: plans, error } = await supabase
      .from('custom_plans')
      .select(`
        *,
        user_subscriptions (
          user_id, status,
          subscription_starts_at, subscription_ends_at
        ),
        custom_plan_usage (
          subscribers_used, websites_used, notifications_used,
          journeys_used, team_members_used, api_calls_used, updated_at
        )
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    console.error('[Custom Plans API] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withSuperAdmin(async (request, user) => {
  const supabase = getAdminClient();
  try {
    const body = await request.json();
    const {
      first_name, last_name, contact_email,
      phone_country_code, phone_number,
      company_name, organization_name,
      temp_password,
      plan_code, plan_name, description,
      subscribers_limit, websites_limit, notifications_limit,
      journeys_limit, team_members_limit, api_calls_limit,
      data_retention_days, features,
      contract_start_date, contract_end_date, auto_renew,
      is_agency, agency_subdomain,
      notes, sales_contact,
    } = body;

    const orgName = company_name || organization_name;

    if (!plan_code || !plan_name) {
      return NextResponse.json({ error: 'Missing required fields: plan_code, plan_name' }, { status: 400 });
    }
    if (!contact_email || !first_name || !last_name) {
      return NextResponse.json({ error: 'Missing required client fields: first_name, last_name, contact_email' }, { status: 400 });
    }
    if (!temp_password || temp_password.length < 8) {
      return NextResponse.json({ error: 'A temporary password of at least 8 characters is required' }, { status: 400 });
    }
    if (is_agency && !agency_subdomain) {
      return NextResponse.json({ error: 'Agency subdomain is required for agency accounts' }, { status: 400 });
    }

    let clientUserId: string;
    let userCreated = false;

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === contact_email);

    if (existingUser) {
      clientUserId = existingUser.id;
      console.log('[Custom Plans] Existing user found — resetting password:', clientUserId);
      const { error: pwError } = await supabase.auth.admin.updateUserById(clientUserId, {
        password: temp_password,
        user_metadata: { must_change_password: true },
      });
      if (pwError) {
        return NextResponse.json({ error: `Failed to reset user password: ${pwError.message}` }, { status: 500 });
      }
      console.log('[Custom Plans] Password reset for existing user:', clientUserId);
    } else {
      const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
        email: contact_email,
        password: temp_password,
        email_confirm: true,
        user_metadata: {
          first_name, last_name,
          full_name: `${first_name} ${last_name}`,
          company_name: orgName,
          phone: phone_country_code && phone_number ? `${phone_country_code}${phone_number}` : undefined,
          account_type: 'enterprise',
          is_agency: is_agency ?? false,
          must_change_password: true,
        },
      });
      if (authError || !newAuthUser?.user) {
        return NextResponse.json({ error: `Failed to create user account: ${authError?.message}` }, { status: 500 });
      }
      clientUserId = newAuthUser.user.id;
      userCreated = true;
      console.log('[Custom Plans] Created new auth user:', clientUserId);
      await supabase.from('user_profiles').upsert({ id: clientUserId, first_name, last_name });
    }

    const { data: customPlan, error: planError } = await supabase
      .from('custom_plans')
      .insert({
        plan_code, plan_name, description,
        user_id: clientUserId,
        organization_name: orgName,
        contact_email,
        monthly_price: 0, annual_price: 0, billing_cycle: 'custom',
        phone_country_code: phone_country_code || null,
        phone_number: phone_number || null,
        first_name, last_name,
        subscribers_limit:   subscribers_limit   ?? -1,
        websites_limit:      websites_limit      ?? -1,
        notifications_limit: notifications_limit ?? -1,
        journeys_limit:      journeys_limit      ?? -1,
        team_members_limit:  team_members_limit  ?? -1,
        api_calls_limit:     api_calls_limit     ?? -1,
        data_retention_days: data_retention_days ?? 365,
        features: features || {},
        contract_start_date: contract_start_date || new Date().toISOString(),
        contract_end_date: contract_end_date || null,
        auto_renew: auto_renew ?? false,
        is_agency: is_agency ?? false,
        agency_subdomain: is_agency ? agency_subdomain : null,
        notes, sales_contact,
        created_by: user.id,
        status: 'draft',
      })
      .select()
      .single();

    if (planError) throw planError;

    await supabase.from('custom_plan_usage').insert({
      custom_plan_id: customPlan.id,
      user_id: clientUserId,
      subscribers_used: 0, websites_used: 0, notifications_used: 0,
      journeys_used: 0, team_members_used: 0, api_calls_used: 0,
      period_start: contract_start_date || new Date().toISOString(),
      period_end: contract_end_date || null,
    });

    await supabase.from('custom_plan_audit_log').insert({
      custom_plan_id: customPlan.id,
      action: 'created',
      changes: { plan: customPlan, created_by_email: user.email },
      performed_by: user.id,
      performed_by_email: user.email,
    });

    // ── Welcome email ───────────────────────────────────────────
    //
    // Priority: FRONTEND_URL (backend-only) → NEXT_PUBLIC_FRONTEND_URL → localhost fallback
    // Both vars point to the same value in your .env, FRONTEND_URL is just not exposed
    // to the browser bundle. Either works fine here on the server.
    //
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      'http://localhost:8080';

    // Agency portal URL:
    //   Production  — set NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com in .env
    //                 → https://acme.yourdomain.com
    //   Dev/staging — NEXT_PUBLIC_ROOT_DOMAIN not set
    //                 → http://localhost:8080/agency/acme  (works with Vite routing, no DNS)
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    const agencyPortalUrl = is_agency && agency_subdomain
      ? rootDomain
        ? `https://${agency_subdomain}.${rootDomain}`
        : `${frontendUrl}/agency/${agency_subdomain}`
      : null;

    const agencyNote = agencyPortalUrl
      ? `\n\nAs a Marketing Agency partner, your white-label dashboard is accessible at:\n` +
        `${agencyPortalUrl}\n\n` +
        `You can set your own pricing and manage your clients from there.`
      : '';

    const emailText = `
Hi ${first_name},

Welcome to ${orgName}'s enterprise platform! Your custom plan "${plan_name}" has been set up and is ready to use.

Your login credentials:
  Email:    ${contact_email}
  Password: ${temp_password}

Login here: ${frontendUrl}

⚠ IMPORTANT: For your security, please change your password immediately after your first login. You will be prompted to do so automatically.${agencyNote}

If you have any questions, please don't hesitate to reach out.

Best regards,
The Enterprise Team
    `.trim();

    // Resend sandbox: only your own verified address can receive mail in dev mode.
    // Set DEV_EMAIL_OVERRIDE=harrixonautomations@gmail.com in backend .env.local to
    // redirect all outbound mail to yourself during development and testing.
    // Leave unset in production — mail will go directly to the actual client.
    const isDev = process.env.NODE_ENV !== 'production';
    const devOverride = process.env.DEV_EMAIL_OVERRIDE;
    const emailRecipient = isDev && devOverride ? devOverride : contact_email;

    if (isDev && devOverride && devOverride !== contact_email) {
      console.log(`[Custom Plans] DEV — redirecting email from ${contact_email} → ${devOverride}`);
    }

    try {
      await sendEmail({
        to: emailRecipient,
        subject: `Welcome to ${plan_name} — Your login credentials`,
        text: emailText,
        from: process.env.EMAIL_FROM,
      });
    } catch (emailError: any) {
      console.warn('[Custom Plans] Welcome email failed (non-fatal):', emailError.message);
    }

    return NextResponse.json({
      success: true,
      plan: customPlan,
      user_id: clientUserId,
      user_created: userCreated,
      message: userCreated
        ? 'Custom plan created and welcome email sent to client.'
        : 'Custom plan created for existing user.',
    });
  } catch (error: any) {
    console.error('[Custom Plans API] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});