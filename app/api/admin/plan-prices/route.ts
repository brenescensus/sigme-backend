// app/api/admin/plan-prices/route.ts
// Handles GET (list by plan_id) and POST (upsert) for plan_prices table

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/plan-prices?plan_id=growth
export async function GET(req: NextRequest) {
  const planId = req.nextUrl.searchParams.get('plan_id');

  try {
    let query = supabase
      .from('plan_prices')
      .select('*')
      .order('currency', { ascending: true });

    if (planId) query = query.eq('plan_id', planId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, prices: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/plan-prices  — upsert (create or update by plan_id + currency)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, plan_id, currency, currency_symbol, monthly_price, yearly_price, is_active = true } = body;

    if (!plan_id || !currency) {
      return NextResponse.json(
        { success: false, error: 'plan_id and currency are required' },
        { status: 400 }
      );
    }

    const payload: any = {
      plan_id,
      currency: currency.toUpperCase(),
      currency_symbol,
      monthly_price: parseFloat(monthly_price) || 0,
      yearly_price: parseFloat(yearly_price) || 0,
      is_active,
    };

    // If ID provided → update, else upsert on (plan_id, currency)
    let result;
    if (id) {
      const { data, error } = await supabase
        .from('plan_prices')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('plan_prices')
        .upsert(payload, { onConflict: 'plan_id,currency' })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, price: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/plan-prices?id=uuid
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
  }

  try {
    const { error } = await supabase.from('plan_prices').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}