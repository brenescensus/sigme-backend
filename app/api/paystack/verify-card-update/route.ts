// app/api/paystack/verify-card-update/route.ts
// Called after user completes card authorization on Paystack hosted page.
// Verifies the transaction, extracts card details, and saves to DB.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthUser } from '@/lib/auth-middleware';
import { paystackConfig } from '@/lib/paystack/paystack-config';

// Service role — bypasses RLS for subscription updates (same as verify-payment)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const { searchParams } = new URL(req.url);
      const reference = searchParams.get('reference');

      if (!reference) {
        return NextResponse.json(
          { success: false, error: 'Missing reference' },
          { status: 400 }
        );
      }

      if (!paystackConfig.secretKey) {
        throw new Error('Paystack secret key is not configured');
      }

      console.log(`[Verify Card Update] Verifying reference: ${reference} for: ${user.email}`);

      // 1. Verify the transaction on Paystack
      const verifyResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${paystackConfig.secretKey}`,
          },
        }
      );

      const verifyData = await verifyResponse.json() as {
        status: boolean;
        message?: string;
        data?: {
          status: string;
          amount: number;
          currency: string;
          metadata?: {
            purpose?: string;
            user_id?: string;
            email_token?: string;
          };
          customer?: {
            email?: string;
            customer_code?: string;
          };
          authorization?: {
            last4: string;
            exp_month: string;
            exp_year: string;
            card_type: string;
            bank: string;
            authorization_code: string;
            channel: string;
            brand: string;
            reusable: boolean;
          };
        };
      };

      if (!verifyData.status || verifyData.data?.status !== 'success') {
        throw new Error(verifyData.message ?? 'Card verification failed');
      }

      const transaction = verifyData.data!;

      // 2. Confirm this was a card_update transaction (soft check — log mismatch but continue)
      const purpose = transaction.metadata?.purpose;
      if (purpose && purpose !== 'card_update') {
        console.warn(`[Verify Card Update] Unexpected purpose: ${purpose}`);
      }

      // 3. Confirm the transaction belongs to the authenticated user
      const txUserId = transaction.metadata?.user_id;
      if (txUserId && txUserId !== user.id) {
        console.error(`[Verify Card Update] User mismatch: token=${user.id}, tx=${txUserId}`);
        return NextResponse.json(
          { success: false, error: 'Transaction does not belong to this user' },
          { status: 403 }
        );
      }

      // 4. Extract card authorization
      const authorization = transaction.authorization;
      if (!authorization) {
        throw new Error('No card authorization data returned by Paystack');
      }

      const newPaymentMethod = {
        last4: authorization.last4,
        exp_month: authorization.exp_month,
        exp_year: authorization.exp_year,
        card_type: authorization.card_type,
        bank: authorization.bank,
        authorization_code: authorization.authorization_code, // stored for future charges
        channel: authorization.channel,
        brand: authorization.brand,
      };

      console.log(`[Verify Card Update] Card: •••• ${newPaymentMethod.last4} (${newPaymentMethod.card_type})`);

      // 5. Save card to user_subscriptions
      // stripe_customer_id stores the customer code for future Paystack charges
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          payment_method: newPaymentMethod,
          stripe_customer_id:
            transaction.customer?.customer_code ??
            transaction.metadata?.email_token ??
            transaction.customer?.email ??
            null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      console.log(`[Verify Card Update] Card saved successfully for: ${user.email}`);

      return NextResponse.json({
        success: true,
        message: 'Card updated successfully',
        payment_method: {
          last4: newPaymentMethod.last4,
          exp_month: newPaymentMethod.exp_month,
          exp_year: newPaymentMethod.exp_year,
          card_type: newPaymentMethod.card_type,
          brand: newPaymentMethod.brand,
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Card update verification failed';
      console.error('[Verify Card Update] Error:', msg);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }
);