// // app/api/admin/custom-plans/[id]/extend/route.ts
// import { NextResponse } from 'next/server';
// import { withSuperAdmin, getAdminClient } from '@/lib/admin-middleware';

// export const POST = withSuperAdmin(async (request, user, { params }: any) => {
//   const supabase = getAdminClient();
//   const planId = params.id; // ← fixed: was `params.planId`
//   const { new_end_date } = await request.json();

//   if (!new_end_date) {
//     return NextResponse.json({ error: 'new_end_date is required' }, { status: 400 });
//   }

//   const { data: plan, error: fetchError } = await supabase
//     .from('custom_plans')
//     .select('*')
//     .eq('id', planId)
//     .single();

//   if (fetchError || !plan) {
//     return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
//   }

//   const newStatus = ['expired', 'suspended'].includes(plan.status ?? '')
//     ? 'active'
//     : plan.status;

//   // Update the plan
//   const { error: planError } = await supabase
//     .from('custom_plans')
//     .update({
//       contract_end_date: new_end_date,
//       status: newStatus,
//       updated_at: new Date().toISOString(),
//     })
//     .eq('id', planId);

//   if (planError) throw planError;

//   // Update usage period end
//   await supabase
//     .from('custom_plan_usage')
//     .update({ period_end: new_end_date })
//     .eq('custom_plan_id', planId);

//   // Update subscription end date
//   const { error: subError } = await supabase
//     .from('user_subscriptions')
//     .update({
//       subscription_ends_at: new_end_date,
//       status: 'active',
//     })
//     .eq('user_id', plan.user_id);

//   if (subError) throw subError;

//   // Audit
//   await supabase.from('custom_plan_audit_log').insert({
//     custom_plan_id: planId,
//     action: 'period_extended',
//     changes: {
//       previous_end_date: plan.contract_end_date,
//       new_end_date,
//     },
//     performed_by: user.id,
//     performed_by_email: user.email,
//   });

//   return NextResponse.json({
//     success: true,
//     message: `Subscription extended to ${new Date(new_end_date).toLocaleDateString()}.`,
//   });
// });






// app/api/admin/custom-plans/[id]/extend/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, getAdminClient } from '@/lib/admin-middleware';

export const POST = withSuperAdmin(async (request: NextRequest, user, { params }: any) => {
  const supabase = getAdminClient();

  // ── FIX: params is a Promise in Next.js App Router — must be awaited ──────
  const { id: planId } = await params;

  const { new_end_date } = await request.json();

  if (!new_end_date) {
    return NextResponse.json({ error: 'new_end_date is required' }, { status: 400 });
  }

  const { data: plan, error: fetchError } = await supabase
    .from('custom_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (fetchError || !plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  // Only auto-restore status if plan lapsed due to expiry, not suspension
  const planStatusNow = plan.status ?? '';
  const newPlanStatus = planStatusNow === 'expired' ? 'active' : planStatusNow;
  const newSubStatus  = planStatusNow === 'expired' ? 'active' : undefined;

  // Update the plan
  const { error: planError } = await supabase
    .from('custom_plans')
    .update({
      contract_end_date: new_end_date,
      status:            newPlanStatus,
      updated_at:        new Date().toISOString(),
    })
    .eq('id', planId);

  if (planError) throw planError;

  // Update user_subscriptions — only touch status if restoring from expired
  const subUpdate: Record<string, any> = {
    subscription_ends_at: new_end_date,
    updated_at:           new Date().toISOString(),
  };
  if (newSubStatus) subUpdate.status = newSubStatus;

  const { error: subError } = await supabase
    .from('user_subscriptions')
    .update(subUpdate)
    .eq('user_id', plan.user_id);

  if (subError) throw subError;

  // If this is an agency plan, also extend all active client subscriptions
  // so the agency portal doesn't show clients as expired while the agency plan is active.
  if (plan.is_agency) {
    await supabase
      .from('agency_client_subscriptions')
      .update({
        subscription_ends_at: new_end_date,
        ...(newSubStatus ? { status: newSubStatus } : {}),
      })
      .eq('agency_plan_id', planId)   // all clients under this agency
      .in('status', ['active', 'expired']); // don't touch suspended clients
  }

  // Audit
  await supabase.from('custom_plan_audit_log').insert({
    custom_plan_id:     planId,
    action:             'period_extended',
    changes: {
      previous_end_date: plan.contract_end_date,
      new_end_date,
      previous_status:   plan.status,
      new_status:        newPlanStatus,
    },
    performed_by:       user.id,
    performed_by_email: user.email,
  });

  return NextResponse.json({
    success: true,
    message: `Subscription extended to ${new Date(new_end_date).toLocaleDateString()}.`,
  });
});