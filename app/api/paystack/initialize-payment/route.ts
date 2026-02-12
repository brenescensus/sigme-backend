// // app/api/paystack/initialize-payment/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient } from '@/lib/auth-middleware';
// import axios from 'axios';
// import { paystackConfig } from '@/lib/paystack/paystack-config';

// const PAYSTACK_API_URL = 'https://api.paystack.co';

// export const POST = withAuth(async (req, user) => {
//   try {
//     const body = await req.json();
//     const { 
//       plan_id,
//        coupon_code, 
//       //  currency = 'USD'
//         display_currency = 'USD'
//        } = body;

//     if (!plan_id) {
//       return NextResponse.json(
//         { error: 'Plan ID is required' },
//         { status: 400 }
//       );
//     }

//     // Validate that we have the secret key
//     if (!paystackConfig.secretKey) {
//       throw new Error('Paystack secret key is not configured');
//     }

//     const supabase = await getAuthenticatedClient(req);

//     // Get plan details
//     const { data: plan, error: planError } = await supabase
//       .from('pricing_plans')
//       .select('*')
//       .eq('plan_id', plan_id)
//       .eq('is_active', true)
//       .single();

//     if (planError || !plan) {
//       return NextResponse.json(
//         { error: 'Plan not found or inactive' },
//         { status: 404 }
//       );
//     }

//     // Validate plan configuration and ensure price is not null
//     if (plan.websites_limit === null || plan.notifications_limit === null || plan.price === null) {
//       return NextResponse.json(
//         { error: 'Invalid plan configuration. Please contact support.' },
//         { status: 400 }
//       );
//     }

//     let finalAmount = plan.price;
//     let discountAmount = 0;
//     let couponData = null;

//     // Handle coupon if provided
//     if (coupon_code) {
//       const { data: coupon, error: couponError } = await supabase
//         .from('coupons')
//         .select('*')
//         .eq('code', coupon_code.toUpperCase())
//         .eq('is_active', true)
//         .single();

//       if (!couponError && coupon) {
//         // Validate coupon dates
//         const now = new Date();
//         const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
//         const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

//         if (validFrom && now < validFrom) {
//           return NextResponse.json(
//             { error: 'Coupon is not yet valid' },
//             { status: 400 }
//           );
//         }

//         if (validUntil && now > validUntil) {
//           return NextResponse.json(
//             { error: 'Coupon has expired' },
//             { status: 400 }
//           );
//         }

//         // Check if applicable to this plan
//         if (coupon.applicable_plans && coupon.applicable_plans.length > 0) {
//           if (!coupon.applicable_plans.includes(plan_id)) {
//             return NextResponse.json(
//               { error: 'Coupon not applicable to this plan' },
//               { status: 400 }
//             );
//           }
//         }

//         // Check max redemptions
//         const timesRedeemed = coupon.times_redeemed ?? 0;
//         if (coupon.max_redemptions && timesRedeemed >= coupon.max_redemptions) {
//           return NextResponse.json(
//             { error: 'Coupon has reached maximum redemptions' },
//             { status: 400 }
//           );
//         }

//         // Calculate discount
//         if (coupon.type === 'percentage') {
//           discountAmount = (finalAmount * coupon.value) / 100;
//         } else if (coupon.type === 'fixed') {
//           discountAmount = coupon.value;
//         }

//         finalAmount = Math.max(0, finalAmount - discountAmount);
//         couponData = coupon;
//       } else {
//         return NextResponse.json(
//           { error: 'Invalid or inactive coupon code' },
//           { status: 400 }
//         );
//       }
//     }

//     // Convert currency if KES
//     const USD_TO_KES_RATE = 129;
//     const paymentCurrency = currency === 'KES' ? 'KES' : 'USD';
//     let paymentAmount = finalAmount;
    
//     if (currency === 'KES') {
//       paymentAmount = Math.round(finalAmount * USD_TO_KES_RATE);
//     }

//     // Initialize payment with Paystack
//     const paystackResponse = await axios.post(
//       `${PAYSTACK_API_URL}/transaction/initialize`,
//       {
//         email: user.email,
//         amount: Math.round(paymentAmount * 100), // Convert to kobo/cents
//         currency: paymentCurrency,
//         metadata: {
//           user_id: user.id,
//           plan_id: plan_id,
//           plan_name: plan.name,
//           coupon_code: coupon_code || null,
//           discount_amount: discountAmount,
//           original_currency: 'USD',
//           original_amount: finalAmount,
//         },
//         callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
//         channels: ['card', 'bank', 'ussd', 'mobile_money'], // Enable multiple payment channels
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${paystackConfig.secretKey}`,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     if (!paystackResponse.data.status) {
//       throw new Error('Failed to initialize payment with Paystack');
//     }

//     const { authorization_url, access_code, reference } = paystackResponse.data.data;

//     // Create payment intent record
//     const { error: intentError } = await supabase
//       .from('payment_intents')
//       .insert({
//         user_id: user.id,
//         plan_id: plan_id,
//         amount: finalAmount, // Store in USD (already validated as non-null)
//         currency: paymentCurrency,
//         status: 'pending',
//         payment_provider: 'paystack',
//         provider_reference: reference,
//         provider_access_code: access_code,
//         coupon_code: coupon_code || null,
//         discount_amount: discountAmount,
//         metadata: {
//           original_amount: plan.price,
//           coupon_applied: !!coupon_code,
//           payment_currency: paymentCurrency,
//           payment_amount: paymentAmount,
//         },
//       });

//     if (intentError) {
//       console.error(' Error creating payment intent:', intentError);
//       throw new Error('Failed to create payment record');
//     }

//     console.log('Payment initialized:', {
//       user: user.email,
//       plan: plan.name,
//       amount: finalAmount,
//       currency: paymentCurrency,
//       reference: reference,
//       test_mode: paystackConfig.isTestMode,
//     });

//     return NextResponse.json({
//       success: true,
//       authorization_url,
//       access_code,
//       reference,
//       amount: finalAmount,
//       payment_amount: paymentAmount,
//       payment_currency: paymentCurrency,
//       original_amount: plan.price,
//       discount_applied: discountAmount > 0,
//       discount_amount: discountAmount,
//       test_mode: paystackConfig.isTestMode,
//     });
//   } catch (error: any) {
//     console.error(' Payment initialization error:', error.response?.data || error.message);
//     return NextResponse.json(
//       {
//         error: error.response?.data?.message || error.message || 'Payment initialization failed',
//         details: error.response?.data,
//       },
//       { status: 500 }
//     );
//   }
// });



// app/api/paystack/initialize-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient } from '@/lib/auth-middleware';
import axios from 'axios';
import { paystackConfig } from '@/lib/paystack/paystack-config';
import { getExchangeRates } from '@/lib/currency/currency-service';

const PAYSTACK_API_URL = 'https://api.paystack.co';

export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { 
      plan_id,
      coupon_code,
      billing_cycle = 'monthly',
      billing_duration = 1,
      display_currency = 'USD' // User's selected display currency
    } = body;

    if (!plan_id) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Validate that we have the secret key
    if (!paystackConfig.secretKey) {
      throw new Error('Paystack secret key is not configured');
    }

    const supabase = await getAuthenticatedClient(req);

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('plan_id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan not found or inactive' },
        { status: 404 }
      );
    }

    // Validate plan configuration and ensure price is not null
    if (plan.websites_limit === null || plan.notifications_limit === null || plan.price === null) {
      return NextResponse.json(
        { error: 'Invalid plan configuration. Please contact support.' },
        { status: 400 }
      );
    }

    // Calculate base price based on billing cycle
    const basePrice = billing_cycle === 'yearly'
      ? (plan.yearly_price || plan.price * 12)
      : plan.price;
    
    // Calculate total price including duration
    let finalAmountUSD = basePrice * billing_duration;
    let discountAmount = 0;
    let couponData = null;

    // Handle coupon if provided
    if (coupon_code) {
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', coupon_code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (!couponError && coupon) {
        // Validate coupon dates
        const now = new Date();
        const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
        const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

        if (validFrom && now < validFrom) {
          return NextResponse.json(
            { error: 'Coupon is not yet valid' },
            { status: 400 }
          );
        }

        if (validUntil && now > validUntil) {
          return NextResponse.json(
            { error: 'Coupon has expired' },
            { status: 400 }
          );
        }

        // Check if applicable to this plan
        if (coupon.applicable_plans && coupon.applicable_plans.length > 0) {
          if (!coupon.applicable_plans.includes(plan_id)) {
            return NextResponse.json(
              { error: 'Coupon not applicable to this plan' },
              { status: 400 }
            );
          }
        }

        // Check max redemptions
        const timesRedeemed = coupon.times_redeemed ?? 0;
        if (coupon.max_redemptions && timesRedeemed >= coupon.max_redemptions) {
          return NextResponse.json(
            { error: 'Coupon has reached maximum redemptions' },
            { status: 400 }
          );
        }

        // Calculate discount on the total amount
        if (coupon.type === 'percentage') {
          discountAmount = (finalAmountUSD * coupon.value) / 100;
        } else if (coupon.type === 'fixed') {
          discountAmount = coupon.value * billing_duration;
        }

        finalAmountUSD = Math.max(0, finalAmountUSD - discountAmount);
        couponData = coupon;
      } else {
        return NextResponse.json(
          { error: 'Invalid or inactive coupon code' },
          { status: 400 }
        );
      }
    }

    // Get real-time exchange rates
    const exchangeRates = await getExchangeRates();
    const zarRate = exchangeRates['ZAR'] || 18.50; // Fallback to 18.50 if rate fetch fails
    
    // Always convert to ZAR for Paystack payment
    const paymentAmountZAR = Math.round(finalAmountUSD * zarRate);

    console.log(' Payment calculation:', {
      plan: plan.name,
      base_price_usd: basePrice,
      billing_cycle,
      billing_duration,
      total_before_discount: basePrice * billing_duration,
      discount_amount: discountAmount,
      final_amount_usd: finalAmountUSD,
      zar_exchange_rate: zarRate,
      payment_amount_zar: paymentAmountZAR,
      display_currency,
    });

    // Initialize payment with Paystack (always in ZAR)
    const paystackResponse = await axios.post(
      `${PAYSTACK_API_URL}/transaction/initialize`,
      {
        email: user.email,
        amount: paymentAmountZAR * 100, // Convert to cents (kobo)
        currency: 'ZAR', // Always ZAR for Paystack
        metadata: {
          user_id: user.id,
          plan_id: plan_id,
          plan_name: plan.name,
          billing_cycle,
          billing_duration,
          coupon_code: coupon_code || null,
          discount_amount: discountAmount,
          original_amount_usd: basePrice * billing_duration,
          final_amount_usd: finalAmountUSD,
          display_currency, // User's preferred display currency
          payment_currency: 'ZAR',
          zar_exchange_rate: zarRate,
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?payment=success`,
        channels: ['card', 'bank', 'ussd', 'mobile_money'],
      },
      {
        headers: {
          Authorization: `Bearer ${paystackConfig.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paystackResponse.data.status) {
      throw new Error('Failed to initialize payment with Paystack');
    }

    const { authorization_url, access_code, reference } = paystackResponse.data.data;

    // Create payment intent record
    const { error: intentError } = await supabase
      .from('payment_intents')
      .insert({
        user_id: user.id,
        plan_id: plan_id,
        amount: finalAmountUSD, // Store the final USD amount
        currency: 'ZAR', // Payment currency
        status: 'pending',
        payment_provider: 'paystack',
        provider_reference: reference,
        provider_access_code: access_code,
        coupon_code: coupon_code || null,
        discount_amount: discountAmount,
        metadata: {
          billing_cycle,
          billing_duration,
          original_amount: plan.price,
          original_total_usd: basePrice * billing_duration,
          final_amount_usd: finalAmountUSD,
          payment_amount_zar: paymentAmountZAR,
          display_currency,
          zar_exchange_rate: zarRate,
          coupon_applied: !!coupon_code,
          payment_currency: 'ZAR',
        },
      });

    if (intentError) {
      console.error(' Error creating payment intent:', intentError);
      throw new Error('Failed to create payment record');
    }

    console.log('✅ Payment initialized:', {
      user: user.email,
      plan: plan.name,
      amount_usd: finalAmountUSD,
      amount_zar: paymentAmountZAR,
      reference: reference,
      test_mode: paystackConfig.isTestMode,
    });

    return NextResponse.json({
      success: true,
      authorization_url,
      access_code,
      reference,
      amount_usd: finalAmountUSD,
      amount_zar: paymentAmountZAR,
      payment_currency: 'ZAR',
      display_currency,
      exchange_rate: zarRate,
      original_amount: plan.price,
      discount_applied: discountAmount > 0,
      discount_amount: discountAmount,
      test_mode: paystackConfig.isTestMode,
    });
  } catch (error: any) {
    console.error(' Payment initialization error:', error.response?.data || error.message);
    return NextResponse.json(
      {
        error: error.response?.data?.message || error.message || 'Payment initialization failed',
        details: error.response?.data,
      },
      { status: 500 }
    );
  }
});