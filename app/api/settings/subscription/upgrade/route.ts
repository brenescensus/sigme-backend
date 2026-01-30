// // // // app/api/settings/subscription/upgrade/route.ts
// // // import { NextRequest, NextResponse } from 'next/server';
// // // import { withAuth, getAuthenticatedClient } from '@/lib/auth-middleware';
// // // import type { Database } from '@/types/database';

// // // type UserSubscriptionInsert = Database['public']['Tables']['user_subscriptions']['Insert'];

// // // export const POST = withAuth(async (req, user): Promise<NextResponse> => {
// // //   try {
// // //     const { plan_id, coupon_code, payment_method_id } = await req.json();

// // //     if (!plan_id) {
// // //       return NextResponse.json(
// // //         { error: 'Plan ID is required' },
// // //         { status: 400 }
// // //       );
// // //     }
// // //     const supabase = await getAuthenticatedClient(req);
// // //     // Get the plan details
// // //     // Note: plan_id must match exactly (case-sensitive) and is_active must be true
// // //     // Common plan_ids: 'free', 'starter', 'pro', 'enterprise'
// // //     const { data: plan, error: planError } = await supabase
// // //       .from('pricing_plans')
// // //       .select('*')
// // //       .eq('plan_id', plan_id)
// // //       .eq('is_active', true)
// // //       .single();

// // //     if (planError || !plan) {
// // //       console.error(' Plan lookup error:', {
// // //         plan_id,
// // //         error: planError,
// // //         message: planError?.message,
// // //         code: planError?.code,
// // //         details: planError?.details
// // //       });
      
// // //       return NextResponse.json(
// // //         { 
// // //           error: 'Invalid plan selected',
// // //           debug: process.env.NODE_ENV === 'development' ? {
// // //             plan_id,
// // //             error_code: planError?.code,
// // //             error_message: planError?.message
// // //           } : undefined
// // //         },
// // //         { status: 400 }
// // //       );
// // //     }

// // //     // Validate required plan fields that cannot be null
// // //     if (
// // //       plan.websites_limit === null || 
// // //       plan.notifications_limit === null
// // //     ) {
// // //       return NextResponse.json(
// // //         { error: 'Invalid plan configuration. Please contact support.' },
// // //         { status: 400 }
// // //       );
// // //     }

// // //     // Get current subscription
// // //     const { data: currentSub, error: subError } = await supabase
// // //       .from('user_subscriptions')
// // //       .select('*')
// // //       .eq('user_id', user.id)
// // //       .single();

// // //     if (subError && subError.code !== 'PGRST116') {
// // //       throw subError;
// // //     }

// // //     // Here you would integrate with Stripe to create/update subscription
// // //     // For now, we'll update the database directly
// // //     const subscriptionData: UserSubscriptionInsert = {
// // //       user_id: user.id,
// // //       plan_tier: plan.plan_id,
// // //       plan_name: plan.name,
// // //       plan_price: plan.price,
// // //       websites_limit: plan.websites_limit,
// // //       notifications_limit: plan.notifications_limit,
// // //       // Convert null to undefined for optional fields
// // //       recurring_limit: plan.recurring_limit ?? undefined,
// // //       coupon_code: coupon_code || null,
// // //       status: 'active',
// // //       subscription_starts_at: new Date().toISOString(),
// // //       next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
// // //       payment_method: payment_method_id ? { last4: '4242', exp_month: 12, exp_year: 2025 } : null,
// // //     };

// // //     let result;
// // //     if (currentSub) {
// // //       // Update existing subscription
// // //       const { data, error } = await supabase
// // //         .from('user_subscriptions')
// // //         .update(subscriptionData)
// // //         .eq('user_id', user.id)
// // //         .select()
// // //         .single();

// // //       if (error) throw error;
// // //       result = data;
// // //     } else {
// // //       // Create new subscription
// // //       const { data, error } = await supabase
// // //         .from('user_subscriptions')
// // //         .insert(subscriptionData)
// // //         .select()
// // //         .single();

// // //       if (error) throw error;
// // //       result = data;
// // //     }

// // //     return NextResponse.json({
// // //       success: true,
// // //       message: `Successfully upgraded to ${plan.name} plan`,
// // //       subscription: result,
// // //     });
// // //   } catch (error: any) {
// // //     console.error('Error upgrading subscription:', error);
// // //     return NextResponse.json(
// // //       { error: error.message || 'Failed to upgrade subscription' },
// // //       { status: 500 }
// // //     );
// // //   }
// // // });





// // // app/api/settings/subscription/upgrade/route.ts
// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@supabase/supabase-js';
// // import type { Database } from '@/types/database';

// // const supabase = createClient<Database>(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

// // // Helper to verify user
// // async function verifyUser(req: NextRequest) {
// //   const authHeader = req.headers.get('authorization');
// //   if (!authHeader?.startsWith('Bearer ')) {
// //     throw new Error('Unauthorized');
// //   }

// //   const token = authHeader.substring(7);
// //   const { data: { user }, error } = await supabase.auth.getUser(token);
  
// //   if (error || !user) {
// //     throw new Error('Unauthorized');
// //   }

// //   return user;
// // }

// // // POST /api/settings/subscription/upgrade
// // export async function POST(req: NextRequest) {
// //   try {
// //     const user = await verifyUser(req);
// //     const { plan_id, coupon_code, currency = 'USD', amount } = await req.json();

// //     if (!plan_id || !amount) {
// //       return NextResponse.json(
// //         { error: 'Plan ID and amount are required' },
// //         { status: 400 }
// //       );
// //     }

// //     // Get the pricing plan
// //     const { data: plan, error: planError } = await supabase
// //       .from('pricing_plans')
// //       .select('*')
// //       .eq('plan_id', plan_id)
// //       .single();

// //     if (planError || !plan) {
// //       return NextResponse.json(
// //         { error: 'Invalid plan selected' },
// //         { status: 404 }
// //       );
// //     }

// //     let couponData = null;
// //     let discountAmount = 0;

// //     // Validate coupon if provided
// //     if (coupon_code) {
// //       const { data: coupon, error: couponError } = await supabase
// //         .from('coupons')
// //         .select('*')
// //         .eq('code', coupon_code.toUpperCase())
// //         .single();

// //       if (couponError || !coupon) {
// //         return NextResponse.json(
// //           { error: 'Invalid coupon code' },
// //           { status: 400 }
// //         );
// //       }

// //       // Validate coupon (same checks as validate endpoint)
// //       const now = new Date();

// //       if (!coupon.is_active) {
// //         return NextResponse.json(
// //           { error: 'This coupon is no longer active' },
// //           { status: 400 }
// //         );
// //       }

// //       if (coupon.valid_until && new Date(coupon.valid_until) < now) {
// //         return NextResponse.json(
// //           { error: 'This coupon has expired' },
// //           { status: 400 }
// //         );
// //       }

// //       if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
// //         return NextResponse.json(
// //           { error: 'This coupon has reached its redemption limit' },
// //           { status: 400 }
// //         );
// //       }

// //       // Check if user already redeemed
// //       const { data: existingRedemption } = await supabase
// //         .from('coupon_redemptions')
// //         .select('id')
// //         .eq('coupon_id', coupon.id)
// //         .eq('user_id', user.id)
// //         .single();

// //       if (existingRedemption) {
// //         return NextResponse.json(
// //           { error: 'You have already used this coupon' },
// //           { status: 400 }
// //         );
// //       }

// //       // Calculate discount
// //       if (coupon.type === 'percentage') {
// //         discountAmount = (plan.price * coupon.value) / 100;
// //       } else if (coupon.type === 'fixed') {
// //         discountAmount = Math.min(coupon.value, plan.price);
// //       }

// //       couponData = coupon;
// //     }

// //     const finalAmount = Math.max(0, amount);

// //     // Convert amount to kobo (Paystack uses kobo for NGN, cents for USD)
// //     const paystackAmount = currency === 'KES' 
// //       ? finalAmount * 100 // Convert to cents
// //       : finalAmount * 100; // Convert to cents

// //     // Get user profile for email
// //     const { data: profile } = await supabase
// //       .from('user_profiles')
// //       .select('first_name, last_name')
// //       .eq('id', user.id)
// //       .single();

// //     // Initialize Paystack payment
// //     const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
// //       method: 'POST',
// //       headers: {
// //         'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
// //         'Content-Type': 'application/json',
// //       },
// //       body: JSON.stringify({
// //         email: user.email,
// //         amount: paystackAmount,
// //         currency: currency,
// //         callback_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/settings?payment=success`,
// //         metadata: {
// //           user_id: user.id,
// //           plan_id: plan_id,
// //           plan_name: plan.name,
// //           coupon_code: coupon_code || null,
// //           discount_amount: discountAmount,
// //           custom_fields: [
// //             {
// //               display_name: "Plan",
// //               variable_name: "plan",
// //               value: plan.name
// //             },
// //             {
// //               display_name: "User",
// //               variable_name: "user",
// //               value: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user.email
// //             }
// //           ]
// //         },
// //         channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
// //       }),
// //     });

// //     if (!paystackResponse.ok) {
// //       const error = await paystackResponse.json();
// //       console.error(' Paystack error:', error);
// //       throw new Error(error.message || 'Failed to initialize payment');
// //     }

// //     const paymentData = await paystackResponse.json();

// //     // Create payment intent record
// //     const { data: paymentIntent, error: intentError } = await supabase
// //       .from('payment_intents')
// //       .insert({
// //         user_id: user.id,
// //         plan_id: plan.id,
// //         amount: finalAmount,
// //         currency: currency,
// //         discount_amount: discountAmount || null,
// //         coupon_code: coupon_code || null,
// //         payment_provider: 'paystack',
// //         provider_reference: paymentData.data.reference,
// //         provider_access_code: paymentData.data.access_code,
// //         status: 'pending',
// //         metadata: {
// //           plan_name: plan.name,
// //           original_amount: plan.price,
// //           coupon_applied: !!coupon_code,
// //         },
// //       })
// //       .select()
// //       .single();

// //     if (intentError) {
// //       console.error(' Failed to create payment intent:', intentError);
// //       throw new Error('Failed to create payment record');
// //     }

// //     console.log(' Payment initialized:', {
// //       user: user.email,
// //       plan: plan.name,
// //       amount: finalAmount,
// //       currency: currency,
// //       reference: paymentData.data.reference,
// //       coupon: coupon_code || 'none',
// //     });

// //     return NextResponse.json({
// //       success: true,
// //       payment: {
// //         reference: paymentData.data.reference,
// //         access_code: paymentData.data.access_code,
// //         authorization_url: paymentData.data.authorization_url,
// //       },
// //       payment_intent_id: paymentIntent.id,
// //       plan: {
// //         id: plan.id,
// //         name: plan.name,
// //         price: plan.price,
// //       },
// //       amount: finalAmount,
// //       currency: currency,
// //       discount: discountAmount,
// //     });

// //   } catch (error: any) {
// //     console.error(' Error upgrading plan:', error);
// //     return NextResponse.json(
// //       { error: error.message || 'Failed to upgrade plan' },
// //       { status: error.message === 'Unauthorized' ? 401 : 500 }
// //     );
// //   }
// // }



















// // app/api/settings/subscription/upgrade/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient } from '@/lib/auth-middleware';

// const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

// export const POST = withAuth(async (req, user) => {
//   try {
//     const { plan_id, coupon_code, currency = 'USD', amount } = await req.json();

//     if (!plan_id) {
//       return NextResponse.json(
//         { error: 'Plan ID is required' },
//         { status: 400 }
//       );
//     }

//     const supabase = await getAuthenticatedClient(req);

//     // Get the plan details
//     const { data: plan, error: planError } = await supabase
//       .from('pricing_plans')
//       .select('*')
//       .eq('plan_id', plan_id)
//       .eq('is_active', true)
//       .single();

//     if (planError || !plan) {
//       console.error(' Plan lookup error:', planError);
//       return NextResponse.json(
//         { error: 'Invalid plan selected' },
//         { status: 400 }
//       );
//     }

//     // Validate required plan fields
//     if (plan.websites_limit === null || plan.notifications_limit === null) {
//       return NextResponse.json(
//         { error: 'Invalid plan configuration. Please contact support.' },
//         { status: 400 }
//       );
//     }

//     // If plan is free or doesn't require payment
//     if (!plan.price || plan.price === 0) {
//       // Directly update subscription for free plan
//       const subscriptionData = {
//         user_id: user.id,
//         plan_tier: plan.plan_id,
//         plan_name: plan.name,
//         plan_price: 0,
//         websites_limit: plan.websites_limit,
//         notifications_limit: plan.notifications_limit,
//         recurring_limit: plan.recurring_limit ?? undefined,
//         status: 'active' as const,
//         subscription_starts_at: new Date().toISOString(),
//       };

//       const { data: existingSub } = await supabase
//         .from('user_subscriptions')
//         .select('*')
//         .eq('user_id', user.id)
//         .single();

//       if (existingSub) {
//         await supabase
//           .from('user_subscriptions')
//           .update(subscriptionData)
//           .eq('user_id', user.id);
//       } else {
//         await supabase
//           .from('user_subscriptions')
//           .insert(subscriptionData);
//       }

//       return NextResponse.json({
//         success: true,
//         message: `Successfully upgraded to ${plan.name} plan`,
//         subscription: subscriptionData,
//       });
//     }

//     // For paid plans, handle coupon validation and payment initialization
//     let couponData = null;
//     let discountAmount = 0;
//     let finalPrice = plan.price;

//     // Validate coupon if provided
//     if (coupon_code) {
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

//       // Validate coupon
//       const now = new Date();

//       if (!coupon.is_active) {
//         return NextResponse.json(
//           { error: 'This coupon is no longer active' },
//           { status: 400 }
//         );
//       }

//       if (coupon.valid_from && new Date(coupon.valid_from) > now) {
//         return NextResponse.json(
//           { error: 'This coupon is not yet valid' },
//           { status: 400 }
//         );
//       }

//       if (coupon.valid_until && new Date(coupon.valid_until) < now) {
//         return NextResponse.json(
//           { error: 'This coupon has expired' },
//           { status: 400 }
//         );
//       }

      
//      if (coupon.max_redemptions && (coupon.times_redeemed || 0) >= coupon.max_redemptions) {
//       return NextResponse.json(
//         { error: 'This coupon has reached its maximum redemptions' },
//         { status: 400 }
//       );
//     }

//       // Check if user already redeemed
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

//       // Check minimum purchase amount
//       if (coupon.min_purchase_amount && plan.price < coupon.min_purchase_amount) {
//         return NextResponse.json(
//           { error: `Minimum purchase amount of $${coupon.min_purchase_amount} required` },
//           { status: 400 }
//         );
//       }

//       // Check applicable plans
//       if (coupon.applicable_plans && coupon.applicable_plans.length > 0) {
//         if (!coupon.applicable_plans.includes(plan_id)) {
//           return NextResponse.json(
//             { error: 'Coupon not applicable to this plan' },
//             { status: 400 }
//           );
//         }
//       }

//       // Calculate discount
//       if (coupon.type === 'percentage') {
//         discountAmount = (plan.price * coupon.value) / 100;
//       } else if (coupon.type === 'fixed') {
//         discountAmount = Math.min(coupon.value, plan.price);
//       }

//       finalPrice = Math.max(0, plan.price - discountAmount);
//       couponData = coupon;

//       console.log(' Coupon validated:', {
//         code: coupon.code,
//         discount: discountAmount,
//         final_price: finalPrice,
//       });
//     }

//     // Use provided amount or calculated final price
//     const paymentAmount = amount || finalPrice;

//     // Convert to kobo/cents for Paystack
//     const paystackAmount = Math.round(paymentAmount * 100);

//     // Get user profile
//     const { data: profile } = await supabase
//       .from('user_profiles')
//       .select('first_name, last_name')
//       .eq('id', user.id)
//       .single();

//     // Generate unique reference
//     const reference = `sigma_${user.id}_${Date.now()}`;

//     // Initialize Paystack payment
//     const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         email: user.email,
//         amount: paystackAmount,
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
//           custom_fields: [
//             {
//               display_name: "Plan",
//               variable_name: "plan",
//               value: plan.name
//             },
//             {
//               display_name: "User",
//               variable_name: "user",
//               value: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user.email
//             }
//           ]
//         },
//         channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
//       }),
//     });

//     if (!paystackResponse.ok) {
//       const error = await paystackResponse.json();
//       console.error(' Paystack error:', error);
//       throw new Error(error.message || 'Failed to initialize payment');
//     }

//     const paymentData = await paystackResponse.json();

//     // Create payment intent record
//     const { data: paymentIntent, error: intentError } = await supabase
//       .from('payment_intents')
//       .insert({
//         user_id: user.id,
//         plan_id: plan.id,
//         amount: finalPrice,
//         currency: currency,
//         discount_amount: discountAmount || null,
//         coupon_code: coupon_code || null,
//         payment_provider: 'paystack',
//         provider_reference: reference,
//         provider_access_code: paymentData.data.access_code,
//         status: 'pending',
//         metadata: {
//           authorization_url: paymentData.data.authorization_url,
//           plan_name: plan.name,
//           original_amount: plan.price,
//           coupon_applied: !!coupon_code,
//         },
//       })
//       .select()
//       .single();

//     if (intentError) {
//       console.error(' Failed to create payment intent:', intentError);
//       throw new Error('Failed to create payment record');
//     }

//     console.log(' Payment initialized:', {
//       user: user.email,
//       plan: plan.name,
//       amount: finalPrice,
//       currency: currency,
//       reference: reference,
//       coupon: coupon_code || 'none',
//     });

//     return NextResponse.json({
//       success: true,
//       payment: {
//         reference: reference,
//         access_code: paymentData.data.access_code,
//         authorization_url: paymentData.data.authorization_url,
//       },
//       payment_intent_id: paymentIntent.id,
//       plan: {
//         id: plan.id,
//         name: plan.name,
//         price: plan.price,
//         final_price: finalPrice,
//       },
//       amount: finalPrice,
//       currency: currency,
//       discount: discountAmount,
//     });

//   } catch (error: any) {
//     console.error(' Error upgrading plan:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to upgrade plan' },
//       { status: 500 }
//     );
//   }
// });














// app/api/settings/subscription/upgrade/route.ts
// FIXED: Better coupon validation and error handling

// app/api/settings/subscription/upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

//  Create service role client (bypasses RLS)
const getServiceRoleClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

export const POST = withAuth(async (req, user) => {
  try {
    const { plan_id, coupon_code, currency = 'USD', amount } = await req.json();

    console.log('📦 Upgrade request:', {
      plan_id,
      coupon_code,
      currency,
      amount,
      user: user.email
    });

    if (!plan_id) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    //  Use service role client
    const supabase = getServiceRoleClient();

    // Get the plan details
    const { data: plan, error: planError } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('plan_id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error(' Plan lookup error:', planError);
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    console.log(' Plan found:', {
      plan_id: plan.plan_id,
      name: plan.name,
      price: plan.price
    });
    // Validate required plan fields
    if (plan.websites_limit === null || plan.notifications_limit === null) {
      return NextResponse.json(
        { error: 'Invalid plan configuration. Please contact support.' },
        { status: 400 }
      );
    }

    // If plan is free or doesn't require payment
    if (!plan.price || plan.price === 0) {
      const subscriptionData = {
        user_id: user.id,
        plan_tier: plan.plan_id,
        plan_name: plan.name,
        plan_price: 0,
        websites_limit: plan.websites_limit,
        notifications_limit: plan.notifications_limit,
        recurring_limit: plan.recurring_limit ?? undefined,
        status: 'active' as const,
        subscription_starts_at: new Date().toISOString(),
      };

      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingSub) {
        await supabase
          .from('user_subscriptions')
          .update(subscriptionData)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_subscriptions')
          .insert(subscriptionData);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully upgraded to ${plan.name} plan`,
        subscription: subscriptionData,
      });
    }

    // For paid plans, handle coupon validation and payment initialization
    let couponData = null;
    let discountAmount = 0;
    let finalPrice = plan.price;

    // Validate coupon if provided

        if (coupon_code) {
      console.log('🎫 Validating coupon:', {
        code: coupon_code,
        uppercase: coupon_code.toUpperCase(),
        plan_price: plan.price
      });

      const normalizedCouponCode = String(coupon_code).trim().toUpperCase();

    
      // const { data: coupon, error: couponError } = await supabase
      //   .from('coupons')
      //   .select('*')
      //   .eq('code', normalizedCouponCode)
      //   .single();

      // console.log('🔍 Coupon lookup result:', {
      //   found: !!coupon,
      //   error: couponError?.message,
      //   code_searched: normalizedCouponCode
      // });

      // if (couponError || !coupon) {
      //   console.error(' Coupon not found:', {
      //     code: normalizedCouponCode,
      //     error: couponError
      //   });
      //   return NextResponse.json(
      //     { error: 'Invalid coupon code' },
      //     { status: 400 }
      //   );
      // }

        const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select(`
          id,
          code,
          type,
          value,
          is_active,
          valid_from,
          valid_until,
          max_redemptions,
          times_redeemed,
          min_purchase_amount,
          applicable_plans,
          description
        `)
        .eq('code', normalizedCouponCode)
        .single();

      console.log('🔍 Coupon lookup result:', {
        found: !!coupon,
        error: couponError?.message,
        code_searched: normalizedCouponCode
      });

      if (couponError || !coupon) {
        console.error(' Coupon not found:', {
          code: normalizedCouponCode,
          error: couponError
        });
        return NextResponse.json(
          { error: 'Invalid coupon code' },
          { status: 400 }
        );
      }

      // Validate coupon
      const now = new Date();

      if (!coupon.is_active) {
        console.error(' Coupon inactive:', coupon.code);
        return NextResponse.json(
          { error: 'This coupon is no longer active' },
          { status: 400 }
        );
      }

      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        console.error(' Coupon not yet valid:', {
          code: coupon.code,
          valid_from: coupon.valid_from
        });
        return NextResponse.json(
          { error: 'This coupon is not yet valid' },
          { status: 400 }
        );
      }

      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        console.error(' Coupon expired:', {
          code: coupon.code,
          valid_until: coupon.valid_until
        });
        return NextResponse.json(
          { error: 'This coupon has expired' },
          { status: 400 }
        );
      }

      if (coupon.max_redemptions && (coupon.times_redeemed || 0) >= coupon.max_redemptions) {
        console.error(' Coupon max redemptions reached:', {
          code: coupon.code,
          times_redeemed: coupon.times_redeemed,
          max_redemptions: coupon.max_redemptions
        });
        return NextResponse.json(
          { error: 'This coupon has reached its maximum redemptions' },
          { status: 400 }
        );
      }

      // Check if user already redeemed
      const { data: existingRedemption } = await supabase
        .from('coupon_redemptions')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', user.id)
        .single();

      if (existingRedemption) {
        console.error(' User already redeemed coupon:', {
          user: user.email,
          code: coupon.code
        });
        return NextResponse.json(
          { error: 'You have already used this coupon' },
          { status: 400 }
        );
      }

      // Check minimum purchase amount
      if (coupon.min_purchase_amount && plan.price < coupon.min_purchase_amount) {
        console.error(' Minimum purchase amount not met:', {
          plan_price: plan.price,
          min_required: coupon.min_purchase_amount
        });
        return NextResponse.json(
          { error: `Minimum purchase amount of $${coupon.min_purchase_amount} required` },
          { status: 400 }
        );
      }

      // Check applicable plans
      if (coupon.applicable_plans && coupon.applicable_plans.length > 0) {
        if (!coupon.applicable_plans.includes(plan_id)) {
          console.error(' Coupon not applicable to plan:', {
            code: coupon.code,
            plan_id: plan_id,
            applicable_plans: coupon.applicable_plans
          });
          return NextResponse.json(
            { error: 'Coupon not applicable to this plan' },
            { status: 400 }
          );
        }
      }

      // Calculate discount
      if (coupon.type === 'percentage') {
        discountAmount = (plan.price * coupon.value) / 100;
      } else if (coupon.type === 'fixed') {
        discountAmount = Math.min(coupon.value, plan.price);
      }

      finalPrice = Math.max(0, plan.price - discountAmount);
      couponData = coupon;

      console.log(' Coupon validated successfully:', {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount: discountAmount,
        original_price: plan.price,
        final_price: finalPrice,
      });
    }

    // Use provided amount or calculated final price
    const paymentAmount = amount || finalPrice;

    console.log('💰 Payment calculation:', {
      plan_price: plan.price,
      discount: discountAmount,
      final_price: finalPrice,
      amount_to_charge: paymentAmount,
      currency: currency
    });

    // Convert to kobo/cents for Paystack
    const paystackAmount = Math.round(paymentAmount * 100);

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    // Generate unique reference
    const reference = `sigma_${user.id}_${Date.now()}`;

    console.log('🔄 Initializing Paystack payment:', {
      reference,
      amount: paystackAmount,
      currency,
      email: user.email
    });

    // Initialize Paystack payment
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: paystackAmount,
        currency: currency,
        reference: reference,
        callback_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/settings?payment=success&reference=${reference}`,
        metadata: {
          user_id: user.id,
          plan_id: plan_id,
          plan_name: plan.name,
          coupon_code: coupon_code || null,
          discount_amount: discountAmount,
          original_price: plan.price,
          final_price: finalPrice,
          custom_fields: [
            {
              display_name: "Plan",
              variable_name: "plan",
              value: plan.name
            },
            {
              display_name: "User",
              variable_name: "user",
              value: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user.email
            }
          ]
        },
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      }),
    });

    if (!paystackResponse.ok) {
      const error = await paystackResponse.json();
      console.error(' Paystack error:', error);
      throw new Error(error.message || 'Failed to initialize payment');
    }

    const paymentData = await paystackResponse.json();

    console.log(' Paystack response:', {
      reference: paymentData.data.reference,
      access_code: paymentData.data.access_code,
      has_auth_url: !!paymentData.data.authorization_url
    });

    // Create payment intent record
    const { data: paymentIntent, error: intentError } = await supabase
      .from('payment_intents')
      .insert({
        user_id: user.id,
        plan_id: plan.id, //  Use UUID plan.id, not plan_id string
        amount: finalPrice,
        currency: currency,
        discount_amount: discountAmount || null,
        coupon_code: coupon_code || null,
        payment_provider: 'paystack',
        provider_reference: reference,
        provider_access_code: paymentData.data.access_code,
        status: 'pending',
        metadata: {
          authorization_url: paymentData.data.authorization_url,
          plan_name: plan.name,
          plan_id: plan.plan_id, // Store string plan_id in metadata
          original_amount: plan.price,
          coupon_applied: !!coupon_code,
        },
      })
      .select()
      .single();

    if (intentError) {
      console.error(' Failed to create payment intent:', intentError);
      throw new Error('Failed to create payment record');
    }

    console.log(' Payment initialized successfully:', {
      user: user.email,
      plan: plan.name,
      amount: finalPrice,
      currency: currency,
      reference: reference,
      coupon: coupon_code || 'none',
      payment_intent_id: paymentIntent.id
    });

    return NextResponse.json({
      success: true,
      payment: {
        reference: reference,
        access_code: paymentData.data.access_code,
        authorization_url: paymentData.data.authorization_url,
      },
      payment_intent_id: paymentIntent.id,
      plan: {
        id: plan.id,
        plan_id: plan.plan_id,
        name: plan.name,
        price: plan.price,
        final_price: finalPrice,
      },
      amount: finalPrice,
      currency: currency,
      discount: discountAmount,
    });

  } catch (error: any) {
    // console.error(' Error upgrading plan:', error);
    // return NextResponse.json(
    //   { error: error.message || 'Failed to upgrade plan' },
    //   { status: 500 }

    console.error(' Error upgrading plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upgrade plan' },
      { status: 500 }
    );
  }
});