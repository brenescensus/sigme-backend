// // // // app/api/admin/coupons/[id]/route.ts
// // import { NextRequest, NextResponse } from 'next/server';
// // import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';

// // // PUT /api/admin/coupons/[id] - Update coupon
// // export const PUT = withSuperAdmin(
// //   async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
// //     const { id: couponId } = await context.params;
// //     const body = await req.json();

// //     const supabase = getAdminClient();

// //     try {
// //       const { data: coupon, error } = await supabase
// //         .from('coupons')
// //         .update({
// //           ...body,
// //           updated_at: new Date().toISOString(),
// //         })
// //         .eq('id', couponId)
// //         .select()
// //         .single();

// //       if (error) throw error;

// //       await logAdminActivity(user.id, 'UPDATE_COUPON', 'coupon', couponId);

// //       return NextResponse.json({
// //         success: true,
// //         coupon,
// //       });
// //     } catch (error: any) {
// //       console.error(' Error updating coupon:', error);
// //       return NextResponse.json(
// //         { error: error.message || 'Failed to update coupon' },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );

// // // DELETE /api/admin/coupons/[id] - Delete coupon
// // export const DELETE = withSuperAdmin(
// //   async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
// //     const { id: couponId } = await context.params;
// //     const supabase = getAdminClient();

// //     try {
// //       const { error } = await supabase
// //         .from('coupons')
// //         .delete()
// //         .eq('id', couponId);

// //       if (error) throw error;

// //       await logAdminActivity(user.id, 'DELETE_COUPON', 'coupon', couponId);

// //       return NextResponse.json({
// //         success: true,
// //         message: 'Coupon deleted successfully',
// //       });
// //     } catch (error: any) {
// //       console.error(' Error deleting coupon:', error);
// //       return NextResponse.json(
// //         { error: error.message || 'Failed to delete coupon' },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );


// // app/api/admin/coupons/[id]/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// // Helper to verify admin access
// async function verifyAdmin(req: NextRequest) {
//   const authHeader = req.headers.get('authorization');
//   if (!authHeader?.startsWith('Bearer ')) {
//     throw new Error('Unauthorized');
//   }

//   const token = authHeader.substring(7);
  
//   const { data: { user }, error } = await supabase.auth.getUser(token);
  
//   if (error || !user) {
//     throw new Error('Unauthorized');
//   }

//   // Check if user is admin or super_admin
//   const { data: profile } = await supabase
//     .from('user_profiles')
//     .select('role')
//     .eq('id', user.id)
//     .single();

//   if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
//     throw new Error('Forbidden - Admin access required');
//   }

//   return user;
// }

// // GET /api/admin/coupons - List all coupons
// export async function GET(req: NextRequest) {
//   try {
//     await verifyAdmin(req);

//     const { searchParams } = new URL(req.url);
//     const activeOnly = searchParams.get('active_only') === 'true';

//     let query = supabase
//       .from('coupons')
//       .select('*')
//       .order('created_at', { ascending: false });

//     if (activeOnly) {
//       query = query.eq('is_active', true);
//     }

//     const { data: coupons, error } = await query;

//     if (error) throw error;

//     return NextResponse.json({
//       success: true,
//       coupons,
//     });
//   } catch (error: any) {
//     console.error(' Error fetching coupons:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to fetch coupons' },
//       { status: error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden - Admin access required' ? 403 : 500 }
//     );
//   }
// }

// // POST /api/admin/coupons - Create new coupon
// export async function POST(req: NextRequest) {
//   try {
//     const user = await verifyAdmin(req);

//     const body = await req.json();
//     const {
//       code,
//       description,
//       type,
//       value,
//       max_redemptions,
//       valid_from,
//       valid_until,
//       min_purchase_amount,
//       applicable_plans,
//     } = body;

//     // Validation
//     if (!code || !type || value === undefined) {
//       return NextResponse.json(
//         { error: 'Code, type, and value are required' },
//         { status: 400 }
//       );
//     }

//     // Validate code format (alphanumeric only)
//     if (!/^[A-Z0-9]+$/.test(code)) {
//       return NextResponse.json(
//         { error: 'Coupon code must contain only letters and numbers' },
//         { status: 400 }
//       );
//     }

//     // Validate type
//     if (!['percentage', 'fixed'].includes(type)) {
//       return NextResponse.json(
//         { error: 'Type must be either "percentage" or "fixed"' },
//         { status: 400 }
//       );
//     }

//     // Validate value
//     if (type === 'percentage' && (value < 0 || value > 100)) {
//       return NextResponse.json(
//         { error: 'Percentage value must be between 0 and 100' },
//         { status: 400 }
//       );
//     }

//     if (type === 'fixed' && value < 0) {
//       return NextResponse.json(
//         { error: 'Fixed value must be positive' },
//         { status: 400 }
//       );
//     }

//     // Check if code already exists
//     const { data: existing } = await supabase
//       .from('coupons')
//       .select('id')
//       .eq('code', code.toUpperCase())
//       .single();

//     if (existing) {
//       return NextResponse.json(
//         { error: 'A coupon with this code already exists' },
//         { status: 400 }
//       );
//     }

//     // Validate dates
//     if (valid_until && valid_from) {
//       const fromDate = new Date(valid_from);
//       const untilDate = new Date(valid_until);
//       if (untilDate <= fromDate) {
//         return NextResponse.json(
//           { error: 'Valid until date must be after valid from date' },
//           { status: 400 }
//         );
//       }
//     }

//     // Validate plans if provided
//     if (applicable_plans && applicable_plans.length > 0) {
//       const { data: plans } = await supabase
//         .from('pricing_plans')
//         .select('plan_id')
//         .in('plan_id', applicable_plans);

//       if (!plans || plans.length !== applicable_plans.length) {
//         return NextResponse.json(
//           { error: 'One or more plan IDs are invalid' },
//           { status: 400 }
//         );
//       }
//     }

//     // Create coupon
//     const { data: coupon, error } = await supabase
//       .from('coupons')
//       .insert({
//         code: code.toUpperCase(),
//         description: description || null,
//         type,
//         value: parseFloat(value),
//         max_redemptions: max_redemptions || null,
//         times_redeemed: 0,
//         valid_from: valid_from || new Date().toISOString(),
//         valid_until: valid_until || null,
//         min_purchase_amount: min_purchase_amount ? parseFloat(min_purchase_amount) : 0,
//         applicable_plans: applicable_plans || null,
//         is_active: true,
//         created_by: user.id,
//       })
//       .select()
//       .single();

//     if (error) throw error;

//     console.log(' Created coupon:', coupon.code);

//     // Log admin activity
//     await supabase.from('admin_activity_log').insert({
//       admin_id: user.id,
//       action: 'CREATE_COUPON',
//       target_type: 'coupon',
//       target_id: coupon.id,
//       details: {
//         code: coupon.code,
//         type: coupon.type,
//         value: coupon.value,
//       },
//     });

//     return NextResponse.json({
//       success: true,
//       coupon,
//     });
//   } catch (error: any) {
//     console.error(' Error creating coupon:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to create coupon' },
//       { status: error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden - Admin access required' ? 403 : 500 }
//     );
//   }
// }



// app/api/admin/coupons/[id]/route.ts
// PUT, DELETE, PATCH methods (with [id] parameter)

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';

// PUT /api/admin/coupons/[id] - Update coupon
export const PUT = withSuperAdmin(
  async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
    const { id: couponId } = await context.params;  //  FIXED: await params
    const body = await req.json();
    const supabase = getAdminClient();

    try {
      const {
        code,
        description,
        type,
        value,
        max_redemptions,
        valid_from,
        valid_until,
        min_purchase_amount,
        applicable_plans,
        is_active,
      } = body;

      // Build update object (only include fields that were provided)
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (code !== undefined) updateData.code = code.toUpperCase();
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (value !== undefined) updateData.value = parseFloat(value);
      if (max_redemptions !== undefined) updateData.max_redemptions = max_redemptions;
      if (valid_from !== undefined) updateData.valid_from = valid_from;
      if (valid_until !== undefined) updateData.valid_until = valid_until;
      if (min_purchase_amount !== undefined) updateData.min_purchase_amount = parseFloat(min_purchase_amount);
      if (applicable_plans !== undefined) updateData.applicable_plans = applicable_plans;
      if (is_active !== undefined) updateData.is_active = is_active;

      // Validate if updating code - check for duplicates
      if (code) {
        const { data: existing } = await supabase
          .from('coupons')
          .select('id')
          .eq('code', code.toUpperCase())
          .neq('id', couponId)
          .single();

        if (existing) {
          return NextResponse.json(
            { error: 'A coupon with this code already exists' },
            { status: 400 }
          );
        }
      }

      const { data: coupon, error } = await supabase
        .from('coupons')
        .update(updateData)
        .eq('id', couponId)
        .select()
        .single();

      if (error) throw error;

      await logAdminActivity(user.id, 'UPDATE_COUPON', 'coupon', couponId, {
        code: coupon.code,
        changes: Object.keys(updateData),
      });

      console.log(' Updated coupon:', coupon.code);

      return NextResponse.json({
        success: true,
        coupon,
      });
    } catch (error: any) {
      console.error(' Error updating coupon:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update coupon' },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/admin/coupons/[id] - Delete coupon
export const DELETE = withSuperAdmin(
  async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
    const { id: couponId } = await context.params;  //  FIXED: await params
    const supabase = getAdminClient();

    try {
      // Get coupon details before deleting (for logging)
      const { data: coupon } = await supabase
        .from('coupons')
        .select('code')
        .eq('id', couponId)
        .single();

      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      await logAdminActivity(user.id, 'DELETE_COUPON', 'coupon', couponId, {
        code: coupon?.code,
      });

      console.log(' Deleted coupon:', coupon?.code);

      return NextResponse.json({
        success: true,
        message: 'Coupon deleted successfully',
      });
    } catch (error: any) {
      console.error(' Error deleting coupon:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete coupon' },
        { status: 500 }
      );
    }
  }
);

// PATCH /api/admin/coupons/[id]/toggle - Toggle coupon status
export const PATCH = withSuperAdmin(
  async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
    const { id: couponId } = await context.params;  //  FIXED: await params
    const supabase = getAdminClient();

    try {
      // Get current status
      const { data: currentCoupon } = await supabase
        .from('coupons')
        .select('is_active, code')
        .eq('id', couponId)
        .single();

      if (!currentCoupon) {
        return NextResponse.json(
          { error: 'Coupon not found' },
          { status: 404 }
        );
      }

      // Toggle status
      const { data: coupon, error } = await supabase
        .from('coupons')
        .update({ 
          is_active: !currentCoupon.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', couponId)
        .select()
        .single();

      if (error) throw error;

      await logAdminActivity(
        user.id,
        coupon.is_active ? 'ACTIVATE_COUPON' : 'DEACTIVATE_COUPON',
        'coupon',
        couponId,
        { code: coupon.code }
      );

      console.log(` ${coupon.is_active ? 'Activated' : 'Deactivated'} coupon:`, coupon.code);

      return NextResponse.json({
        success: true,
        coupon,
      });
    } catch (error: any) {
      console.error(' Error toggling coupon:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to toggle coupon status' },
        { status: 500 }
      );
    }
  }
);