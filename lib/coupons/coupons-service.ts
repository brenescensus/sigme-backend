// ─────────────────────────────────────────────────────────────
// lib/coupons/coupons-service.ts
// ─────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type Supabase = SupabaseClient<Database>;

interface ApplyCouponOptions {
  supabase: Supabase;
  couponCode: string;
  userId: string;
  subscriptionId: string;
  purchaseAmount: number;
}

interface ApplyCouponResult {
  success: boolean;
  discountAmount: number;
  /** For single_use: discount only applies this one time. For multiple_use: applies each billing cycle within validity period. */
  isSingleUse: boolean;
  error?: string;
}

/**
 * Apply a coupon to a payment. Records the redemption and returns the discount.
 * Called during checkout / subscription creation.
 */
export async function applyCoupon({
  supabase,
  couponCode,
  userId,
  subscriptionId,
  purchaseAmount,
}: ApplyCouponOptions): Promise<ApplyCouponResult> {
  // Fetch coupon
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', couponCode.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !coupon) {
    return { success: false, discountAmount: 0, isSingleUse: false, error: 'Coupon not found or inactive' };
  }

  const now = new Date();

  // Validity checks
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { success: false, discountAmount: 0, isSingleUse: false, error: 'Coupon has expired' };
  }

  if (coupon.max_redemptions && (coupon.times_redeemed ?? 0) >= coupon.max_redemptions) {
    return { success: false, discountAmount: 0, isSingleUse: false, error: 'Coupon redemption limit reached' };
  }

  const isSingleUse = coupon.usage_type === 'single_use';

  // Single-use: check if this user has already redeemed
  if (isSingleUse) {
    const { data: existingRedemption } = await supabase
      .from('coupon_redemptions')
      .select('id')
      .eq('coupon_id', coupon.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRedemption) {
      return { success: false, discountAmount: 0, isSingleUse: true, error: 'Coupon already used by this user' };
    }
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.type === 'percentage') {
    discountAmount = (purchaseAmount * coupon.value) / 100;
  } else {
    discountAmount = Math.min(coupon.value, purchaseAmount);
  }

  // Record redemption
  await supabase.from('coupon_redemptions').insert({
    coupon_id: coupon.id,
    user_id: userId,
    subscription_id: subscriptionId,
    discount_amount: discountAmount,
  });

  // Increment times_redeemed counter
  await supabase
    .from('coupons')
    .update({ times_redeemed: (coupon.times_redeemed ?? 0) + 1 })
    .eq('id', coupon.id);

  return { success: true, discountAmount, isSingleUse };
}

/**
 * Check if a recurring subscription payment should still receive a coupon discount.
 * Called before each recurring billing cycle (e.g. in a Stripe webhook).
 *
 * Rules:
 * - single_use: NEVER apply again after first payment
 * - multiple_use: apply as long as coupon is still active and within validity period
 */
export async function shouldApplyCouponToRenewal({
  supabase,
  couponCode,
  userId,
}: {
  supabase: Supabase;
  couponCode: string;
  userId: string;
}): Promise<{ apply: boolean; discountValue?: number; discountType?: string; reason?: string }> {
  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', couponCode.toUpperCase())
    .eq('is_active', true)
    .single();

  if (!coupon) {
    return { apply: false, reason: 'Coupon no longer active' };
  }

  // Single-use: never apply to renewals
  if (coupon.usage_type === 'single_use') {
    return { apply: false, reason: 'Single-use coupon: discount applied to first payment only' };
  }

  // Multiple-use: check if still within validity period
  const now = new Date();
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { apply: false, reason: 'Coupon validity period has ended' };
  }

  return {
    apply: true,
    discountValue: coupon.value,
    discountType: coupon.type,
  };
}
