// app/api/admin/pricing-plans/route.ts
import { withSuperAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';
import { NextRequest, NextResponse } from 'next/server';
export const GET = withSuperAdmin(async (req, user) => {
  const supabase = getAdminClient();

  try {
    const { data: plans, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    // Log activity
    await logAdminActivity(user.id, 'LIST_PLANS', 'plan');

    return NextResponse.json({ plans });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch plans' },
      { status: 500 }
    );
  }
});

export const POST = withSuperAdmin(async (req, user) => {
  const body = await req.json();
  const {
    plan_id,
    name,
    description,
    price,
    yearly_price,
    recurring_limit,
    websites_limit,
    subscribers_limit,
    notifications_limit,
    features,
    is_popular,
    display_order,
  } = body;

  if (!plan_id || !name) {
    return NextResponse.json(
      { error: 'plan_id and name are required' },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();

  try {
    const { data: plan, error } = await supabase
      .from('pricing_plans')
      .insert({
        plan_id,
        name,
        description,
        price,
        yearly_price,
        recurring_limit,
        websites_limit,
        subscribers_limit,
        notifications_limit,
        features,
        is_popular: is_popular || false,
        display_order: display_order || 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await logAdminActivity(user.id, 'CREATE_PLAN', 'plan', plan.id, { plan_id, name });

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error('Error creating plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create plan' },
      { status: 500 }
    );
  }
});