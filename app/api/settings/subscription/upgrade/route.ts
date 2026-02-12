// app/api/settings/subscription/upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { paystackConfig } from '@/lib/paystack/paystack-config';
import { convertCurrency, getExchangeRate } from '@/lib/currency/currency-service';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

// Supported Paystack currencies
const SUPPORTED_CURRENCIES = ['NGN', 'GHS', 'ZAR', 'KES'] as const;
type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

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
    const { 
      plan_id, 
      coupon_code, 
      currency = 'ZAR',
      billing_cycle = 'monthly',
      billing_duration = 1
    } = await req.json();

    if (!plan_id) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Validate currency
    if (!SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)) {
      return NextResponse.json(
        { 
          error: `Currency ${currency} not supported. Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Validate billing duration
    if (billing_duration < 1 || billing_duration > 12) {
      return NextResponse.json(
        { error: 'Billing duration must be between 1 and 12' },
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

    console.log('Plan found:', {
      plan_id: plan.plan_id,
      name: plan.name,
      price: plan.price,
      billing_cycle,
      billing_duration
    });

    // Validate required plan fields and price
    if (plan.websites_limit === null || plan.notifications_limit === null || plan.price === null) {
      return NextResponse.json(
        { error: 'Invalid plan configuration. Please contact support.' },
        { status: 400 }
      );
    }

    // If plan is free or doesn't require payment
    if (plan.price === 0) {
      const subscriptionData = {
        user_id: user.id,
        plan_tier: plan.plan_id,
        plan_name: plan.name,
        plan_price: 0,
        websites_limit: plan.websites_limit,
        notifications_limit: plan.notifications_limit,
        subscribers_limit: plan.subscribers_limit ?? null,    
        custom_domains_limit: plan.custom_domains_limit ?? null, 
        notifications_used: 0,
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

    // Calculate total price based on billing cycle and duration
    const basePrice = billing_cycle === 'yearly'
      ? (plan.yearly_price || plan.price * 12)
      : plan.price;
    
    const totalPriceUSD = basePrice * billing_duration;
    let finalPriceUSD = totalPriceUSD;
    let discountAmount = 0;
    let couponData = null;

    // Handle coupon validation with total price
    if (coupon_code) {
      console.log('🎫 Validating coupon:', coupon_code);

      const normalizedCouponCode = String(coupon_code).trim().toUpperCase();

      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', normalizedCouponCode)
        .single();

      if (couponError || !coupon) {
        console.error(' Coupon not found:', normalizedCouponCode);
        return NextResponse.json(
          { error: 'Invalid coupon code' },
          { status: 400 }
        );
      }

      // Validate coupon
      const now = new Date();

      if (!coupon.is_active) {
        return NextResponse.json(
          { error: 'This coupon is no longer active' },
          { status: 400 }
        );
      }

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

      const timesRedeemed = coupon.times_redeemed ?? 0;
      if (coupon.max_redemptions && timesRedeemed >= coupon.max_redemptions) {
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
        return NextResponse.json(
          { error: 'You have already used this coupon' },
          { status: 400 }
        );
      }

      // Check minimum purchase amount (compare with total price)
      if (coupon.min_purchase_amount && totalPriceUSD < coupon.min_purchase_amount) {
        return NextResponse.json(
          { error: `Minimum purchase amount of $${coupon.min_purchase_amount} required` },
          { status: 400 }
        );
      }

      // Check applicable plans
      if (coupon.applicable_plans && coupon.applicable_plans.length > 0) {
        if (!coupon.applicable_plans.includes(plan_id)) {
          return NextResponse.json(
            { error: 'Coupon not applicable to this plan' },
            { status: 400 }
          );
        }
      }

      // Calculate discount on total price
      if (coupon.type === 'percentage') {
        discountAmount = (totalPriceUSD * coupon.value) / 100;
      } else if (coupon.type === 'fixed') {
        discountAmount = Math.min(coupon.value, totalPriceUSD);
      }

      finalPriceUSD = Math.max(0, totalPriceUSD - discountAmount);
      couponData = coupon;

      console.log('Coupon validated:', {
        code: coupon.code,
        total_price: totalPriceUSD,
        discount: discountAmount,
        final_price_usd: finalPriceUSD,
      });
    }

    // Get real-time exchange rate and convert
    const exchangeRate = await getExchangeRate(currency);
    const paymentAmount = await convertCurrency(finalPriceUSD, currency);

    console.log(' Payment calculation:', {
      base_price_usd: basePrice,
      billing_duration: billing_duration,
      total_price_usd: totalPriceUSD,
      discount_usd: discountAmount,
      final_price_usd: finalPriceUSD,
      currency: currency,
      exchange_rate: exchangeRate,
      amount_in_currency: paymentAmount,
      rate_updated: new Date().toISOString()
    });

    // Convert to kobo/cents for Paystack (multiply by 100)
    const paystackAmount = paymentAmount * 100;

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    // Generate unique reference
    const reference = `sigma_${user.id.substring(0, 8)}_${Date.now()}`;

    // Duration label for display
    const durationLabel = billing_cycle === 'yearly'
      ? `${billing_duration} year${billing_duration > 1 ? 's' : ''}`
      : `${billing_duration} month${billing_duration > 1 ? 's' : ''}`;

    console.log(' Initializing Paystack payment:', {
      reference,
      amount: paystackAmount,
      currency,
      email: user.email,
      duration: durationLabel,
      test_mode: paystackConfig.isTestMode
    });
    const callbackUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/billing?payment=success&reference=${reference}`;

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
        callback_url: callbackUrl,
        metadata: {
          user_id: user.id,
          plan_id: plan_id,
          plan_name: plan.name,
          billing_cycle: billing_cycle,
          billing_duration: billing_duration,
          duration_label: durationLabel,
          coupon_code: coupon_code || null,
          discount_amount_usd: discountAmount,
          base_price_usd: basePrice,
          total_price_usd: totalPriceUSD,
          final_price_usd: finalPriceUSD,
          payment_currency: currency,
          payment_amount: paymentAmount,
          exchange_rate: exchangeRate,
          custom_fields: [
            {
              display_name: "Plan",
              variable_name: "plan",
              value: plan.name
            },
            {
              display_name: "Duration",
              variable_name: "duration",
              value: durationLabel
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

    console.log('Paystack response received');

    // Create payment intent record
    const { data: paymentIntent, error: intentError } = await supabase
      .from('payment_intents')
      .insert({
        user_id: user.id,
        plan_id: plan_id,
        amount: finalPriceUSD, // Store final USD amount
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
          billing_cycle: billing_cycle,
          billing_duration: billing_duration,
          duration_label: durationLabel,
          base_price_usd: basePrice,
          total_price_usd: totalPriceUSD,
          final_amount_usd: finalPriceUSD,
          payment_currency: currency,
          payment_amount: paymentAmount,
          exchange_rate: exchangeRate,
          coupon_applied: !!coupon_code,
        },
      })
      .select()
      .single();

    if (intentError) {
      console.error(' Failed to create payment intent:', intentError);
      throw new Error('Failed to create payment record');
    }

    console.log('Payment initialized successfully:', {
      user: user.email,
      plan: plan.name,
      duration: durationLabel,
      base_price_usd: basePrice,
      total_price_usd: totalPriceUSD,
      final_price_usd: finalPriceUSD,
      amount_local: paymentAmount,
      currency: currency,
      exchange_rate: exchangeRate,
      reference: reference,
      callback_url: callbackUrl, 
      test_mode: paystackConfig.isTestMode
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
        price_usd: plan.price,
        base_price_usd: basePrice,
        total_price_usd: totalPriceUSD,
        final_price_usd: finalPriceUSD,
        final_price_local: paymentAmount,
      },
      billing_cycle: billing_cycle,
      billing_duration: billing_duration,
      duration_label: durationLabel,
      amount_usd: finalPriceUSD,
      amount_local: paymentAmount,
      currency: currency,
      exchange_rate: exchangeRate,
      discount: discountAmount,
      test_mode: paystackConfig.isTestMode,
    });

  } catch (error: any) {
    console.error(' Error upgrading plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upgrade plan' },
      { status: 500 }
    );
  }
});