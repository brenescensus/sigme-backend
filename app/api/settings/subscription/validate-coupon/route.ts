
// // app/api/settings/subscription/validate-coupon/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// // Helper to verify user
// async function verifyUser(req: NextRequest) {
//   const authHeader = req.headers.get('authorization');
//   if (!authHeader?.startsWith('Bearer ')) {
//     throw new Error('Unauthorized');
//   }

//   const token = authHeader.substring(7);
//   const { data: { user }, error } = await supabase.auth.getUser(token);
  
//   if (error || !user) {
//     throw new Error('Unauthorized');
//   }

//   return user;
// }

// // POST /api/settings/subscription/validate-coupon
// export async function POST(req: NextRequest) {
//   try {
//     const user = await verifyUser(req);
//     const { coupon_code, plan_price } = await req.json();

//     if (!coupon_code || plan_price === undefined) {
//       return NextResponse.json(
//         { error: 'Coupon code and plan price are required' },
//         { status: 400 }
//       );
//     }

//     // Get the coupon
//     const { data: coupon, error: couponError } = await supabase
//       .from('coupons')
//       .select('*')
//       .eq('code', coupon_code.toUpperCase())
//       .single();

//     if (couponError || !coupon) {
//       return NextResponse.json(
//         { error: 'Invalid coupon code' },
//         { status: 404 }
//       );
//     }

//     // Validate coupon
//     const now = new Date();

//     // Check if active
//     if (!coupon.is_active) {
//       return NextResponse.json(
//         { error: 'This coupon is no longer active' },
//         { status: 400 }
//       );
//     }

//     // Check validity period
//     if (coupon.valid_from && new Date(coupon.valid_from) > now) {
//       return NextResponse.json(
//         { error: 'This coupon is not yet valid' },
//         { status: 400 }
//       );
//     }

//     if (coupon.valid_until && new Date(coupon.valid_until) < now) {
//       return NextResponse.json(
//         { error: 'This coupon has expired' },
//         { status: 400 }
//       );
//     }

//     // Check redemption limit
   
//      if (coupon.max_redemptions && (coupon.times_redeemed || 0) >= coupon.max_redemptions) {
//       return NextResponse.json(
//         { error: 'This coupon has reached its maximum redemptions' },
//         { status: 400 }
//       );
//     }

//     // Check if user has already used this coupon
//     const { data: existingRedemption } = await supabase
//       .from('coupon_redemptions')
//       .select('id')
//       .eq('coupon_id', coupon.id)
//       .eq('user_id', user.id)
//       .single();

//     if (existingRedemption) {
//       return NextResponse.json(
//         { error: 'You have already used this coupon' },
//         { status: 400 }
//       );
//     }

//     // Check minimum purchase amount
//     if (coupon.min_purchase_amount && plan_price < coupon.min_purchase_amount) {
//       return NextResponse.json(
//         { 
//           error: `This coupon requires a minimum purchase of $${coupon.min_purchase_amount}`,
//           min_purchase: coupon.min_purchase_amount 
//         },
//         { status: 400 }
//       );
//     }

//     // Calculate discount
//     let discount = 0;
//     if (coupon.type === 'percentage') {
//       discount = (plan_price * coupon.value) / 100;
//     } else if (coupon.type === 'fixed') {
//       discount = Math.min(coupon.value, plan_price); // Don't discount more than the price
//     }

//     const final_price = Math.max(0, plan_price - discount);

//     console.log(' Coupon validated:', {
//       code: coupon.code,
//       user: user.email,
//       discount: discount,
//       final_price: final_price,
//     });

//     return NextResponse.json({
//       success: true,
//       valid: true,
//       coupon: {
//         id: coupon.id,
//         code: coupon.code,
//         description: coupon.description,
//         type: coupon.type,
//         value: coupon.value,
//       },
//       discount: {
//         type: coupon.type,
//         amount: discount,
//         formatted: coupon.type === 'percentage' 
//           ? `${coupon.value}% off` 
//           : `$${discount} off`,
//       },
//       original_price: plan_price,
//       discount_amount: discount,
//       final_price: final_price,
//     });

//   } catch (error: any) {
//     console.error(' Error validating coupon:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to validate coupon' },
//       { status: error.message === 'Unauthorized' ? 401 : 500 }
//     );
//   }
// }








// app/api/settings/subscription/validate-coupon/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user;
}

// POST /api/settings/subscription/validate-coupon
export async function POST(req: NextRequest) {
  try {
    const user = await verifyUser(req);
    const { coupon_code, plan_price, plan_id } = await req.json();

    if (!coupon_code || plan_price === undefined) {
      return NextResponse.json(
        { error: 'Coupon code and plan price are required' },
        { status: 400 }
      );
    }

    // Fetch coupon
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', coupon_code.toUpperCase())
      .single();

    if (couponError || !coupon) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });
    }

    const now = new Date();

    // Active check
    if (!coupon.is_active) {
      return NextResponse.json({ error: 'This coupon is no longer active' }, { status: 400 });
    }

    // Validity period
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json({ error: 'This coupon is not yet valid' }, { status: 400 });
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 });
    }

    // Global redemption cap
    if (coupon.max_redemptions && (coupon.times_redeemed || 0) >= coupon.max_redemptions) {
      return NextResponse.json(
        { error: 'This coupon has reached its maximum redemptions' },
        { status: 400 }
      );
    }

    // Applicable plans check
    if (plan_id && coupon.applicable_plans && coupon.applicable_plans.length > 0) {
      if (!coupon.applicable_plans.includes(plan_id)) {
        return NextResponse.json(
          { error: 'This coupon is not valid for the selected plan' },
          { status: 400 }
        );
      }
    }

    // ── SINGLE USE: check if this user has already redeemed it ──
    // FIX 1: use maybeSingle() not single() — single() errors when no row exists
    // FIX 2: only block re-use for single_use coupons, not multiple_use
    if (coupon.usage_type === 'single_use') {
      const { data: existingRedemption } = await supabase
        .from('coupon_redemptions')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', user.id)
        .maybeSingle(); // ← returns null (not an error) when no row found

      if (existingRedemption) {
        return NextResponse.json(
          { error: 'You have already used this coupon. It can only be redeemed once per account.' },
          { status: 400 }
        );
      }
    }

    // Minimum purchase amount
    if (coupon.min_purchase_amount && plan_price < coupon.min_purchase_amount) {
      return NextResponse.json(
        {
          error: `This coupon requires a minimum purchase of $${coupon.min_purchase_amount}`,
          min_purchase: coupon.min_purchase_amount,
        },
        { status: 400 }
      );
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (plan_price * coupon.value) / 100;
    } else {
      discount = Math.min(coupon.value, plan_price);
    }

    const final_price = Math.max(0, plan_price - discount);

    console.log(' Coupon validated:', {
      code: coupon.code,
      usage_type: coupon.usage_type,
      user: user.email,
      discount,
      final_price,
    });

    return NextResponse.json({
      success: true,
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        usage_type: coupon.usage_type,
        valid_until: coupon.valid_until,
      },
      discount: {
        type: coupon.type,
        amount: discount,
        formatted: coupon.type === 'percentage'
          ? `${coupon.value}% off`
          : `$${discount} off`,
      },
      original_price: plan_price,
      discount_amount: discount,
      final_price,
      // Inform frontend of billing behaviour
      usage_message: coupon.usage_type === 'single_use'
        ? 'One-time discount. Subsequent billing will be at the regular price.'
        : coupon.valid_until
          ? `Discount applies to all payments until ${new Date(coupon.valid_until).toLocaleDateString()}.`
          : 'Discount applies to all payments while the coupon is active.',
    });
  } catch (error: any) {
    console.error(' Error validating coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate coupon' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}