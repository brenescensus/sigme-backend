// // app/api/settings/subscription/route.ts
// // FIXED: Uses user_subscriptions table from database

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import { withAuth, type AuthUser } from '@/lib/auth-middleware';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       console.log(` [Settings] Fetching subscription for user: ${user.email}`);

//       //  Get subscription from user_subscriptions table
//       const { data: subscription, error: subError } = await supabase
//         .from('user_subscriptions')
//         .select('*')
//         .eq('user_id', user.id)
//         .single();

//       if (subError && subError.code !== 'PGRST116') {
//         // PGRST116 = no rows returned (user doesn't have subscription yet)
//         console.error('[Settings] Subscription fetch error:', subError);
//         throw subError;
//       }

//       // If no subscription exists, create a default free one
//       if (!subscription) {
//         console.log(' [Settings] No subscription found, creating free tier');
        
//         const { data: newSub, error: createError } = await supabase
//           .from('user_subscriptions')
//           .insert({
//             user_id: user.id,
//             plan_tier: 'free',
//             plan_name: 'Free',
//             plan_price: 0,
//             notifications_limit: 10000,
//             notifications_used: 0,
//             websites_limit: 1,
//             websites_used: 0,
//             recurring_limit: 0,
//             recurring_used: 0,
//             subscribers_used: 0,
//             status: 'active',
//           })
//           .select()
//           .single();

//         if (createError) {
//           console.error('[Settings] Error creating subscription:', createError);
//           throw createError;
//         }

//         console.log(' [Settings] Created free subscription');
        
//         return NextResponse.json({
//           success: true,
//           subscription: newSub,
//         });
//       }

//       console.log(' [Settings] Subscription found:', {
//         plan: subscription.plan_tier,
//         status: subscription.status,
//         websites: `${subscription.websites_used}/${subscription.websites_limit}`,
//         notifications: `${subscription.notifications_used}/${subscription.notifications_limit}`,
//         recurring: `${subscription.recurring_used}/${subscription.recurring_limit}`,
//       });

//       return NextResponse.json({
//         success: true,
//         subscription,
//       });
//     } catch (error: any) {
//       console.error(' [Settings] Subscription fetch error:', error);
//       return NextResponse.json(
//         { success: false, error: error.message || 'Failed to fetch subscription' },
//         { status: 500 }
//       );
//     }
//   }
// );

// // PATCH /api/settings/subscription - Update subscription
// export const PATCH = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       const body = await req.json();
//       const { plan_id } = body;

//       console.log('[Settings] Updating subscription to:', plan_id);

//       // Update subscription in database
//       const { error } = await supabase
//         .from('user_subscriptions')
//         .update({
//           plan_tier: plan_id,
//           updated_at: new Date().toISOString(),
//         })
//         .eq('user_id', user.id);

//       if (error) throw error;

//       return NextResponse.json({
//         success: true,
//         message: 'Subscription updated successfully',
//       });
//     } catch (error: any) {
//       console.error('[Settings] Update subscription error:', error);
//       return NextResponse.json(
//         { success: false, error: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );







// app/api/settings/subscription/route.ts
// FIXED: Returns custom plan details when user has a custom plan

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthUser } from '@/lib/auth-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      console.log(` [Settings] Fetching subscription for user: ${user.email}`);

      //  FIXED: Join with custom_plans table to get custom plan details
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          custom_plan:custom_plans!user_subscriptions_custom_plan_id_fkey(
            id,
            plan_code,
            plan_name,
            description,
            monthly_price,
            annual_price,
            websites_limit,
            notifications_limit,
            subscribers_limit,
            journeys_limit,
            custom_domains_limit,
            team_members_limit,
            status,
            organization_name
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        console.error('[Settings] Subscription fetch error:', subError);
        throw subError;
      }

      // If no subscription exists, create a default free one
      if (!subscription) {
        console.log(' [Settings] No subscription found, creating free tier');
        
        const { data: newSub, error: createError } = await supabase
          .from('user_subscriptions')
          .insert({
            // user_id: user.id,
            // plan_tier: 'free',
            // plan_name: 'Free',
            // plan_price: 0,
            // notifications_limit: 10000,
            // notifications_used: 0,
            // websites_limit: 1,
            // websites_used: 0,
            // recurring_limit: 0,
            // recurring_used: 0,
            // subscribers_used: 0,
            // status: 'active',
        user_id: user.id,
        plan_tier: 'free',
        plan_name: 'Free',
        plan_price: 0,
        notifications_limit: 10000,  
        notifications_used: 0,
        websites_limit: 1,
        websites_used: 0,
        subscribers_limit: 100,  
        subscribers_used: 0,
        status: 'active',
        subscription_starts_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30-day trial
          })
          .select()
          .single();

        if (createError) {
          console.error('[Settings] Error creating subscription:', createError);
          throw createError;
        }

        console.log(' [Settings] Created free subscription');
        
        return NextResponse.json({
          success: true,
          subscription: newSub,
        });
      }

      //  CRITICAL: Detect if user has a custom plan
      const hasCustomPlan = subscription.custom_plan_id !== null;

      console.log(' [Settings] Subscription found:', {
        plan_tier: subscription.plan_tier,
        has_custom_plan: hasCustomPlan,
        custom_plan_name: hasCustomPlan ? subscription.custom_plan?.plan_name : null,
        status: subscription.status,
        websites: `${subscription.websites_used}/${subscription.websites_limit}`,
        notifications: `${subscription.notifications_used}/${subscription.notifications_limit}`,
        recurring: `${subscription.recurring_used}/${subscription.recurring_limit}`,
      });

      //  FIXED: Return enriched subscription data
      const enrichedSubscription = {
        ...subscription,
        //  Add custom plan indicator
        is_custom_plan: hasCustomPlan,
        //  If custom plan, override display name and price
        display_plan_name: hasCustomPlan 
          ? subscription.custom_plan?.plan_name 
          : subscription.plan_name,
        display_plan_price: hasCustomPlan 
          ? subscription.custom_plan?.monthly_price 
          : subscription.plan_price,
        //  Add organization name if custom plan
        organization_name: hasCustomPlan 
          ? subscription.custom_plan?.organization_name 
          : null,
      };

      return NextResponse.json({
        success: true,
        subscription: enrichedSubscription,
      });
    } catch (error: any) {
      console.error(' [Settings] Subscription fetch error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch subscription' },
        { status: 500 }
      );
    }
  }
);

// PATCH /api/settings/subscription - Update subscription
export const PATCH = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const body = await req.json();
      const { plan_id } = body;

      console.log('[Settings] Updating subscription to:', plan_id);

      // Update subscription in database
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          plan_tier: plan_id,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Subscription updated successfully',
      });
    } catch (error: any) {
      console.error('[Settings] Update subscription error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }
);