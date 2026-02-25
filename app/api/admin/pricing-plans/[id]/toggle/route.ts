// app/api/admin/pricing-plans/[id]/toggle/route.ts
// Dedicated toggle endpoint for plan active status

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';

export const OPTIONS = async () => {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};

export const PATCH = withSuperAdmin(
  async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
    const { id: planId } = await context.params;
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
        { plan_id: plan.plan_id, name: plan.name }
      );

      return NextResponse.json({ success: true, plan });
    } catch (error: any) {
      console.error('Error toggling plan:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to toggle plan status' },
        { status: 500 }
      );
    }
  }
);