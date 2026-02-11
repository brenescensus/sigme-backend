// app/api/affiliates/payout/route.ts
// Affiliate payout request endpoint (authenticated)

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const userId = user.id;
    const body = await req.json();
    const { amount, payment_method, payment_details } = body;

    // Get affiliate account
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!affiliate) {
      return NextResponse.json(
        { success: false, error: 'Affiliate account not found' },
        { status: 404 }
      );
    }

    // Check minimum payout
    const { data: settings } = await supabase
      .from('affiliate_settings')
      .select('min_payout_amount')
      .single();

    const minPayout = settings?.min_payout_amount || 50;

    if (amount < minPayout) {
      return NextResponse.json(
        { success: false, error: `Minimum payout amount is $${minPayout}` },
        { status: 400 }
      );
    }

    // Check available balance
    const { data: pendingCommissions } = await supabase
      .from('affiliate_commissions')
      .select('amount')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'approved');

    const availableBalance = pendingCommissions?.reduce((sum, c) => sum + c.amount, 0) || 0;

    if (amount > availableBalance) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}`
        },
        { status: 400 }
      );
    }

    // Create payout request
    const { data: payout, error } = await supabase
      .from('affiliate_payouts')
      .insert({
        affiliate_id: affiliate.id,
        amount,
        payment_method,
        payment_details,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Payout request submitted successfully',
      payout
    });

  } catch (error: any) {
    console.error('Request payout error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});