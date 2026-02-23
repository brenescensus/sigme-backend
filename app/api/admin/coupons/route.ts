// // app/api/admin/coupons/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { withAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';
// import type { AdminAuthUser } from '@/lib/admin-middleware';

// // GET /api/admin/coupons - List all coupons
// export const GET = withAdmin(async (req: NextRequest, user: AdminAuthUser) => {
//   const supabase = getAdminClient();
//   const { searchParams } = new URL(req.url);
//   const activeOnly = searchParams.get('active_only') === 'true';

//   let query = supabase
//     .from('coupons')
//     .select(`
//       *,
//       redemptions:coupon_redemptions(count)
//     `)
//     .order('created_at', { ascending: false });

//   if (activeOnly) {
//     query = query.eq('is_active', true);
//   }

//   const { data: coupons, error } = await query;

//   if (error) throw error;

//   // Add redemption count to each coupon
//   const couponsWithStats = coupons?.map(coupon => ({
//     ...coupon,
//     redemptions_count: coupon.redemptions?.[0]?.count || 0,
//   }));

//   console.log(' Fetched', couponsWithStats?.length || 0, 'coupons by', user.email);

//   return NextResponse.json({
//     success: true,
//     coupons: couponsWithStats,
//   });
// });

// // POST /api/admin/coupons - Create new coupon
// export const POST = withAdmin(async (req: NextRequest, user: AdminAuthUser) => {
//   const supabase = getAdminClient();
//   const body = await req.json();
//   const {
//     code,
//     description,
//     type,
//     value,
//     max_redemptions,
//     valid_from,
//     valid_until,
//     min_purchase_amount,
//     applicable_plans,
//   } = body;

//   // Validation
//   if (!code || !type || value === undefined) {
//     return NextResponse.json(
//       { error: 'Code, type, and value are required' },
//       { status: 400 }
//     );
//   }

//   if (!['percentage', 'fixed'].includes(type)) {
//     return NextResponse.json(
//       { error: 'Type must be either "percentage" or "fixed"' },
//       { status: 400 }
//     );
//   }

//   if (type === 'percentage' && (value < 0 || value > 100)) {
//     return NextResponse.json(
//       { error: 'Percentage value must be between 0 and 100' },
//       { status: 400 }
//     );
//   }

//   if (type === 'fixed' && value < 0) {
//     return NextResponse.json(
//       { error: 'Fixed value must be positive' },
//       { status: 400 }
//     );
//   }

//   // Check if code already exists
//   const { data: existing } = await supabase
//     .from('coupons')
//     .select('id')
//     .eq('code', code.toUpperCase())
//     .single();

//   if (existing) {
//     return NextResponse.json(
//       { error: 'Coupon code already exists' },
//       { status: 400 }
//     );
//   }

//   // Create coupon
//   const { data: coupon, error } = await supabase
//     .from('coupons')
//     .insert({
//       code: code.toUpperCase(),
//       description: description || null,
//       type,
//       value: parseFloat(value),
//       max_redemptions: max_redemptions || null,
//       valid_from: valid_from || new Date().toISOString(),
//       valid_until: valid_until || null,
//       min_purchase_amount: min_purchase_amount ? parseFloat(min_purchase_amount) : null,
//       applicable_plans: applicable_plans || null,
//       is_active: true,
//       created_by: user.id,
//     })
//     .select()
//     .single();

//   if (error) throw error;

//   console.log(' Created coupon:', coupon.code, 'by', user.email);

//   // Log admin activity
//   await logAdminActivity(
//     user.id,
//     'CREATE_COUPON',
//     'coupon',
//     coupon.id,
//     {
//       code: coupon.code,
//       type: coupon.type,
//       value: coupon.value,
//     }
//   );

//   return NextResponse.json({
//     success: true,
//     coupon,
//   });
// });









// app/api/admin/coupons/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';
import type { AdminAuthUser } from '@/lib/admin-middleware';

// GET /api/admin/coupons - List all coupons
export const GET = withAdmin(async (req: NextRequest, user: AdminAuthUser) => {
  const supabase = getAdminClient();
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get('active_only') === 'true';

  let query = supabase
    .from('coupons')
    .select(`
      *,
      redemptions:coupon_redemptions(count)
    `)
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data: coupons, error } = await query;
  if (error) throw error;

  const couponsWithStats = coupons?.map(coupon => ({
    ...coupon,
    redemptions_count: coupon.redemptions?.[0]?.count || 0,
  }));

  console.log(' Fetched', couponsWithStats?.length || 0, 'coupons by', user.email);

  return NextResponse.json({ success: true, coupons: couponsWithStats });
});

// POST /api/admin/coupons - Create new coupon
export const POST = withAdmin(async (req: NextRequest, user: AdminAuthUser) => {
  const supabase = getAdminClient();
  const body = await req.json();
  const {
    code,
    description,
    type,
    value,
    usage_type = 'multiple_use',
    max_redemptions,
    valid_from,
    valid_until,
    min_purchase_amount,
    applicable_plans,
  } = body;

  // Validation
  if (!code || !type || value === undefined) {
    return NextResponse.json(
      { error: 'Code, type, and value are required' },
      { status: 400 }
    );
  }

  if (!['percentage', 'fixed'].includes(type)) {
    return NextResponse.json(
      { error: 'Type must be either "percentage" or "fixed"' },
      { status: 400 }
    );
  }

  if (!['single_use', 'multiple_use'].includes(usage_type)) {
    return NextResponse.json(
      { error: 'usage_type must be "single_use" or "multiple_use"' },
      { status: 400 }
    );
  }

  if (type === 'percentage' && (value < 0 || value > 100)) {
    return NextResponse.json(
      { error: 'Percentage value must be between 0 and 100' },
      { status: 400 }
    );
  }

  if (type === 'fixed' && value < 0) {
    return NextResponse.json(
      { error: 'Fixed value must be positive' },
      { status: 400 }
    );
  }

  // Check for duplicate code
  const { data: existing } = await supabase
    .from('coupons')
    .select('id')
    .eq('code', code.toUpperCase())
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'Coupon code already exists' },
      { status: 400 }
    );
  }

  const { data: coupon, error } = await supabase
    .from('coupons')
    .insert({
      code: code.toUpperCase(),
      description: description || null,
      type,
      value: parseFloat(value),
      usage_type,
      max_redemptions: max_redemptions || null,
      valid_from: valid_from || new Date().toISOString(),
      valid_until: valid_until || null,
      min_purchase_amount: min_purchase_amount ? parseFloat(min_purchase_amount) : null,
      applicable_plans: applicable_plans || null,
      is_active: true,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminActivity(user.id, 'CREATE_COUPON', 'coupon', coupon.id, {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    usage_type: coupon.usage_type,
  });

  console.log(' Created coupon:', coupon.code, 'by', user.email);

  return NextResponse.json({ success: true, coupon });
});