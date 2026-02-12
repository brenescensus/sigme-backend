// app/api/paystack/initialize-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient } from '@/lib/auth-middleware';
import axios from 'axios';
import { paystackConfig } from '@/lib/paystack/paystack-config';

const PAYSTACK_API_URL = 'https://api.paystack.co';

export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const { plan_id, coupon_code, currency = 'USD' } = body;

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

    let finalAmount = plan.price;
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

        // Calculate discount
        if (coupon.type === 'percentage') {
          discountAmount = (finalAmount * coupon.value) / 100;
        } else if (coupon.type === 'fixed') {
          discountAmount = coupon.value;
        }

        finalAmount = Math.max(0, finalAmount - discountAmount);
        couponData = coupon;
      } else {
        return NextResponse.json(
          { error: 'Invalid or inactive coupon code' },
          { status: 400 }
        );
      }
    }

    // Convert currency if KES
    const USD_TO_KES_RATE = 129;
    const paymentCurrency = currency === 'KES' ? 'KES' : 'USD';
    let paymentAmount = finalAmount;
    
    if (currency === 'KES') {
      paymentAmount = Math.round(finalAmount * USD_TO_KES_RATE);
    }

    // Initialize payment with Paystack
    const paystackResponse = await axios.post(
      `${PAYSTACK_API_URL}/transaction/initialize`,
      {
        email: user.email,
        amount: Math.round(paymentAmount * 100), // Convert to kobo/cents
        currency: paymentCurrency,
        metadata: {
          user_id: user.id,
          plan_id: plan_id,
          plan_name: plan.name,
          coupon_code: coupon_code || null,
          discount_amount: discountAmount,
          original_currency: 'USD',
          original_amount: finalAmount,
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
        channels: ['card', 'bank', 'ussd', 'mobile_money'], // Enable multiple payment channels
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
        amount: finalAmount, // Store in USD (already validated as non-null)
        currency: paymentCurrency,
        status: 'pending',
        payment_provider: 'paystack',
        provider_reference: reference,
        provider_access_code: access_code,
        coupon_code: coupon_code || null,
        discount_amount: discountAmount,
        metadata: {
          original_amount: plan.price,
          coupon_applied: !!coupon_code,
          payment_currency: paymentCurrency,
          payment_amount: paymentAmount,
        },
      });

    if (intentError) {
      console.error('❌ Error creating payment intent:', intentError);
      throw new Error('Failed to create payment record');
    }

    console.log('Payment initialized:', {
      user: user.email,
      plan: plan.name,
      amount: finalAmount,
      currency: paymentCurrency,
      reference: reference,
      test_mode: paystackConfig.isTestMode,
    });

    return NextResponse.json({
      success: true,
      authorization_url,
      access_code,
      reference,
      amount: finalAmount,
      payment_amount: paymentAmount,
      payment_currency: paymentCurrency,
      original_amount: plan.price,
      discount_applied: discountAmount > 0,
      discount_amount: discountAmount,
      test_mode: paystackConfig.isTestMode,
    });
  } catch (error: any) {
    console.error('❌ Payment initialization error:', error.response?.data || error.message);
    return NextResponse.json(
      {
        error: error.response?.data?.message || error.message || 'Payment initialization failed',
        details: error.response?.data,
      },
      { status: 500 }
    );
  }
});