// // app/api/paystack/verify-payment/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient } from '@/lib/auth-middleware';
// import axios from 'axios';

// const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
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

//     const supabase = await getAuthenticatedClient(req);

//     // Verify payment with Paystack
//     const verifyResponse = await axios.get(
//       `${PAYSTACK_API_URL}/transaction/verify/${reference}`,
//       {
//         headers: {
//           Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
//         },
//       }
//     );

//     if (!verifyResponse.data.status) {
//       throw new Error('Payment verification failed');
//     }

//     const paymentData = verifyResponse.data.data;

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
//     const nextBillingDate = new Date(now);
//     nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

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
//       status: 'active',
//       websites_limit: plan.websites_limit || 1,
//       notifications_limit: plan.notifications_limit || 10000,
//       recurring_limit: plan.recurring_limit || 0,
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

//           console.log(' Coupon redeemed:', {
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

//     console.log(' Payment verified and subscription activated:', {
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
import { withAuth, getAuthenticatedClient } from '@/lib/auth-middleware';
import axios from 'axios';
import { paystackConfig } from '@/lib/paystack/paystack-config';

const PAYSTACK_API_URL = 'https://api.paystack.co';

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

    const supabase = await getAuthenticatedClient(req);

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

    console.log('✅ Payment verified:', {
      reference,
      status: paymentData.status,
      amount: paymentData.amount / 100,
      currency: paymentData.currency,
      test_mode: paystackConfig.isTestMode,
    });

    // Check if payment was successful
    if (paymentData.status !== 'success') {
      return NextResponse.json({
        success: false,
        status: paymentData.status,
        message: 'Payment was not successful',
      });
    }

    // Get payment intent from database
    const { data: paymentIntent, error: intentError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('provider_reference', reference)
      .eq('user_id', user.id)
      .single();

    if (intentError || !paymentIntent) {
      console.error('❌ Payment intent not found:', reference);
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // If already processed, return success
    if (paymentIntent.status === 'completed') {
      return NextResponse.json({
        success: true,
        status: 'completed',
        message: 'Payment already processed',
        subscription_updated: true,
        test_mode: paystackConfig.isTestMode,
      });
    }

    // Get plan details
    const { data: plan } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('plan_id', paymentIntent.plan_id)
      .single();

    if (!plan) {
      throw new Error('Plan not found');
    }

    // Calculate subscription dates
    const now = new Date();
    // const nextBillingDate = new Date(now);
    // nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
const metadata = paymentData.metadata || paymentIntent.metadata || {};
const billing_cycle = metadata.billing_cycle || 'monthly';
const billing_duration = parseInt(metadata.billing_duration || '1', 10);

const nextBillingDate = new Date(now);
if (billing_cycle === 'yearly') {
  nextBillingDate.setFullYear(nextBillingDate.getFullYear() + billing_duration);
} else {
  nextBillingDate.setMonth(nextBillingDate.getMonth() + billing_duration);
}


    // Update payment intent
    await supabase
      .from('payment_intents')
      .update({
        status: 'completed',
        completed_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', paymentIntent.id);

    // Get existing subscription
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Update or create user subscription
    const subscriptionData = {
      user_id: user.id,
      plan_tier: paymentIntent.plan_id,
      plan_name: plan.name,
      plan_price: plan.price,
       notifications_used: 0,
      status: 'active',
      websites_limit: plan.websites_limit || 1,
      notifications_limit: plan.notifications_limit || 10000,
      recurring_limit: plan.recurring_limit || 0,
      subscribers_limit: plan.subscribers_limit || null,
      custom_domains_limit: plan.custom_domains_limit || null,
      coupon_code: paymentIntent.coupon_code,
      subscription_starts_at: now.toISOString(),
      next_billing_date: nextBillingDate.toISOString(),
      payment_method: {
        type: 'paystack',
        last4: paymentData.authorization?.last4 || null,
        bank: paymentData.authorization?.bank || null,
        channel: paymentData.authorization?.channel || null,
        card_type: paymentData.authorization?.card_type || null,
      },
      stripe_customer_id: paymentData.customer?.customer_code || null,
      updated_at: now.toISOString(),
    };

    if (existingSubscription) {
      await supabase
        .from('user_subscriptions')
        .update(subscriptionData)
        .eq('id', existingSubscription.id);
    } else {
      await supabase
        .from('user_subscriptions')
        .insert(subscriptionData);
    }

    // Record coupon redemption if used
    if (paymentIntent.coupon_code) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', paymentIntent.coupon_code.toUpperCase())
        .single();

      if (coupon) {
        // Create redemption record
        const { error: redemptionError } = await supabase
          .from('coupon_redemptions')
          .insert({
            user_id: user.id,
            coupon_id: coupon.id,
            discount_amount: paymentIntent.discount_amount || 0,
            subscription_id: existingSubscription?.id || null,
            redeemed_at: now.toISOString(),
          });

        if (redemptionError) {
          console.error('❌ Error recording coupon redemption:', redemptionError);
        } else {
          // Increment times_redeemed counter
          await supabase
            .from('coupons')
            .update({
              times_redeemed: (coupon.times_redeemed || 0) + 1,
              updated_at: now.toISOString(),
            })
            .eq('id', coupon.id);

          console.log('✅ Coupon redeemed:', {
            code: coupon.code,
            user: user.email,
            discount: paymentIntent.discount_amount,
            times_redeemed: (coupon.times_redeemed || 0) + 1,
          });
        }
      }
    }

    // Create billing history record
    await supabase
      .from('billing_history')
      .insert({
        user_id: user.id,
        subscription_id: existingSubscription?.id || null,
        amount: paymentData.amount / 100, // Convert from kobo/cents
        currency: paymentData.currency.toUpperCase(),
        description: `${plan.name} Plan - Monthly Subscription${paymentIntent.coupon_code ? ` (Coupon: ${paymentIntent.coupon_code})` : ''}`,
        status: 'paid',
        date: now.toISOString(),
        stripe_invoice_id: reference,
        invoice_url: paymentData.receipt_url || null,
      });

    console.log('✅ Payment verified and subscription activated:', {
      user: user.email,
      plan: plan.name,
      reference: reference,
      coupon: paymentIntent.coupon_code || 'none',
    });

    return NextResponse.json({
      success: true,
      status: 'completed',
      message: 'Payment successful! Your subscription has been activated.',
      subscription_updated: true,
      test_mode: paystackConfig.isTestMode,
      plan: {
        name: plan.name,
        tier: plan.plan_id,
      },
      payment: {
        amount: paymentData.amount / 100,
        currency: paymentData.currency.toUpperCase(),
        reference: reference,
      },
      coupon_applied: !!paymentIntent.coupon_code,
    });
  } catch (error: any) {
    console.error('❌ Payment verification error:', error.response?.data || error.message);
    return NextResponse.json(
      {
        error: error.response?.data?.message || error.message || 'Payment verification failed',
        details: error.response?.data,
      },
      { status: 500 }
    );
  }
});