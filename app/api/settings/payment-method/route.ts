// app/api/settings/payment-method/route.ts
// Handles updating and deleting the stored payment method (card) via Paystack

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthUser } from '@/lib/auth-middleware';
import { paystackConfig } from '@/lib/paystack/paystack-config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── GET /api/settings/payment-method ────────────────────────────────────────
// Returns the current stored payment method for the user

export const GET = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select('payment_method, stripe_customer_id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        payment_method: subscription?.payment_method ?? null,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch payment method';
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }
);

// ─── POST /api/settings/payment-method ───────────────────────────────────────
// Initializes a Paystack transaction to capture a new card.
// Uses ZAR + paystackConfig to match the rest of the payment stack.
// Amount: R1.00 (100 kobo) — minimum for card tokenization, auto-refunded.
// Returns { authorization_url, reference, access_code }

export const POST = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const body = await req.json().catch(() => ({})) as { callback_url?: string };
      const callbackUrl =
        body.callback_url ??
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?card_update=success`;

      console.log(`[Payment Method POST] Initializing card update for: ${user.email}`);

      if (!paystackConfig.secretKey) {
        throw new Error('Paystack secret key is not configured');
      }

      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackConfig.secretKey}`,  // same as initialize-payment
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: 100,        // R1.00 in kobo — minimum ZAR authorization charge
          currency: 'ZAR',    // must match your Paystack merchant account
          callback_url: callbackUrl,
          metadata: {
            user_id: user.id,
            purpose: 'card_update',
          },
          channels: ['card'], // card only — no EFT/bank transfer for tokenization
        }),
      });

      const paystackData = await paystackResponse.json() as {
        status: boolean;
        message?: string;
        data?: {
          authorization_url: string;
          reference: string;
          access_code: string;
        };
      };

      console.log(`[Payment Method POST] Paystack response status: ${paystackData.status}`);

      if (!paystackData.status || !paystackData.data?.authorization_url) {
        throw new Error(paystackData.message ?? 'Failed to initialize card update');
      }

      return NextResponse.json({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
        access_code: paystackData.data.access_code,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to initialize card update';
      console.error('[Payment Method POST] Error:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }
);

// ─── DELETE /api/settings/payment-method ─────────────────────────────────────
// Removes the stored card from the user's subscription.
// Returns a warning if the user has an active paid plan.

export const DELETE = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      console.log(`[Payment Method DELETE] Removing card for: ${user.email}`);

      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('id, plan_tier, stripe_subscription_id, payment_method')
        .eq('user_id', user.id)
        .single();

      if (subError || !subscription) {
        return NextResponse.json(
          { success: false, error: 'Subscription not found' },
          { status: 404 }
        );
      }

      const isActivePaidPlan =
        subscription.plan_tier !== 'free' && !!subscription.stripe_subscription_id;

      if (isActivePaidPlan) {
        console.warn(
          `[Payment Method DELETE] User ${user.email} removing card on active paid plan: ${subscription.plan_tier}`
        );
      }

      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          payment_method: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      console.log(`[Payment Method DELETE] Card removed for: ${user.email}`);

      return NextResponse.json({
        success: true,
        message: 'Payment method removed successfully.',
        warning: isActivePaidPlan
          ? 'Your card has been removed. Your subscription may not renew without a payment method.'
          : null,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to remove payment method';
      console.error('[Payment Method DELETE] Error:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }
);