// app/api/admin/coupons/[couponId]/toggle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';
import type { AdminAuthUser } from '@/lib/admin-middleware';

// PATCH /api/admin/coupons/[couponId]/toggle - Toggle coupon active status
export const PATCH = withAdmin(
  async (
    req: NextRequest,
    user: AdminAuthUser,
    context: { params: Promise<{ couponId: string }> }
  ) => {
    // Await params (Next.js 14+ requirement)
    const { id: couponId } = await context.params;
    const supabase = getAdminClient();

    // Get current status
    const { data: existing, error: fetchError } = await supabase
      .from('coupons')
      .select('is_active, code, valid_until, times_redeemed, max_redemptions')
      .eq('id', couponId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Toggle status
    const newStatus = !existing.is_active;

    // If activating, check if coupon is expired
    if (newStatus === true) {
      const isExpired = existing.valid_until && new Date(existing.valid_until) < new Date();

      if (isExpired) {
        return NextResponse.json(
          {
            error: 'Cannot activate an expired coupon',
            valid_until: existing.valid_until,
            suggestion: 'Update the valid_until date first'
          },
          { status: 400 }
        );
      }

      // Check if max redemptions reached
      const timesRedeemed = existing.times_redeemed ?? 0;
      const maxRedemptions = existing.max_redemptions ?? 0;

      if (existing.max_redemptions && timesRedeemed >= maxRedemptions) {
        return NextResponse.json(
          {
            error: 'Cannot activate a coupon that has reached its maximum redemptions',
            times_redeemed: timesRedeemed,
            max_redemptions: maxRedemptions,
            suggestion: 'Increase max_redemptions first'
          },
          { status: 400 }
        );
      }
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .update({ 
        is_active: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', couponId)
      .select()
      .single();

    if (error) throw error;

    console.log(' Toggled coupon:', coupon.code, '→', newStatus ? 'active' : 'inactive', 'by', user.email);

    // Log admin activity
    await logAdminActivity(
      user.id,
      newStatus ? 'ACTIVATE_COUPON' : 'DEACTIVATE_COUPON',
      'coupon',
      coupon.id,
      {
        code: coupon.code,
        is_active: newStatus,
        previous_status: existing.is_active,
      }
    );

    return NextResponse.json({
      success: true,
      coupon,
      message: `Coupon "${coupon.code}" ${newStatus ? 'activated' : 'deactivated'} successfully`,
    });
  }
);