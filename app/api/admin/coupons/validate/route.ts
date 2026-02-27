// app/api/admin/coupons/validate/route.ts
// POST - Validate a coupon code before checkout

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, getAdminClient } from '@/lib/admin-middleware';
import type { AdminAuthUser } from '@/lib/admin-middleware';

export const POST = withAdmin(async (req: NextRequest, user: AdminAuthUser) => {
  const supabase = getAdminClient();
  const { code, plan_id, purchase_amount } = await req.json();

  if (!code) {
    return NextResponse.json({ valid: false, error: 'Coupon code is required' }, { status: 400 });
  }

  // Fetch the coupon
  const { data: coupon, error: couponError } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (couponError || !coupon) {
    return NextResponse.json({ valid: false, error: 'Invalid or inactive coupon code' });
  }

  const now = new Date();

  // Check validity period
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return NextResponse.json({ valid: false, error: 'This coupon is not yet active' });
  }

  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return NextResponse.json({ valid: false, error: 'This coupon has expired' });
  }

  // Check max redemptions (global cap)
  if (coupon.max_redemptions && (coupon.times_redeemed ?? 0) >= coupon.max_redemptions) {
    return NextResponse.json({ valid: false, error: 'This coupon has reached its maximum redemption limit' });
  }

  // Check minimum purchase amount
  if (coupon.min_purchase_amount && purchase_amount < coupon.min_purchase_amount) {
    return NextResponse.json({
      valid: false,
      error: `Minimum purchase amount of $${coupon.min_purchase_amount} required for this coupon`,
    });
  }

  // Check applicable plans
  if (plan_id && coupon.applicable_plans && coupon.applicable_plans.length > 0) {
    if (!coupon.applicable_plans.includes(plan_id)) {
      return NextResponse.json({ valid: false, error: 'This coupon is not valid for the selected plan' });
    }
  }

  // Single-use check: has this user already redeemed it?
  if (coupon.usage_type === 'single_use') {
    const { data: existingRedemption } = await supabase
      .from('coupon_redemptions')
      .select('id')
      .eq('coupon_id', coupon.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingRedemption) {
      return NextResponse.json({
        valid: false,
        error: 'You have already used this coupon. It can only be used once per account.',
      });
    }
  }

  // Calculate discount
  const amount = purchase_amount ?? 0;
  let discountAmount = 0;
  if (coupon.type === 'percentage') {
    discountAmount = (amount * coupon.value) / 100;
  } else {
    discountAmount = Math.min(coupon.value, amount);
  }

  const finalAmount = Math.max(0, amount - discountAmount);

  return NextResponse.json({
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      usage_type: coupon.usage_type,
      description: coupon.description,
      valid_until: coupon.valid_until,
    },
    discount_amount: discountAmount,
    final_amount: finalAmount,
    usage_message: coupon.usage_type === 'single_use'
      ? 'This coupon applies a one-time discount. Subsequent billing will be at the regular price.'
      : coupon.valid_until
        ? `Discount applies to all payments until ${new Date(coupon.valid_until).toLocaleDateString()}.`
        : 'Discount applies to all payments while the coupon is active.',
  });
});