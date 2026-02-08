// app/api/admin/pricing-plans/[id]/route.ts
// PUT, DELETE, PATCH methods for individual pricing plans

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';

// PUT /api/admin/pricing-plans/[id] - Update pricing plan
export const PUT = withSuperAdmin(
  async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
    const { id: planId } = await context.params;  //  FIXED: await params
    const body = await req.json();
    const supabase = getAdminClient();

    try {
      const {
        name,
        description,
        price,
        yearly_price,
        recurring_limit,
        websites_limit,
        subscribers_limit,
        notifications_limit,
        features,
        is_popular,
        is_active,
        display_order,
      } = body;

      // Build update object
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = price;
      if (yearly_price !== undefined) updateData.yearly_price = yearly_price;

      if (recurring_limit !== undefined) updateData.recurring_limit = recurring_limit;
      if (websites_limit !== undefined) updateData.websites_limit = websites_limit;
      if (subscribers_limit !== undefined) updateData.subscribers_limit = subscribers_limit;
      if (notifications_limit !== undefined) updateData.notifications_limit = notifications_limit;
      if (features !== undefined) updateData.features = features;
      if (is_popular !== undefined) updateData.is_popular = is_popular;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (display_order !== undefined) updateData.display_order = display_order;

      const { data: plan, error } = await supabase
        .from('pricing_plans')
        .update(updateData)
        .eq('id', planId)
        .select()
        .single();

      if (error) throw error;

      await logAdminActivity(user.id, 'UPDATE_PLAN', 'plan', planId, {
        plan_id: plan.plan_id,
        changes: Object.keys(updateData),
      });

      console.log(' Updated plan:', plan.plan_id);

      return NextResponse.json({
        success: true,
        plan,
      });
    } catch (error: any) {
      console.error(' Error updating plan:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update plan' },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/admin/pricing-plans/[id] - Delete pricing plan
export const DELETE = withSuperAdmin(
  async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
    const { id: planId } = await context.params;  //  FIXED: await params
    const supabase = getAdminClient();

    try {
      // Get plan details before deleting (for logging)
      const { data: plan } = await supabase
        .from('pricing_plans')
        .select('plan_id, name')
        .eq('id', planId)
        .single();

      if (!plan) {
        return NextResponse.json(
          { error: 'Plan not found' },
          { status: 404 }
        );
      }

      // Check if any users are subscribed to this plan
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('plan_tier', plan.plan_id)
        .limit(1);

      if (subscriptions && subscriptions.length > 0) {
        return NextResponse.json(
          { error: 'Cannot delete plan with active subscriptions. Deactivate it instead.' },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('pricing_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      await logAdminActivity(user.id, 'DELETE_PLAN', 'plan', planId, {
        plan_id: plan.plan_id,
        name: plan.name,
      });

      console.log(' Deleted plan:', plan.plan_id);

      return NextResponse.json({
        success: true,
        message: 'Plan deleted successfully',
      });
    } catch (error: any) {
      console.error(' Error deleting plan:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete plan' },
        { status: 500 }
      );
    }
  }
);

// PATCH /api/admin/pricing-plans/[id]/toggle - Toggle plan active status
export const PATCH = withSuperAdmin(
  async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
    const { id: planId } = await context.params;  //  FIXED: await params
    const supabase = getAdminClient();

    try {
      // Get current status
      const { data: currentPlan } = await supabase
        .from('pricing_plans')
        .select('is_active, plan_id, name')
        .eq('id', planId)
        .single();

      if (!currentPlan) {
        return NextResponse.json(
          { error: 'Plan not found' },
          { status: 404 }
        );
      }

      // Toggle status
      const { data: plan, error } = await supabase
        .from('pricing_plans')
        .update({
          is_active: !currentPlan.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId)
        .select()
        .single();

      if (error) throw error;

      await logAdminActivity(
        user.id,
        plan.is_active ? 'ACTIVATE_PLAN' : 'DEACTIVATE_PLAN',
        'plan',
        planId,
        {
          plan_id: plan.plan_id,
          name: plan.name,
        }
      );

      console.log(` ${plan.is_active ? 'Activated' : 'Deactivated'} plan:`, plan.plan_id);

      return NextResponse.json({
        success: true,
        plan,
      });
    } catch (error: any) {
      console.error(' Error toggling plan:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to toggle plan status' },
        { status: 500 }
      );
    }
  }
);