// // app/api/settings/subscription/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import { withAuth, AuthUser } from '@/lib/auth-middleware';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       console.log(' [Settings] Fetching subscription for user:', user.email);

//       // Get user subscription
//       const { data: subscription, error } = await supabase
//         .from('user_subscriptions')
//         .select('*')
//         .eq('user_id', user.id)
//         .single();

//       if (error) {
//         // If no subscription exists, create a default free one
//         if (error.code === 'PGRST116') {
//           console.log('📝 [Settings] No subscription found, creating free plan');
          
//           const { data: newSub, error: createError } = await supabase
//             .from('user_subscriptions')
//             .insert({
//               user_id: user.id,
//               plan_tier: 'free',
//               plan_name: 'Free',
//               plan_price: 0,
//               notifications_limit: 10000,
//               notifications_used: 0,
//               websites_limit: 1,
//               websites_used: 0,
//               recurring_limit: 0,
//               recurring_used: 0,
//               status: 'active',
//             })
//             .select()
//             .single();

//           if (createError) {
//             console.error(' [Settings] Failed to create subscription:', createError);
//             throw createError;
//           }

//           return NextResponse.json({
//             success: true,
//             subscription: newSub,
//           });
//         }

//         console.error(' [Settings] Subscription fetch error:', error);
//         throw error;
//       }

//       // Get billing history if Stripe customer exists
//       let billingHistory = [];
//       if (subscription.stripe_customer_id) {
//         const { data: history, error: historyError } = await supabase
//           .from('billing_history')
//           .select('*')
//           .eq('user_id', user.id)
//           .order('date', { ascending: false })
//           .limit(10);

//         if (!historyError && history) {
//           billingHistory = history;
//         }
//       }

//       console.log(' [Settings] Subscription fetched:', {
//         plan: subscription.plan_tier,
//         status: subscription.status,
//         hasPaymentMethod: !!subscription.payment_method,
//         hasBillingHistory: billingHistory.length > 0,
//       });

//       return NextResponse.json({
//         success: true,
//         subscription: {
//           ...subscription,
//           billing_history: billingHistory,
//         },
//       });

//     } catch (error: any) {
//       console.error(' [Settings] Subscription error:', error);
//       return NextResponse.json(
//         { success: false, error: error.message || 'Failed to fetch subscription' },
//         { status: 500 }
//       );
//     }
//   }
// );





// app/api/settings/subscription/route.ts
// FIXED: Uses user_subscriptions table from database

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

      //  Get subscription from user_subscriptions table
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (user doesn't have subscription yet)
        console.error('[Settings] Subscription fetch error:', subError);
        throw subError;
      }

      // If no subscription exists, create a default free one
      if (!subscription) {
        console.log('📋 [Settings] No subscription found, creating free tier');
        
        const { data: newSub, error: createError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            plan_tier: 'free',
            plan_name: 'Free',
            plan_price: 0,
            notifications_limit: 10000,
            notifications_used: 0,
            websites_limit: 1,
            websites_used: 0,
            recurring_limit: 0,
            recurring_used: 0,
            subscribers_used: 0,
            status: 'active',
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

      console.log(' [Settings] Subscription found:', {
        plan: subscription.plan_tier,
        status: subscription.status,
        websites: `${subscription.websites_used}/${subscription.websites_limit}`,
        notifications: `${subscription.notifications_used}/${subscription.notifications_limit}`,
        recurring: `${subscription.recurring_used}/${subscription.recurring_limit}`,
      });

      return NextResponse.json({
        success: true,
        subscription,
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