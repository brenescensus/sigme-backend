// // // app/api/settings/subscription/validate-coupon/route.ts
// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth } from '@/lib/auth-middleware';
// // import { createClient } from '@supabase/supabase-js';
// // import type { Database } from '@/types/database';

// // const supabase = createClient<Database>(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // export const POST = withAuth(async (req, user) => {
// //   try {
// //     const { coupon_code, plan_id, plan_price } = await req.json();

// //     if (!coupon_code) {
// //       return NextResponse.json(
// //         { error: 'Coupon code is required' },
// //         { status: 400 }
// //       );
// //     }

// //     // Get coupon from database
// //     const { data: coupon, error } = await supabase
// //       .from('coupons')
// //       .select('*')
// //       .eq('code', coupon_code.toUpperCase())
// //       .eq('is_active', true)
// //       .single();

// //     if (error || !coupon) {
// //       return NextResponse.json(
// //         { error: 'Invalid or expired coupon code' },
// //         { status: 400 }
// //       );
// //     }

// //     // Check if coupon is valid (date range)
// //     const now = new Date();
// //     const validFrom = new Date(coupon.valid_from!);
// //     const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

// //     if (now < validFrom) {
// //       return NextResponse.json(
// //         { error: 'This coupon is not yet valid' },
// //         { status: 400 }
// //       );
// //     }

// //     if (validUntil && now > validUntil) {
// //       return NextResponse.json(
// //         { error: 'This coupon has expired' },
// //         { status: 400 }
// //       );
// //     }

// //     // Check if max redemptions reached
// //     if (coupon.max_redemptions && (coupon.times_redeemed || 0) >= coupon.max_redemptions) {
// //       return NextResponse.json(
// //         { error: 'This coupon has reached its maximum redemptions' },
// //         { status: 400 }
// //       );
// //     }

// //     // Check if user has already used this coupon
// //     const { data: previousRedemption } = await supabase
// //       .from('coupon_redemptions')
// //       .select('id')
// //       .eq('coupon_id', coupon.id)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (previousRedemption) {
// //       return NextResponse.json(
// //         { error: 'You have already used this coupon' },
// //         { status: 400 }
// //       );
// //     }

// //     // Check if coupon applies to this plan
// //     if (coupon.applicable_plans && coupon.applicable_plans.length > 0) {
// //       if (!coupon.applicable_plans.includes(plan_id)) {
// //         return NextResponse.json(
// //           { error: 'This coupon is not valid for the selected plan' },
// //           { status: 400 }
// //         );
// //       }
// //     }

// //     // Check minimum purchase amount
// //     if (plan_price < (coupon.min_purchase_amount || 0)) {
// //       return NextResponse.json(
// //         {
// //           error: `Minimum purchase amount of $${coupon.min_purchase_amount} required`,
// //         },
// //         { status: 400 }
// //       );
// //     }

// //     // Calculate discount
// //     let discount = 0;
// //     let finalPrice = plan_price;

// //     if (coupon.type === 'percentage') {
// //       discount = (plan_price * coupon.value) / 100;
// //       finalPrice = plan_price - discount;
// //     } else if (coupon.type === 'fixed') {
// //       discount = Math.min(coupon.value, plan_price);
// //       finalPrice = plan_price - discount;
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       valid: true,
// //       coupon: {
// //         id: coupon.id,
// //         code: coupon.code,
// //         type: coupon.type,
// //         value: coupon.value,
// //         description: coupon.description,
// //         valid_until: coupon.valid_until,
// //       },
// //       discount: Math.round(discount * 100) / 100,
// //       original_price: plan_price,
// //       final_price: Math.max(Math.round(finalPrice * 100) / 100, 0),
// //     });
// //   } catch (error: any) {
// //     console.error(' Error validating coupon:', error);
// //     return NextResponse.json(
// //       { error: error.message || 'Failed to validate coupon' },
// //       { status: 500 }
// //     );
// //   }
// // });


// // app/api/settings/subscription/validate-coupon/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth } from '@/lib/auth-middleware';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export const POST = withAuth(async (req, user) => {
//   try {
//     const { coupon_code, plan_price } = await req.json();

//     if (!coupon_code || !plan_price) {
//       return NextResponse.json(
//         { error: 'Coupon code and plan price are required' },
//         { status: 400 }
//       );
//     }

//     console.log(' Validating coupon:', {
//       code: coupon_code,
//       price: plan_price,
//       user_id: user.id,
//     });

//     // Get coupon from database
//     const { data: coupon, error: couponError } = await supabase
//       .from('coupons')
//       .select('*')
//       .eq('code', coupon_code.toUpperCase())
//       .single();

//     if (couponError || !coupon) {
//       console.error(' Coupon not found:', coupon_code);
//       return NextResponse.json(
//         { error: 'Invalid coupon code' },
//         { status: 404 }
//       );
//     }

//     // Check if coupon is active
//     if (!coupon.is_active) {
//       console.error(' Coupon inactive:', coupon_code);
//       return NextResponse.json(
//         { error: 'This coupon is no longer active' },
//         { status: 400 }
//       );
//     }

//     // Check validity dates
//     const now = new Date();
//     const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
//     const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

//     if (validFrom && now < validFrom) {
//       console.error(' Coupon not yet valid:', coupon_code);
//       return NextResponse.json(
//         { error: 'This coupon is not yet valid' },
//         { status: 400 }
//       );
//     }

//     if (validUntil && now > validUntil) {
//       console.error(' Coupon expired:', coupon_code);
//       return NextResponse.json(
//         { error: 'This coupon has expired' },
//         { status: 400 }
//       );
//     }

//     // Check max redemptions
//     // if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
//     //   console.error(' Coupon max redemptions reached:', coupon_code);
//     //   return NextResponse.json(
//     //     { error: 'This coupon has reached its maximum redemption limit' },
//     //     { status: 400 }
//     //   );
//     // }

//     // Check if max redemptions reached
//     if (coupon.max_redemptions && (coupon.times_redeemed || 0) >= coupon.max_redemptions) {
//       return NextResponse.json(
//         { error: 'This coupon has reached its maximum redemptions' },
//         { status: 400 }
//       );
//     }

//     // Check minimum purchase amount
//     if (coupon.min_purchase_amount && plan_price < coupon.min_purchase_amount) {
//       console.error(' Below minimum purchase:', {
//         required: coupon.min_purchase_amount,
//         actual: plan_price,
//       });
//       return NextResponse.json(
//         { 
//           error: `Minimum purchase amount of $${coupon.min_purchase_amount} required` 
//         },
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
//       console.error(' Coupon already used by user:', {
//         coupon_code,
//         user_id: user.id,
//       });
//       return NextResponse.json(
//         { error: 'You have already used this coupon' },
//         { status: 400 }
//       );
//     }

//     // Calculate discount
//     let discount = 0;
//     let finalPrice = plan_price;

//     if (coupon.type === 'percentage') {
//       discount = (plan_price * coupon.value) / 100;
//       finalPrice = plan_price - discount;
//     } else if (coupon.type === 'fixed') {
//       discount = Math.min(coupon.value, plan_price); // Can't discount more than price
//       finalPrice = plan_price - discount;
//     }

//     // Ensure final price doesn't go negative
//     finalPrice = Math.max(0, finalPrice);

//     console.log(' Coupon validated successfully:', {
//       code: coupon_code,
//       discount: discount.toFixed(2),
//       final_price: finalPrice.toFixed(2),
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
//       discount: parseFloat(discount.toFixed(2)),
//       final_price: parseFloat(finalPrice.toFixed(2)),
//       original_price: plan_price,
//     });
//   } catch (error: any) {
//     console.error(' Error validating coupon:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to validate coupon' },
//       { status: 500 }
//     );
//   }
// });




// app/api/settings/subscription/validate-coupon/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to verify user
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
    const { coupon_code, plan_price } = await req.json();

    if (!coupon_code || plan_price === undefined) {
      return NextResponse.json(
        { error: 'Coupon code and plan price are required' },
        { status: 400 }
      );
    }

    // Get the coupon
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', coupon_code.toUpperCase())
      .single();

    if (couponError || !coupon) {
      return NextResponse.json(
        { error: 'Invalid coupon code' },
        { status: 404 }
      );
    }

    // Validate coupon
    const now = new Date();

    // Check if active
    if (!coupon.is_active) {
      return NextResponse.json(
        { error: 'This coupon is no longer active' },
        { status: 400 }
      );
    }

    // Check validity period
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json(
        { error: 'This coupon is not yet valid' },
        { status: 400 }
      );
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json(
        { error: 'This coupon has expired' },
        { status: 400 }
      );
    }

    // Check redemption limit
   
     if (coupon.max_redemptions && (coupon.times_redeemed || 0) >= coupon.max_redemptions) {
      return NextResponse.json(
        { error: 'This coupon has reached its maximum redemptions' },
        { status: 400 }
      );
    }

    // Check if user has already used this coupon
    const { data: existingRedemption } = await supabase
      .from('coupon_redemptions')
      .select('id')
      .eq('coupon_id', coupon.id)
      .eq('user_id', user.id)
      .single();

    if (existingRedemption) {
      return NextResponse.json(
        { error: 'You have already used this coupon' },
        { status: 400 }
      );
    }

    // Check minimum purchase amount
    if (coupon.min_purchase_amount && plan_price < coupon.min_purchase_amount) {
      return NextResponse.json(
        { 
          error: `This coupon requires a minimum purchase of $${coupon.min_purchase_amount}`,
          min_purchase: coupon.min_purchase_amount 
        },
        { status: 400 }
      );
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (plan_price * coupon.value) / 100;
    } else if (coupon.type === 'fixed') {
      discount = Math.min(coupon.value, plan_price); // Don't discount more than the price
    }

    const final_price = Math.max(0, plan_price - discount);

    console.log(' Coupon validated:', {
      code: coupon.code,
      user: user.email,
      discount: discount,
      final_price: final_price,
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
      final_price: final_price,
    });

  } catch (error: any) {
    console.error(' Error validating coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate coupon' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}