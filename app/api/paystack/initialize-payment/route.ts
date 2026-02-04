// app/api/settings/subscription/upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient } from '@/lib/auth-middleware';

export const POST = withAuth(async (req, user) => {
  try {
    const { plan_id, coupon_code, payment_method_id } = await req.json();

    if (!plan_id) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getAuthenticatedClient(req);

    // Get the plan details
    const { data: plan, error: planError } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('plan_id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Validate required plan fields
    if (plan.websites_limit === null || plan.notifications_limit === null) {
      return NextResponse.json(
        { error: 'Invalid plan configuration. Please contact support.' },
        { status: 400 }
      );
    }

    // Get current subscription
    const { data: currentSub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      throw subError;
    }

    // Here you would integrate with Stripe to create/update subscription
    // For now, we'll update the database directly
    const subscriptionData = {
      user_id: user.id,
      plan_tier: plan.plan_id,
      plan_name: plan.name,
      plan_price: plan.price,
      websites_limit: plan.websites_limit,
      notifications_limit: plan.notifications_limit,
      subscribers_limit: plan.subscribers_limit ?? undefined,
      recurring_limit: plan.recurring_limit ?? undefined,
      coupon_code: coupon_code || null,
      status: 'active' as const,
      subscription_starts_at: new Date().toISOString(),
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      payment_method: payment_method_id ? { last4: '4242', exp_month: 12, exp_year: 2025 } : null,
    };

    let result;
    if (currentSub) {
      // Update existing subscription
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update(subscriptionData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new subscription
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${plan.name} plan`,
      subscription: result,
    });
  } catch (error: any) {
    console.error('Error upgrading subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
});