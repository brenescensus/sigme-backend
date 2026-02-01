// // app/api/paystack/initialize-payment/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth } from '@/lib/auth-middleware';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';
// import axios from 'axios';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
// const PAYSTACK_API_URL = 'https://api.paystack.co';

// export const POST = withAuth(async (req, user) => {
//   try {
//     const { plan_id, coupon_code, currency = 'KES' } = await req.json();

//     // Get plan details
//     const { data: plan, error: planError } = await supabase
//       .from('pricing_plans')
//       .select('*')
//       .eq('plan_id', plan_id)
//       .eq('is_active', true)
//       .single();

//     if (planError || !plan) {
//       return NextResponse.json(
//         { error: 'Invalid plan selected' },
//         { status: 400 }
//       );
//     }

//     if (!plan.price) {
//       return NextResponse.json(
//         { error: 'This plan requires custom pricing. Please contact sales.' },
//         { status: 400 }
//       );
//     }

//     let discountAmount = 0;
//     let finalPrice = plan.price;
//     let couponDetails = null;

//     // Validate coupon if provided
//     if (coupon_code) {
//       console.log(' Validating coupon:', coupon_code);

//       const { data: coupon, error: couponError } = await supabase
//         .from('coupons')
//         .select('*')
//         .eq('code', coupon_code.toUpperCase())
//         .single();

//       if (couponError || !coupon) {
//         return NextResponse.json(
//           { error: 'Invalid coupon code' },
//           { status: 400 }
//         );
//       }

//       // Check if coupon is active
//       if (!coupon.is_active) {
//         return NextResponse.json(
//           { error: 'This coupon is no longer active' },
//           { status: 400 }
//         );
//       }

//       // Check validity dates
//       const now = new Date();
//       const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
//       const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

//       if (validFrom && now < validFrom) {
//         return NextResponse.json(
//           { error: 'Coupon is not yet valid' },
//           { status: 400 }
//         );
//       }

//       if (validUntil && now > validUntil) {
//         return NextResponse.json(
//           { error: 'Coupon has expired' },
//           { status: 400 }
//         );
//       }

//       // Check max redemptions
//       if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
//         return NextResponse.json(
//           { error: 'Coupon redemption limit reached' },
//           { status: 400 }
//         );
//       }

//       // Check minimum purchase amount
//       if (coupon.min_purchase_amount && plan.price < coupon.min_purchase_amount) {
//         return NextResponse.json(
//           { 
//             error: `Minimum purchase amount of $${coupon.min_purchase_amount} required` 
//           },
//           { status: 400 }
//         );
//       }

//       // Check if applicable to this plan
//       if (coupon.applicable_plans && coupon.applicable_plans.length > 0) {
//         if (!coupon.applicable_plans.includes(plan_id)) {
//           return NextResponse.json(
//             { error: 'Coupon not applicable to this plan' },
//             { status: 400 }
//           );
//         }
//       }

//       // Check if user has already used this coupon
//       const { data: existingRedemption } = await supabase
//         .from('coupon_redemptions')
//         .select('id')
//         .eq('coupon_id', coupon.id)
//         .eq('user_id', user.id)
//         .single();

//       if (existingRedemption) {
//         return NextResponse.json(
//           { error: 'You have already used this coupon' },
//           { status: 400 }
//         );
//       }

//       // Calculate discount
//       if (coupon.type === 'percentage') {
//         discountAmount = (plan.price * coupon.value) / 100;
//       } else {
//         discountAmount = Math.min(coupon.value, plan.price);
//       }

//       finalPrice = Math.max(0, plan.price - discountAmount);
//       couponDetails = coupon;

//       console.log(' Coupon applied:', {
//         code: coupon.code,
//         discount: discountAmount.toFixed(2),
//         final_price: finalPrice.toFixed(2),
//       });
//     }

//     // Convert to currency
//     let amount = finalPrice;
//     if (currency === 'KES') {
//       amount = Math.round(finalPrice * 129); // USD to KES conversion
//     }

//     // Convert to kobo/cents (Paystack expects amount in smallest currency unit)
//     const amountInMinorUnits = Math.round(amount * 100);

//     // Get or create user profile for email
//     const { data: profile } = await supabase
//       .from('user_profiles')
//       .select('*')
//       .eq('id', user.id)
//       .single();

//     const email = user.email || profile?.email || `user-${user.id}@example.com`;

//     // Generate unique reference
//     const reference = `sigma_${user.id}_${Date.now()}`;

//     // Initialize Paystack payment
//     const paystackResponse = await axios.post(
//       `${PAYSTACK_API_URL}/transaction/initialize`,
//       {
//         email: email,
//         amount: amountInMinorUnits,
//         currency: currency,
//         reference: reference,
//         callback_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/settings?payment=success`,
//         metadata: {
//           user_id: user.id,
//           plan_id: plan_id,
//           plan_name: plan.name,
//           coupon_code: coupon_code || null,
//           discount_amount: discountAmount,
//           original_price: plan.price,
//           final_price: finalPrice,
//           cancel_action: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/settings?payment=cancelled`,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     if (!paystackResponse.data.status) {
//       throw new Error('Failed to initialize Paystack payment');
//     }

//     // Store payment intent in database
//     const { error: intentError } = await supabase
//       .from('payment_intents')
//       .insert({
//         user_id: user.id,
//         plan_id: plan_id,
//         amount: finalPrice,
//         currency: currency,
//         status: 'pending',
//         payment_provider: 'paystack',
//         provider_reference: reference,
//         provider_access_code: paystackResponse.data.data.access_code,
//         coupon_code: coupon_code || null,
//         discount_amount: discountAmount,
//         metadata: {
//           authorization_url: paystackResponse.data.data.authorization_url,
//           plan_name: plan.name,
//         },
//       });

//     if (intentError) {
//       console.error(' Error storing payment intent:', intentError);
//     }

//     // Increment coupon redemption count
//     if (couponDetails) {
//       await supabase
//         .from('coupons')
//         .update({ times_redeemed: (couponDetails.times_redeemed || 0) + 1 })
//         .eq('id', couponDetails.id);
//     }

//     return NextResponse.json({
//       success: true,
//       payment: {
//         reference: reference,
//         access_code: paystackResponse.data.data.access_code,
//         authorization_url: paystackResponse.data.data.authorization_url,
//       },
//       plan: {
//         id: plan.plan_id,
//         name: plan.name,
//         price: finalPrice,
//         original_price: plan.price,
//         discount: discountAmount,
//         currency: currency,
//       },
//     });
//   } catch (error: any) {
//     console.error(' Paystack initialization error:', error.response?.data || error.message);
//     return NextResponse.json(
//       { 
//         error: error.response?.data?.message || error.message || 'Failed to initialize payment',
//         details: error.response?.data 
//       },
//       { status: 500 }
//     );
//   }
// });




// app/api/settings/subscription/upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient } from '@/lib/auth-middleware';

export const POST = withAuth(async (req, user) => {
  try {
    const { plan_id, coupon_code, payment_method_id } = await req.json();

    if (!plan_id) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getAuthenticatedClient(req);

    // Get the plan details
    const { data: plan, error: planError } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('plan_id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Validate required plan fields
    if (plan.websites_limit === null || plan.notifications_limit === null) {
      return NextResponse.json(
        { error: 'Invalid plan configuration. Please contact support.' },
        { status: 400 }
      );
    }

    // Get current subscription
    const { data: currentSub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      throw subError;
    }

    // Here you would integrate with Stripe to create/update subscription
    // For now, we'll update the database directly
    const subscriptionData = {
      user_id: user.id,
      plan_tier: plan.plan_id,
      plan_name: plan.name,
      plan_price: plan.price,
      websites_limit: plan.websites_limit,
      notifications_limit: plan.notifications_limit,
      subscribers_limit: plan.subscribers_limit ?? undefined,
      recurring_limit: plan.recurring_limit ?? undefined,
      coupon_code: coupon_code || null,
      status: 'active' as const,
      subscription_starts_at: new Date().toISOString(),
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      payment_method: payment_method_id ? { last4: '4242', exp_month: 12, exp_year: 2025 } : null,
    };

    let result;
    if (currentSub) {
      // Update existing subscription
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update(subscriptionData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new subscription
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${plan.name} plan`,
      subscription: result,
    });
  } catch (error: any) {
    console.error('Error upgrading subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
});