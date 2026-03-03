// // ============================================================================
// // FIXED CUSTOM PLANS ROUTE (for your existing error)
// // app/api/admin/custom-plans/[id]/route.ts
// // ============================================================================

// import { withSuperAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';
// import { NextRequest, NextResponse } from 'next/server';

// // GET - Get single custom plan
// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   return withSuperAdmin(async (req, user) => {
//     const { id } = await params;
//     const supabase = getAdminClient();

//     try {
//       const { data: plan, error } = await supabase
//         .from('custom_plans')
//         .select(`
//           *,
//           user_subscriptions!custom_plan_id (
//             user_id,
//             status,
//             subscription_starts_at,
//             subscription_ends_at
//           ),
//           custom_plan_usage (
//             subscribers_used,
//             websites_used,
//             notifications_used,
//             journeys_used,
//             team_members_used,
//             api_calls_used,
//             updated_at
//           ),
//           custom_plan_audit_log (
//             id,
//             action,
//             changes,
//             performed_by_email,
//             created_at
//           )
//         `)
//         .eq('id', id)
//         .single();

//       if (error) throw error;

//       return NextResponse.json({ success: true, plan });
//     } catch (error: any) {
//       console.error('[Custom Plans] GET error:', error);
//       return NextResponse.json(
//         { error: error.message },
//         { status: 500 }
//       );
//     }
//   })(request);
// }

// // PUT - Update custom plan
// export async function PUT(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   return withSuperAdmin(async (req, user) => {
//     const { id } = await params;
//     const supabase = getAdminClient();

//     try {
//       const body = await req.json();

//       // Get current plan
//       const { data: currentPlan, error: fetchError } = await supabase
//         .from('custom_plans')
//         .select('*')
//         .eq('id', id)
//         .single();

//       if (fetchError || !currentPlan) {
//         return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
//       }

//       // Update plan
//       const { data: updatedPlan, error: updateError } = await supabase
//         .from('custom_plans')
//         .update({
//           plan_name: body.plan_name ?? currentPlan.plan_name,
//           description: body.description,
//           organization_name: body.organization_name,
//           contact_email: body.contact_email,
//           monthly_price: body.monthly_price,
//           annual_price: body.annual_price,
//           billing_cycle: body.billing_cycle,
//           subscribers_limit: body.subscribers_limit,
//           websites_limit: body.websites_limit,
//           notifications_limit: body.notifications_limit,
//           journeys_limit: body.journeys_limit,
//           team_members_limit: body.team_members_limit,
//           api_calls_limit: body.api_calls_limit,
//           data_retention_days: body.data_retention_days,
//           features: body.features,
//           contract_start_date: body.contract_start_date,
//           contract_end_date: body.contract_end_date,
//           auto_renew: body.auto_renew,
//           notes: body.notes,
//           sales_contact: body.sales_contact,
//           updated_at: new Date().toISOString(),
//         })
//         .eq('id', id)
//         .select()
//         .single();

//       if (updateError) throw updateError;

//       // Log changes
//       await supabase.from('custom_plan_audit_log').insert({
//         custom_plan_id: id,
//         action: 'updated',
//         changes: {
//           before: currentPlan,
//           after: updatedPlan,
//         },
//         performed_by: user.id,
//         performed_by_email: user.email,
//       });

//       await logAdminActivity(
//         user.id,
//         'UPDATE_CUSTOM_PLAN',
//         'custom_plan',
//         id,
//         { plan_name: updatedPlan.plan_name }
//       );

//       return NextResponse.json({
//         success: true,
//         plan: updatedPlan,
//       });

//     } catch (error: any) {
//       console.error('[Custom Plans] UPDATE error:', error);
//       return NextResponse.json(
//         { error: error.message },
//         { status: 500 }
//       );
//     }
//   })(request);
// }

// // DELETE - Delete custom plan
// export async function DELETE(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   return withSuperAdmin(async (req, user) => {
//     const { id } = await params;
//     const supabase = getAdminClient();

//     try {
//       // Get plan details before deletion
//       const { data: plan, error: fetchError } = await supabase
//         .from('custom_plans')
//         .select('*')
//         .eq('id', id)
//         .single();

//       if (fetchError || !plan) {
//         return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
//       }

//       // Check if plan is active
//       if (plan.status === 'active') {
//         return NextResponse.json(
//           { error: 'Cannot delete active plan. Please deactivate first.' },
//           { status: 400 }
//         );
//       }

//       // Delete plan (cascade will handle usage and audit log)
//       const { error: deleteError } = await supabase
//         .from('custom_plans')
//         .delete()
//         .eq('id', id);

//       if (deleteError) throw deleteError;

//       await logAdminActivity(
//         user.id,
//         'DELETE_CUSTOM_PLAN',
//         'custom_plan',
//         id,
//         { plan_code: plan.plan_code, plan_name: plan.plan_name }
//       );

//       return NextResponse.json({
//         success: true,
//         message: 'Custom plan deleted successfully',
//       });

//     } catch (error: any) {
//       console.error('[Custom Plans] DELETE error:', error);
//       return NextResponse.json(
//         { error: error.message },
//         { status: 500 }
//       );
//     }
//   })(request);
// }



// app/api/admin/custom-plans/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, getAdminClient } from '@/lib/admin-middleware';

type RouteContext = { params: Promise<{ id: string }> };

// ============================================
// PUT - Update custom plan
// ============================================
export const PUT = withSuperAdmin(async (request, user, context: RouteContext) => {
  try {
    const supabase = getAdminClient();
    const { id } = await context.params; // ← correct key: 'id' not 'planId'
    const body = await request.json();

    const {
      plan_name, description,
      organization_name, contact_email,
      phone_country_code, phone_number,
      first_name, last_name,
      subscribers_limit, websites_limit, notifications_limit,
      journeys_limit, team_members_limit, api_calls_limit,
      data_retention_days, features,
      contract_start_date, contract_end_date, auto_renew,
      is_agency, agency_subdomain,
      notes, sales_contact,
    } = body;

    // Fetch existing plan to diff for audit log
    const { data: existing } = await supabase
      .from('custom_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const { data: updated, error } = await supabase
      .from('custom_plans')
      .update({
        plan_name,
        description,
        organization_name,
        contact_email,
        phone_country_code,
        phone_number,
        first_name,
        last_name,
        subscribers_limit,
        websites_limit,
        notifications_limit,
        journeys_limit,
        team_members_limit,
        api_calls_limit,
        data_retention_days,
        features,
        contract_start_date,
        contract_end_date,
        auto_renew,
        is_agency,
        agency_subdomain: is_agency ? agency_subdomain : null,
        notes,
        sales_contact,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from('custom_plan_audit_log').insert({
      custom_plan_id: id,
      action: 'updated',
      changes: { before: existing, after: updated },
      performed_by: user.id,
      performed_by_email: user.email,
    });

    return NextResponse.json({ success: true, plan: updated });
  } catch (error: any) {
    console.error('[Custom Plans] PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// ============================================
// DELETE - Delete custom plan (must not be active)
// ============================================
export const DELETE = withSuperAdmin(async (request, user, context: RouteContext) => {
  try {
    const supabase = getAdminClient();
    const { id } = await context.params; // ← correct key: 'id' not 'planId'

    // Guard: fetch plan first
    const { data: plan, error: fetchError } = await supabase
      .from('custom_plans')
      .select('status, plan_name, plan_code')
      .eq('id', id)
      .single();

    if (fetchError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (plan.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete an active plan. Suspend it first.' },
        { status: 400 }
      );
    }

    // Delete child rows first if no ON DELETE CASCADE on the table
    await supabase.from('custom_plan_usage').delete().eq('custom_plan_id', id);
    await supabase.from('custom_plan_audit_log').delete().eq('custom_plan_id', id);

    const { error: deleteError } = await supabase
      .from('custom_plans')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    console.log(`[Custom Plans] Deleted plan ${plan.plan_code} (${id})`);

    return NextResponse.json({ success: true, message: 'Plan deleted.' });
  } catch (error: any) {
    console.error('[Custom Plans] DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});