// app/api/affiliates/convert/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Track affiliate conversion when user signs up
 * This is called from the frontend after successful signup
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { affiliate_code, user_id } = await req.json();

    if (!affiliate_code || !user_id) {
      return NextResponse.json(
        { error: 'Missing affiliate_code or user_id' },
        { status: 400 }
      );
    }

    console.log('[Conversion] Tracking conversion for code:', affiliate_code);

    // 1. Find the affiliate by code
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, user_id, commission_rate')
      .eq('affiliate_code', affiliate_code)
      .eq('status', 'active')
      .single();

    if (affiliateError || !affiliate) {
      console.error('[Conversion] Affiliate not found or not active:', affiliateError);
      return NextResponse.json(
        { error: 'Invalid or inactive affiliate code' },
        { status: 404 }
      );
    }

    // 2. Find the most recent click for this affiliate code
    const { data: click, error: clickError } = await supabase
      .from('affiliate_clicks')
      .select('id')
      .eq('affiliate_code', affiliate_code)
      .eq('converted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (clickError && clickError.code !== 'PGRST116') {
      console.error('[Conversion] Error finding click:', clickError);
    }

    // 3. Mark the click as converted (if found)
    if (click) {
      await supabase
        .from('affiliate_clicks')
        .update({
          converted: true,
          conversion_date: new Date().toISOString(),
        })
        .eq('id', click.id);
    }

    // 4. Create affiliate referral record
    const { data: referral, error: referralError } = await supabase
      .from('affiliate_referrals')
      .insert({
        affiliate_id: affiliate.id,
        click_id: click?.id || null,
        referred_user_id: user_id,
        referred_email: user.email,
        signup_date: new Date().toISOString(),
        status: 'qualified', // Will become 'converted' when they subscribe
        commission_rate: affiliate.commission_rate,
      })
      .select()
      .single();

    if (referralError) {
      console.error('[Conversion] Error creating referral:', referralError);
      return NextResponse.json(
        { error: 'Failed to create referral record' },
        { status: 500 }
      );
    }

    // 5. Update affiliate stats
    await supabase.rpc('increment', {
      table_name: 'affiliates',
      column_name: 'total_signups',
      row_id: affiliate.id,
    });

    console.log('[Conversion] Conversion tracked successfully:', {
      affiliate_id: affiliate.id,
      referral_id: referral.id,
      user_id,
    });

    return NextResponse.json({
      success: true,
      message: 'Conversion tracked successfully',
      referral_id: referral.id,
    });

  } catch (error: any) {
    console.error('[Conversion] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track conversion' },
      { status: 500 }
    );
  }
});