// // app/api/admin/custom-plans/[id]/deactivate/route.ts
// // Deactivate/suspend a custom plan

// import { withSuperAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';
// import { NextRequest, NextResponse } from 'next/server';

// export async function POST(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   return withSuperAdmin(async (req, user) => {
//     const supabase = getAdminClient();

//     try {
//       const planId = params.id;
//       const body = await req.json();
//       const reason = body.reason || 'Manually deactivated';

//       // Get the custom plan
//       const { data: customPlan, error: planError } = await supabase
//         .from('custom_plans')
//         .select('*')
//         .eq('id', planId)
//         .single();

//       if (planError || !customPlan) {
//         return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
//       }

//       if (customPlan.status !== 'active') {
//         return NextResponse.json(
//           { error: 'Plan is not active' },
//           { status: 400 }
//         );
//       }

//       // Deactivate the custom plan
//       const { error: deactivateError } = await supabase
//         .from('custom_plans')
//         .update({
//           status: 'suspended',
//           updated_at: new Date().toISOString(),
//         })
//         .eq('id', planId);

//       if (deactivateError) throw deactivateError;

//       // Update user's subscription to suspended or back to free tier
//       const { error: subError } = await supabase
//         .from('user_subscriptions')
//         .update({
//           status: 'suspended',
//           updated_at: new Date().toISOString(),
//         })
//         .eq('custom_plan_id', planId);

//       if (subError) {
//         console.error('[Deactivate] Failed to update subscription:', subError);
//       }

//       // Log deactivation
//       await supabase.from('custom_plan_audit_log').insert({
//         custom_plan_id: planId,
//         action: 'suspended',
//         changes: {
//           from_status: customPlan.status,
//           to_status: 'suspended',
//           reason,
//         },
//         performed_by: user.id,
//         performed_by_email: user.email,
//       });

//       await logAdminActivity(
//         user.id,
//         'DEACTIVATE_CUSTOM_PLAN',
//         'custom_plan',
//         planId,
//         { plan_code: customPlan.plan_code, reason }
//       );

//       return NextResponse.json({
//         success: true,
//         message: 'Custom plan deactivated successfully',
//       });

//     } catch (error: any) {
//       console.error('[Custom Plans] Deactivation error:', error);
//       return NextResponse.json(
//         { error: error.message },
//         { status: 500 }
//       );
//     }
//   })(request);
// }















// app/api/admin/custom-plans/[id]/deactivate/route.ts
// FIXED: Deactivate/suspend a custom plan with proper async params handling

import { withSuperAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';
import { NextRequest, NextResponse } from 'next/server';

//  FIX: Properly structure the route handler with async params
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  //  FIX: Await params in Next.js 15+
  const params = await context.params;
  
  return withSuperAdmin(async (req, user) => {
const supabase = await getAdminClient();
    try {
      const planId = params.id;
      const body = await request.json();
      const reason = body.reason || 'Manually deactivated';

      console.log('[Custom Plans] Deactivating plan:', planId);

      // Get the custom plan
      const { data: customPlan, error: planError } = await supabase
        .from('custom_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !customPlan) {
        console.error('[Custom Plans] Plan not found:', planError);
        return NextResponse.json(
          { success: false, error: 'Plan not found' },
          { status: 404 }
        );
      }

      if (customPlan.status !== 'active') {
        console.warn('[Custom Plans] Plan is not active:', customPlan.status);
        return NextResponse.json(
          { 
            success: false, 
            error: `Plan is not active (status: ${customPlan.status})` 
          },
          { status: 400 }
        );
      }

      console.log('[Custom Plans] Deactivating plan:', customPlan.plan_code);

      // Deactivate the custom plan
      const { error: deactivateError } = await supabase
        .from('custom_plans')
        .update({
          status: 'suspended',
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId);

      if (deactivateError) {
        console.error('[Custom Plans] Deactivate error:', deactivateError);
        throw deactivateError;
      }

      console.log('[Custom Plans]  Plan status updated to suspended');

      //  FIX: Revert user's subscription to free plan instead of just suspending
      const { data: subscription, error: subFetchError } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('custom_plan_id', planId)
        .eq('user_id', customPlan.user_id)
        .maybeSingle();

      if (subFetchError && subFetchError.code !== 'PGRST116') {
        console.error('[Custom Plans] Error fetching subscription:', subFetchError);
      }

      if (subscription) {
        console.log('[Custom Plans] Reverting subscription to free plan');
        
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .update({
            plan_tier: 'free',
            plan_name: 'Free Plan',
            custom_plan_id: null,
            
            // Revert to free plan limits
            websites_limit: 1,
            subscribers_limit: 1000,
            notifications_limit: 10000,
            recurring_limit: 0,
            
            status: 'active', // Keep subscription active but on free plan
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        if (subError) {
          console.error('[Custom Plans] Failed to update subscription:', subError);
          // Don't throw - plan is already deactivated
        } else {
          console.log('[Custom Plans]  Subscription reverted to free plan');
        }
      } else {
        console.warn('[Custom Plans] No subscription found for user');
      }

      // Log deactivation
      await supabase.from('custom_plan_audit_log').insert({
        custom_plan_id: planId,
        action: 'suspended',
        changes: {
          from_status: customPlan.status,
          to_status: 'suspended',
          reason,
        },
        performed_by: user.id,
        performed_by_email: user.email,
      });

      await logAdminActivity(
        user.id,
        'DEACTIVATE_CUSTOM_PLAN',
        'custom_plan',
        planId,
        { 
          plan_code: customPlan.plan_code, 
          plan_name: customPlan.plan_name,
          user_id: customPlan.user_id,
          reason 
        }
      );

      console.log('[Custom Plans]  Deactivation complete');

      return NextResponse.json({
        success: true,
        message: `Custom plan "${customPlan.plan_name}" deactivated successfully. User reverted to free plan.`,
        plan: {
          id: customPlan.id,
          plan_code: customPlan.plan_code,
          status: 'suspended',
        }
      });

    } catch (error: any) {
      console.error('[Custom Plans] Deactivation error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message || 'Failed to deactivate custom plan',
          details: error.details || error.hint || null,
        },
        { status: 500 }
      );
    }
  })(request);
}