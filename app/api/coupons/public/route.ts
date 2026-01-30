// app/api/coupons/public/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/coupons/public
 * Fetch active, public coupons that users can see and apply
 * This endpoint does NOT require authentication
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('plan_id');

    console.log('📢 Fetching public coupons for plan:', planId);

    // Build query for active coupons
    let query = supabase
      .from('coupons')
      .select('code, description, type, value, applicable_plans, valid_from, valid_until, min_purchase_amount')
      .eq('is_active', true)
      .order('value', { ascending: false });

    // Only show coupons that haven't expired
    const now = new Date().toISOString();
    query = query.or(`valid_until.is.null,valid_until.gt.${now}`);
    
    // Only show coupons that have started
    query = query.lte('valid_from', now);

    // Optional: Filter by plan
    // If you want to show only coupons applicable to a specific plan
    // Uncomment this:
    // if (planId) {
    //   query = query.or(`applicable_plans.is.null,applicable_plans.cs.{${planId}}`);
    // }

    const { data: coupons, error } = await query;

    if (error) {
      console.error(' Error fetching coupons:', error);
      throw error;
    }

    // Filter coupons client-side for better control
    let filteredCoupons = coupons || [];
    
    if (planId) {
      filteredCoupons = filteredCoupons.filter((coupon) => {
        // If applicable_plans is empty or null, coupon applies to all plans
        if (!coupon.applicable_plans || coupon.applicable_plans.length === 0) {
          return true;
        }
        // Check if plan is in the list
        return coupon.applicable_plans.includes(planId);
      });
    }

    // Don't show max_redemptions or times_redeemed to users for security
    const publicCoupons = filteredCoupons.map(coupon => ({
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      applicable_plans: coupon.applicable_plans,
      valid_until: coupon.valid_until,
      min_purchase_amount: coupon.min_purchase_amount || 0,
    }));

    console.log(' Found', publicCoupons.length, 'public coupons');

    return NextResponse.json({
      success: true,
      coupons: publicCoupons,
      count: publicCoupons.length,
    });
  } catch (error: any) {
    console.error(' Error in public coupons endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch coupons',
        coupons: [],
      },
      { status: 500 }
    );
  }
}