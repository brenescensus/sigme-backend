// app/api/admin/custom-plans/[id]/route.ts
// Manage individual custom plan

import { withSuperAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';
import { NextRequest, NextResponse } from 'next/server';

// ============================================
// GET - Get single custom plan
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSuperAdmin(async (req, user) => {
    // const supabase = getAdminClient();
const supabase = await getAdminClient();
    try {
      const { data: plan, error } = await supabase
        .from('custom_plans')
        .select(`
          *,
          user_subscriptions!custom_plan_id (
            user_id,
            status,
            subscription_starts_at,
            subscription_ends_at
          ),
          custom_plan_usage (
            subscribers_used,
            websites_used,
            notifications_used,
            journeys_used,
            team_members_used,
            api_calls_used,
            updated_at
          ),
          custom_plan_audit_log (
            id,
            action,
            changes,
            performed_by_email,
            created_at
          )
        `)
        .eq('id', params.id)
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, plan });
    } catch (error: any) {
      console.error('[Custom Plans] GET error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  })(request);
}

// ============================================
// PUT - Update custom plan
// ============================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSuperAdmin(async (req, user) => {
    const supabase = getAdminClient();

    try {
      const body = await req.json();
      const planId = params.id;

      // Get current plan
      const { data: currentPlan, error: fetchError } = await supabase
        .from('custom_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (fetchError || !currentPlan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      // Update plan
      const { data: updatedPlan, error: updateError } = await supabase
        .from('custom_plans')
        .update({
          plan_name: body.plan_name ?? currentPlan.plan_name,
          description: body.description,
          organization_name: body.organization_name,
          contact_email: body.contact_email,
          monthly_price: body.monthly_price,
          annual_price: body.annual_price,
          billing_cycle: body.billing_cycle,
          subscribers_limit: body.subscribers_limit,
          websites_limit: body.websites_limit,
          notifications_limit: body.notifications_limit,
          journeys_limit: body.journeys_limit,
          team_members_limit: body.team_members_limit,
          api_calls_limit: body.api_calls_limit,
          data_retention_days: body.data_retention_days,
          features: body.features,
          contract_start_date: body.contract_start_date,
          contract_end_date: body.contract_end_date,
          auto_renew: body.auto_renew,
          notes: body.notes,
          sales_contact: body.sales_contact,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log changes
      await supabase.from('custom_plan_audit_log').insert({
        custom_plan_id: planId,
        action: 'updated',
        changes: {
          before: currentPlan,
          after: updatedPlan,
        },
        performed_by: user.id,
        performed_by_email: user.email,
      });

      await logAdminActivity(
        user.id,
        'UPDATE_CUSTOM_PLAN',
        'custom_plan',
        planId,
        { plan_name: updatedPlan.plan_name }
      );

      return NextResponse.json({
        success: true,
        plan: updatedPlan,
      });

    } catch (error: any) {
      console.error('[Custom Plans] UPDATE error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  })(request);
}

// ============================================
// DELETE - Delete custom plan
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSuperAdmin(async (req, user) => {
    const supabase = getAdminClient();

    try {
      const planId = params.id;

      // Get plan details before deletion
      const { data: plan, error: fetchError } = await supabase
        .from('custom_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (fetchError || !plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      // Check if plan is active
      if (plan.status === 'active') {
        return NextResponse.json(
          { error: 'Cannot delete active plan. Please deactivate first.' },
          { status: 400 }
        );
      }

      // Delete plan (cascade will handle usage and audit log)
      const { error: deleteError } = await supabase
        .from('custom_plans')
        .delete()
        .eq('id', planId);

      if (deleteError) throw deleteError;

      await logAdminActivity(
        user.id,
        'DELETE_CUSTOM_PLAN',
        'custom_plan',
        planId,
        { plan_code: plan.plan_code, plan_name: plan.plan_name }
      );

      return NextResponse.json({
        success: true,
        message: 'Custom plan deleted successfully',
      });

    } catch (error: any) {
      console.error('[Custom Plans] DELETE error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  })(request);
}