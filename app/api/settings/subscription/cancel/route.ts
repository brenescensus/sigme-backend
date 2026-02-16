// app/api/settings/subscription/cancel/route.ts
// Cancels the user's Paystack subscription and downgrades to free tier

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthUser } from '@/lib/auth-middleware';

// Use service role for DB writes (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

export const POST = withAuth(
  async (req: NextRequest, user: AuthUser): Promise<NextResponse> => {
    try {
      console.log(`[Cancel Subscription] Processing for: ${user.email}`);

      // 1. Fetch current subscription
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError || !subscription) {
        return NextResponse.json(
          { success: false, error: 'No active subscription found' },
          { status: 404 }
        );
      }

      // 2. Already on free plan — nothing to cancel
      if (subscription.plan_tier === 'free') {
        return NextResponse.json(
          { success: false, error: 'You are already on the free plan' },
          { status: 400 }
        );
      }

      // 3. Disable Paystack subscription if one exists
      // Paystack subscription codes always start with "SUB_"
      const paystackCode: string | null = subscription.stripe_subscription_id ?? null;

      if (paystackCode && paystackCode.startsWith('SUB_')) {
        try {
          const psRes = await fetch('https://api.paystack.co/subscription/disable', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: paystackCode,
              token: subscription.stripe_customer_id ?? '',
            }),
          });

          // Explicitly type the parsed JSON — avoids implicit 'any'
          const psData = (await psRes.json()) as { status: boolean; message?: string };

          if (!psData.status) {
            console.warn('[Cancel Subscription] Paystack disable warning:', psData.message ?? 'unknown');
          } else {
            console.log('[Cancel Subscription] Paystack subscription disabled');
          }
        } catch (psErr: unknown) {
          // Typed as unknown — FIX for "implicitly has any type"
          const msg = psErr instanceof Error ? psErr.message : String(psErr);
          console.error('[Cancel Subscription] Paystack API error (non-fatal):', msg);
          // Always continue — downgrade locally even if Paystack fails
        }
      }

      // 4. Downgrade to free tier in DB
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          plan_tier: 'free',
          plan_name: 'Free',
          plan_price: 0,
          notifications_limit: 10000,
          websites_limit: 1,
          recurring_limit: 0,
          subscribers_limit: 1000,
          status: 'cancelled',
          stripe_subscription_id: null,  // clear Paystack sub code
          payment_method: null,           // clear stored card details
          next_billing_date: null,
          subscription_ends_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[Cancel Subscription] DB update error:', updateError.message);
        throw new Error(updateError.message);
      }

      // 5. Write a billing_history record for the cancellation
      // FIX: Supabase insert returns a PostgrestFilterBuilder — use await + destructuring,
      // NOT .catch() chaining (which doesn't exist on that type)
      try {
        const { error: logError } = await supabase
          .from('billing_history')
          .insert({
            user_id: user.id,
            amount: 0,
            description: 'Subscription cancelled — downgraded to Free plan',
            date: new Date().toISOString().split('T')[0], // "YYYY-MM-DD"
            status: 'cancelled',
            subscription_id: subscription.id,
          });

        if (logError) {
          // logError is PostgrestError — has .message typed — no 'any' needed
          console.warn('[Cancel Subscription] Billing log error:', logError.message);
        }
      } catch (logErr: unknown) {
        const msg = logErr instanceof Error ? logErr.message : String(logErr);
        console.warn('[Cancel Subscription] Billing log exception:', msg);
      }

      console.log(`[Cancel Subscription] Done for: ${user.email}`);

      return NextResponse.json({
        success: true,
        message: 'Subscription cancelled. You have been moved to the Free plan.',
      });

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to cancel subscription';
      console.error('[Cancel Subscription] Unhandled error:', msg);
      return NextResponse.json(
        { success: false, error: msg },
        { status: 500 }
      );
    }
  }
);