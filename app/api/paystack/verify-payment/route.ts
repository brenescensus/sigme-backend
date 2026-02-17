// // app/api/paystack/verify-payment/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient } from '@/lib/auth-middleware';
// import axios from 'axios';
// import { paystackConfig } from '@/lib/paystack/paystack-config';

// const PAYSTACK_API_URL = 'https://api.paystack.co';

// export const GET = withAuth(async (req, user) => {
//   try {
//     const { searchParams } = new URL(req.url);
//     const reference = searchParams.get('reference');

//     if (!reference) {
//       return NextResponse.json(
//         { error: 'Payment reference is required' },
//         { status: 400 }
//       );
//     }

//     if (!paystackConfig.secretKey) {
//       throw new Error('Paystack secret key is not configured');
//     }

//     const supabase = await getAuthenticatedClient(req);

//     // Verify payment with Paystack
//     const verifyResponse = await axios.get(
//       `${PAYSTACK_API_URL}/transaction/verify/${reference}`,
//       {
//         headers: {
//           Authorization: `Bearer ${paystackConfig.secretKey}`,
//         },
//       }
//     );

//     if (!verifyResponse.data.status) {
//       throw new Error('Payment verification failed');
//     }

//     const paymentData = verifyResponse.data.data;

//     console.log('Payment verified:', {
//       reference,
//       status: paymentData.status,
//       amount: paymentData.amount / 100,
//       currency: paymentData.currency,
//       test_mode: paystackConfig.isTestMode,
//     });

//     // Check if payment was successful
//     if (paymentData.status !== 'success') {
//       return NextResponse.json({
//         success: false,
//         status: paymentData.status,
//         message: 'Payment was not successful',
//       });
//     }

//     // Get payment intent from database
//     const { data: paymentIntent, error: intentError } = await supabase
//       .from('payment_intents')
//       .select('*')
//       .eq('provider_reference', reference)
//       .eq('user_id', user.id)
//       .single();

//     if (intentError || !paymentIntent) {
//       console.error(' Payment intent not found:', reference);
//       return NextResponse.json(
//         { error: 'Payment record not found' },
//         { status: 404 }
//       );
//     }

//     // If already processed, return success
//     if (paymentIntent.status === 'completed') {
//       return NextResponse.json({
//         success: true,
//         status: 'completed',
//         message: 'Payment already processed',
//         subscription_updated: true,
//         test_mode: paystackConfig.isTestMode,
//       });
//     }

//     // Get plan details
//     const { data: plan } = await supabase
//       .from('pricing_plans')
//       .select('*')
//       .eq('plan_id', paymentIntent.plan_id)
//       .single();

//     if (!plan) {
//       throw new Error('Plan not found');
//     }

//     // Calculate subscription dates
//     const now = new Date();
//     // const nextBillingDate = new Date(now);
//     // nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
// const metadata = paymentData.metadata || paymentIntent.metadata || {};
// const billing_cycle = metadata.billing_cycle || 'monthly';
// const billing_duration = parseInt(metadata.billing_duration || '1', 10);

// const nextBillingDate = new Date(now);
// if (billing_cycle === 'yearly') {
//   nextBillingDate.setFullYear(nextBillingDate.getFullYear() + billing_duration);
// } else {
//   nextBillingDate.setMonth(nextBillingDate.getMonth() + billing_duration);
// }


//     // Update payment intent
//     await supabase
//       .from('payment_intents')
//       .update({
//         status: 'completed',
//         completed_at: now.toISOString(),
//         updated_at: now.toISOString(),
//       })
//       .eq('id', paymentIntent.id);

//     // Get existing subscription
//     const { data: existingSubscription } = await supabase
//       .from('user_subscriptions')
//       .select('*')
//       .eq('user_id', user.id)
//       .single();

//     // Update or create user subscription
//     const subscriptionData = {
//       user_id: user.id,
//       plan_tier: paymentIntent.plan_id,
//       plan_name: plan.name,
//       plan_price: plan.price,
//        notifications_used: 0,
//       status: 'active',
//       websites_limit: plan.websites_limit || 1,
//       notifications_limit: plan.notifications_limit || 10000,
//       recurring_limit: plan.recurring_limit || 0,
//       subscribers_limit: plan.subscribers_limit || null,
//       custom_domains_limit: plan.custom_domains_limit || null,
//       coupon_code: paymentIntent.coupon_code,
//       subscription_starts_at: now.toISOString(),
//       next_billing_date: nextBillingDate.toISOString(),
//       payment_method: {
//         type: 'paystack',
//         last4: paymentData.authorization?.last4 || null,
//         bank: paymentData.authorization?.bank || null,
//         channel: paymentData.authorization?.channel || null,
//         card_type: paymentData.authorization?.card_type || null,
//       },
//       stripe_customer_id: paymentData.customer?.customer_code || null,
//       updated_at: now.toISOString(),
//     };

//     if (existingSubscription) {
//       await supabase
//         .from('user_subscriptions')
//         .update(subscriptionData)
//         .eq('id', existingSubscription.id);
//     } else {
//       await supabase
//         .from('user_subscriptions')
//         .insert(subscriptionData);
//     }

//     // Record coupon redemption if used
//     if (paymentIntent.coupon_code) {
//       const { data: coupon } = await supabase
//         .from('coupons')
//         .select('*')
//         .eq('code', paymentIntent.coupon_code.toUpperCase())
//         .single();

//       if (coupon) {
//         // Create redemption record
//         const { error: redemptionError } = await supabase
//           .from('coupon_redemptions')
//           .insert({
//             user_id: user.id,
//             coupon_id: coupon.id,
//             discount_amount: paymentIntent.discount_amount || 0,
//             subscription_id: existingSubscription?.id || null,
//             redeemed_at: now.toISOString(),
//           });

//         if (redemptionError) {
//           console.error(' Error recording coupon redemption:', redemptionError);
//         } else {
//           // Increment times_redeemed counter
//           await supabase
//             .from('coupons')
//             .update({
//               times_redeemed: (coupon.times_redeemed || 0) + 1,
//               updated_at: now.toISOString(),
//             })
//             .eq('id', coupon.id);

//           console.log('Coupon redeemed:', {
//             code: coupon.code,
//             user: user.email,
//             discount: paymentIntent.discount_amount,
//             times_redeemed: (coupon.times_redeemed || 0) + 1,
//           });
//         }
//       }
//     }

//     // Create billing history record
//     await supabase
//       .from('billing_history')
//       .insert({
//         user_id: user.id,
//         subscription_id: existingSubscription?.id || null,
//         amount: paymentData.amount / 100, // Convert from kobo/cents
//         currency: paymentData.currency.toUpperCase(),
//         description: `${plan.name} Plan - Monthly Subscription${paymentIntent.coupon_code ? ` (Coupon: ${paymentIntent.coupon_code})` : ''}`,
//         status: 'paid',
//         date: now.toISOString(),
//         stripe_invoice_id: reference,
//         invoice_url: paymentData.receipt_url || null,
//       });

//     console.log('Payment verified and subscription activated:', {
//       user: user.email,
//       plan: plan.name,
//       reference: reference,
//       coupon: paymentIntent.coupon_code || 'none',
//     });

//     return NextResponse.json({
//       success: true,
//       status: 'completed',
//       message: 'Payment successful! Your subscription has been activated.',
//       subscription_updated: true,
//       test_mode: paystackConfig.isTestMode,
//       plan: {
//         name: plan.name,
//         tier: plan.plan_id,
//       },
//       payment: {
//         amount: paymentData.amount / 100,
//         currency: paymentData.currency.toUpperCase(),
//         reference: reference,
//       },
//       coupon_applied: !!paymentIntent.coupon_code,
//     });
//   } catch (error: any) {
//     console.error(' Payment verification error:', error.response?.data || error.message);
//     return NextResponse.json(
//       {
//         error: error.response?.data?.message || error.message || 'Payment verification failed',
//         details: error.response?.data,
//       },
//       { status: 500 }
//     );
//   }
// });












// app/api/paystack/verify-payment/route.ts 
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { paystackConfig } from '@/lib/paystack/paystack-config';
import type { Database } from '@/types/database';

const PAYSTACK_API_URL = 'https://api.paystack.co';


const getServiceRoleClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

export const GET = withAuth(async (req, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    if (!paystackConfig.secretKey) {
      throw new Error('Paystack secret key is not configured');
    }

    // FIX 1 applied: use service role for ALL database operations in this route
    const supabase = getServiceRoleClient();

    // Verify payment with Paystack
    const verifyResponse = await axios.get(
      `${PAYSTACK_API_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackConfig.secretKey}`,
        },
      }
    );

    if (!verifyResponse.data.status) {
      throw new Error('Payment verification failed');
    }

    const paymentData = verifyResponse.data.data;

    console.log('Payment verified:', {
      reference,
      status: paymentData.status,
      amount: paymentData.amount / 100,
      currency: paymentData.currency,
      test_mode: paystackConfig.isTestMode,
    });

    if (paymentData.status !== 'success') {
      return NextResponse.json({
        success: false,
        status: paymentData.status,
        message: 'Payment was not successful',
      });
    }

    // FIX 2: Look up payment_intent by reference only (not user_id filtered by JWT)
    // Service role can see all rows — no RLS filter needed
    const { data: paymentIntent, error: intentError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('provider_reference', reference)
      .eq('user_id', user.id) // still verify ownership
      .single();

    if (intentError || !paymentIntent) {
      console.error(' Payment intent not found:', reference, intentError);
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Idempotency: already processed
    if (paymentIntent.status === 'completed') {
      console.log('ℹ️ Payment already processed:', reference);
      return NextResponse.json({
        success: true,
        status: 'completed',
        message: 'Payment already processed',
        subscription_updated: true,
        test_mode: paystackConfig.isTestMode,
      });
    }

    // Get plan details from pricing_plans
    const { data: plan, error: planError } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('plan_id', paymentIntent.plan_id)
      .single();

    if (planError || !plan) {
      console.error(' Plan not found:', paymentIntent.plan_id, planError);
      throw new Error(`Plan not found: ${paymentIntent.plan_id}`);
    }

    console.log('Plan details:', {
      plan_id: plan.plan_id,
      name: plan.name,
      websites_limit: plan.websites_limit,
      notifications_limit: plan.notifications_limit,
      recurring_limit: plan.recurring_limit,
    });

    // FIX 3: Read billing_cycle + billing_duration from payment_intent.metadata
    // (stored there by upgrade/route.ts — paymentData.metadata may be Paystack's
    //  trimmed version, paymentIntent.metadata is our full stored version)
    const metadata = (paymentIntent.metadata as any) || {};
    const billing_cycle: string = metadata.billing_cycle || 'monthly';
    const billing_duration: number = parseInt(String(metadata.billing_duration || '1'), 10);

    console.log('📅 Billing details from metadata:', { billing_cycle, billing_duration });

    // FIX 4: Calculate correct next billing date
    const now = new Date();
    const nextBillingDate = new Date(now);
    if (billing_cycle === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + billing_duration);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + billing_duration);
    }

    console.log('📅 Next billing date:', nextBillingDate.toISOString());

    // Mark payment intent as completed first (before subscription update)
    const { error: intentUpdateError } = await supabase
      .from('payment_intents')
      .update({
        status: 'completed',
        completed_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', paymentIntent.id);

    if (intentUpdateError) {
      console.error(' Failed to update payment intent:', intentUpdateError);
    }

    // Get existing subscription (service role — no RLS)
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('id, plan_tier, websites_used, notifications_used')
      .eq('user_id', user.id)
      .single();

    console.log(' Existing subscription:', existingSubscription);

    // FIX 5: Reset notifications_used + correct billing date
    const subscriptionData = {
      user_id: user.id,
      plan_tier: paymentIntent.plan_id,
      plan_name: plan.name,
      plan_price: plan.price ?? null,
      status: 'active',
      websites_limit: plan.websites_limit ?? 1,
      notifications_limit: plan.notifications_limit ?? 10000,
      recurring_limit: plan.recurring_limit ?? 0,
      subscribers_limit: plan.subscribers_limit ?? null,   // column now exists
      custom_domains_limit: plan.custom_domains_limit ?? null,
      coupon_code: paymentIntent.coupon_code ?? null,
      subscription_starts_at: now.toISOString(),
      subscription_ends_at: nextBillingDate.toISOString(),
      next_billing_date: nextBillingDate.toISOString(),
      notifications_used: 0,  // Reset quota on upgrade
      payment_method: {
        type: 'paystack',
        last4: paymentData.authorization?.last4 ?? null,
        bank: paymentData.authorization?.bank ?? null,
        channel: paymentData.authorization?.channel ?? null,
        card_type: paymentData.authorization?.card_type ?? null,
      },
      stripe_customer_id: paymentData.customer?.customer_code ?? null,
      updated_at: now.toISOString(),
    };

    console.log('🔄 Updating subscription to:', {
      plan_tier: subscriptionData.plan_tier,
      websites_limit: subscriptionData.websites_limit,
      notifications_limit: subscriptionData.notifications_limit,
      next_billing_date: subscriptionData.next_billing_date,
    });

    let subscriptionUpdateError: any = null;

    if (existingSubscription) {
      // FIX 1 in action: service role client — RLS won't block this
      const { error } = await supabase
        .from('user_subscriptions')
        .update(subscriptionData)
        .eq('user_id', user.id); // match on user_id, not .id — safer

      subscriptionUpdateError = error;
    } else {
      const { error } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData);

      subscriptionUpdateError = error;
    }

    if (subscriptionUpdateError) {
      console.error(' SUBSCRIPTION UPDATE FAILED:', subscriptionUpdateError);
      // Don't throw — payment was real, log it and return partial success
      // so user can contact support with the reference
      return NextResponse.json({
        success: false,
        error: 'Payment received but subscription update failed. Please contact support with reference: ' + reference,
        reference,
      }, { status: 500 });
    }

    console.log('Subscription updated successfully');

    // Verify the update actually happened (sanity check)
    const { data: updatedSub } = await supabase
      .from('user_subscriptions')
      .select('plan_tier, notifications_limit, next_billing_date')
      .eq('user_id', user.id)
      .single();

    console.log('Confirmed subscription state:', updatedSub);

    // Record coupon redemption if used
    if (paymentIntent.coupon_code) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', paymentIntent.coupon_code.toUpperCase())
        .single();

      if (coupon) {
        const { error: redemptionError } = await supabase
          .from('coupon_redemptions')
          .insert({
            user_id: user.id,
            coupon_id: coupon.id,
            discount_amount: paymentIntent.discount_amount ?? 0,
            subscription_id: existingSubscription?.id ?? null,
            redeemed_at: now.toISOString(),
          });

        if (!redemptionError) {
          await supabase
            .from('coupons')
            .update({
              times_redeemed: (coupon.times_redeemed ?? 0) + 1,
              updated_at: now.toISOString(),
            })
            .eq('id', coupon.id);

          console.log('Coupon redeemed:', coupon.code);
        } else {
          console.error(' Coupon redemption error:', redemptionError);
        }
      }
    }

    // Record billing history
    // FIX 6: Use description that reflects actual billing_cycle
    const durationLabel = billing_cycle === 'yearly'
      ? `${billing_duration} year${billing_duration > 1 ? 's' : ''}`
      : `${billing_duration} month${billing_duration > 1 ? 's' : ''}`;

    await supabase
      .from('billing_history')
      .insert({
        user_id: user.id,
        subscription_id: existingSubscription?.id ?? null,
        amount: paymentData.amount / 100,
        currency: paymentData.currency.toUpperCase(),
        description: `${plan.name} Plan - ${durationLabel}${paymentIntent.coupon_code ? ` (Coupon: ${paymentIntent.coupon_code})` : ''}`,
        status: 'paid',
        date: now.toISOString(),
        stripe_invoice_id: reference,
        invoice_url: paymentData.receipt_url ?? null,
      });

    console.log('Payment verified and subscription activated:', {
      user: user.email,
      plan: plan.name,
      plan_tier: paymentIntent.plan_id,
      billing_cycle,
      billing_duration,
      next_billing_date: nextBillingDate.toISOString(),
      reference,
      coupon: paymentIntent.coupon_code ?? 'none',
      confirmed_tier: updatedSub?.plan_tier,
    });

    return NextResponse.json({
      success: true,
      status: 'completed',
      message: `${plan.name} plan activated successfully!`,
      subscription_updated: true,
      test_mode: paystackConfig.isTestMode,
      plan: {
        name: plan.name,
        tier: plan.plan_id,
      },
      payment: {
        amount: paymentData.amount / 100,
        currency: paymentData.currency.toUpperCase(),
        reference,
      },
      billing_cycle,
      billing_duration,
      coupon_applied: !!paymentIntent.coupon_code,
    });

  } catch (error: any) {
    console.error(' Payment verification error:', error.response?.data || error.message);
    return NextResponse.json(
      {
        error: error.response?.data?.message || error.message || 'Payment verification failed',
        details: error.response?.data,
      },
      { status: 500 }
    );
  }
});