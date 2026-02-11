// app/api/admin/affiliates/payouts/[id]/process/route.ts
// Admin: Process affiliate payout

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, logAdminActivity } from '@/lib/admin-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const POST = withAdmin(async (
  req: NextRequest,
  adminUser,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    // FIXED: Await params before destructuring
    const { id } = await context.params;
    const body = await req.json();
    const { transaction_id, notes } = body;
    const adminId = adminUser.id;

    // Get payout
    const { data: payout, error: payoutError } = await supabase
      .from('affiliate_payouts')
      .select('*')
      .eq('id', id)
      .single();

    if (payoutError || !payout) {
      return NextResponse.json(
        { success: false, error: 'Payout not found' },
        { status: 404 }
      );
    }

    // Update payout status
    const { error: updateError } = await supabase
      .from('affiliate_payouts')
      .update({
        status: 'completed',
        transaction_id,
        notes,
        processed_by: adminId,
        processed_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Update affiliate paid earnings
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('paid_earnings')
      .eq('id', payout.affiliate_id)
      .single();

    if (affiliate) {
      await supabase
        .from('affiliates')
        .update({
          paid_earnings: (affiliate.paid_earnings || 0) + payout.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', payout.affiliate_id);
    }

    // Mark commissions as paid
    await supabase
      .from('affiliate_commissions')
      .update({ 
        status: 'paid',
        payout_id: id 
      })
      .eq('affiliate_id', payout.affiliate_id)
      .eq('status', 'approved');

    // Log admin activity
    await logAdminActivity(
      adminId,
      'payout_processed',
      'affiliate_payout',
      id,
      { amount: payout.amount, transaction_id }
    );

    return NextResponse.json({
      success: true,
      message: 'Payout processed successfully'
    });

  } catch (error: any) {
    console.error('Process payout error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});