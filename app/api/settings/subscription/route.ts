// // // ============================================
// // // app/api/settings/subscription/route.ts
// // // ============================================
// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
// // import { parsePaymentMethod } from '@/lib/billing/payment-method'

// // const subscription = data[0]

// // const paymentMethod = parsePaymentMethod(
// //   subscription.payment_method
// // )

// // return NextResponse.json({
// //   ...subscription,
// //   payment_method: paymentMethod,
// // })

// // /* ============================
// //    GET SUBSCRIPTION + USAGE
// // ============================ */
// // export const GET = withAuth(
// //   async (_req: NextRequest, user: AuthUser) => {
// //     try {
// //       const supabase = await getAuthenticatedClient(_req);

// //       /* -------------------------
// //          Subscription
// //       -------------------------- */
// //       const { data: subscription, error: subError } = await supabase
// //         .from('user_subscriptions')
// //         .select('*')
// //         .eq('user_id', user.id)
// //         .single();

// //       if (subError) {
// //         console.error('[Subscription] Fetch error:', subError);
// //         return NextResponse.json(
// //           { error: 'Failed to fetch subscription' },
// //           { status: 400 }
// //         );
// //       }

// //       /* -------------------------
// //          Billing history
// //       -------------------------- */
// //       const { data: billingHistory } = await supabase
// //         .from('billing_history')
// //         .select('*')
// //         .eq('user_id', user.id)
// //         .order('date', { ascending: false })
// //         .limit(10);

// //       /* -------------------------
// //          Usage calculations
// //       -------------------------- */

// //       // 1. Websites owned by user
// //       const { data: websites, error: websitesError } = await supabase
// //         .from('websites')
// //         .select('id')
// //         .eq('user_id', user.id);

// //       if (websitesError) throw websitesError;

// //       const websiteIds = websites.map(w => w.id);

// //       // 2. Active subscribers
// //       let subscribersUsed = 0;

// //       if (websiteIds.length > 0) {
// //         const { count, error } = await supabase
// //           .from('subscribers')
// //           .select('id', { count: 'exact', head: true })
// //           .eq('status', 'active')
// //           .in('website_id', websiteIds);

// //         if (error) throw error;
// //         subscribersUsed = count ?? 0;
// //       }

// //       // 3. Active recurring campaigns
// //       const { count: recurringUsed, error: recurringError } = await supabase
// //         .from('campaigns')
// //         .select('id', { count: 'exact', head: true })
// //         .eq('user_id', user.id)
// //         .eq('is_recurring', true)
// //         .eq('status', 'active');

// //       if (recurringError) throw recurringError;

// //       /* -------------------------
// //          Final response
// //       -------------------------- */
// //       return NextResponse.json({
// //         success: true,
// //         ...subscription,
// //         subscribers_used: subscribersUsed,
// //         recurring_used: recurringUsed ?? 0,
// //         billing_history: billingHistory ?? [],
// //         payment_method: subscription.payment_method
// //           ? {
// //               last4: subscription.payment_method.last4 || '****',
// //               exp_month: subscription.payment_method.exp_month || '12',
// //               exp_year: subscription.payment_method.exp_year || '2025',
// //               brand: subscription.payment_method.brand || 'visa',
// //             }
// //           : null,
// //       });
// //     } catch (error: any) {
// //       console.error('[Subscription] Error:', error);
// //       return NextResponse.json(
// //         { error: 'Internal server error', details: error.message },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );

// // /* ============================
// //    UPDATE SUBSCRIPTION
// // ============================ */
// // export const PATCH = withAuth(
// //   async (req: NextRequest, user: AuthUser) => {
// //     try {
// //       const supabase = await getAuthenticatedClient(req);
// //       const { plan_id, coupon_code } = await req.json();

// //       const PLANS: Record<string, any> = {
// //         free: {
// //           plan_name: 'Free',
// //           plan_tier: 'free',
// //           plan_price: 0,
// //           notifications_limit: 10000,
// //           websites_limit: 1,
// //           recurring_limit: 0,
// //         },
// //         starter: {
// //           plan_name: 'Starter',
// //           plan_tier: 'starter',
// //           plan_price: 10,
// //           notifications_limit: 50000,
// //           websites_limit: 3,
// //           recurring_limit: 10,
// //         },
// //         growth: {
// //           plan_name: 'Growth',
// //           plan_tier: 'growth',
// //           plan_price: 20,
// //           notifications_limit: -1,
// //           websites_limit: 10,
// //           recurring_limit: 30,
// //         },
// //       };

// //       const plan = PLANS[plan_id];
// //       if (!plan) {
// //         return NextResponse.json(
// //           { error: 'Invalid plan ID' },
// //           { status: 400 }
// //         );
// //       }

// //       const { data, error } = await supabase
// //         .from('user_subscriptions')
// //         .update({
// //           ...plan,
// //           coupon_code: coupon_code || null,
// //           next_billing_date:
// //             plan_id === 'free'
// //               ? null
// //               : new Date(Date.now() + 30 * 86400000).toISOString(),
// //           subscription_starts_at: new Date().toISOString(),
// //           status: 'active',
// //           updated_at: new Date().toISOString(),
// //         })
// //         .eq('user_id', user.id)
// //         .select()
// //         .single();

// //       if (error) throw error;

// //       if (plan_id !== 'free') {
// //         await supabase.from('billing_history').insert({
// //           user_id: user.id,
// //           subscription_id: data.id,
// //           date: new Date().toISOString(),
// //           description: `Upgraded to ${plan.plan_name} Plan`,
// //           amount: plan.plan_price,
// //           currency: 'USD',
// //           status: 'paid',
// //         });
// //       }

// //       return NextResponse.json({ success: true, subscription: data });
// //     } catch (error: any) {
// //       console.error('[Subscription] Update error:', error);
// //       return NextResponse.json(
// //         { error: 'Failed to update subscription', details: error.message },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );



// // ============================================
// // app/api/settings/subscription/route.ts
// // ============================================
// import { NextRequest, NextResponse } from 'next/server'
// import {
//   withAuth,
//   getAuthenticatedClient,
//   AuthUser,
// } from '@/lib/auth-middleware'
// import { parsePaymentMethod } from '@/lib/billing/payment-method'

// /* ============================
//    GET: SUBSCRIPTION + USAGE
// ============================ */
// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       const supabase = await getAuthenticatedClient(req)

//       /* -------------------------
//          Fetch subscription
//       -------------------------- */
//       const { data: subscription, error: subError } = await supabase
//         .from('user_subscriptions')
//         .select('*')
//         .eq('user_id', user.id)
//         .single()

//       if (subError || !subscription) {
//         console.error('[Subscription] Fetch error:', subError)
//         return NextResponse.json(
//           { error: 'Failed to fetch subscription' },
//           { status: 400 }
//         )
//       }

//       /* -------------------------
//          Billing history
//       -------------------------- */
//       const { data: billingHistory } = await supabase
//         .from('billing_history')
//         .select('*')
//         .eq('user_id', user.id)
//         .order('date', { ascending: false })
//         .limit(10)

//       /* -------------------------
//          Usage calculations
//       -------------------------- */

//       // 1. Websites
//       const { data: websites, error: websitesError } = await supabase
//         .from('websites')
//         .select('id')
//         .eq('user_id', user.id)

//       if (websitesError) throw websitesError

//       const websiteIds = websites?.map(w => w.id) ?? []

//       // 2. Active subscribers
//       let subscribersUsed = 0

//       if (websiteIds.length > 0) {
//         const { count, error } = await supabase
//           .from('subscribers')
//           .select('id', { count: 'exact', head: true })
//           .eq('status', 'active')
//           .in('website_id', websiteIds)

//         if (error) throw error
//         subscribersUsed = count ?? 0
//       }

//       // 3. Active recurring campaigns
//       const { count: recurringUsed, error: recurringError } = await supabase
//         .from('campaigns')
//         .select('id', { count: 'exact', head: true })
//         .eq('user_id', user.id)
//         .eq('is_recurring', true)
//         .eq('status', 'active')

//       if (recurringError) throw recurringError

//       /* -------------------------
//          Final response
//       -------------------------- */
//       return NextResponse.json({
//         success: true,
//         ...subscription,
//         subscribers_used: subscribersUsed,
//         recurring_used: recurringUsed ?? 0,
//         billing_history: billingHistory ?? [],
//         payment_method: parsePaymentMethod(
//           subscription.payment_method
//         ),
//       })
//     } catch (error: any) {
//       console.error('[Subscription] Error:', error)
//       return NextResponse.json(
//         { error: 'Internal server error', details: error.message },
//         { status: 500 }
//       )
//     }
//   }
// )

// /* ============================
//    PATCH: UPDATE SUBSCRIPTION
// ============================ */
// export const PATCH = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       const supabase = await getAuthenticatedClient(req)
//       const { plan_id, coupon_code } = await req.json()

//       /* -------------------------
//          Plan definitions
//       -------------------------- */
//       const PLANS = {
//         free: {
//           plan_name: 'Free',
//           plan_tier: 'free',
//           plan_price: 0,
//           notifications_limit: 10000,
//           websites_limit: 1,
//           recurring_limit: 0,
//         },
//         starter: {
//           plan_name: 'Starter',
//           plan_tier: 'starter',
//           plan_price: 10,
//           notifications_limit: 50000,
//           websites_limit: 3,
//           recurring_limit: 10,
//         },
//         growth: {
//           plan_name: 'Growth',
//           plan_tier: 'growth',
//           plan_price: 20,
//           notifications_limit: -1, // unlimited
//           websites_limit: 10,
//           recurring_limit: 30,
//         },
//       } as const

//       const plan = PLANS[plan_id as keyof typeof PLANS]

//       if (!plan) {
//         return NextResponse.json(
//           { error: 'Invalid plan ID' },
//           { status: 400 }
//         )
//       }

//       /* -------------------------
//          Update subscription
//       -------------------------- */
//       const { data: updatedSub, error } = await supabase
//         .from('user_subscriptions')
//         .update({
//           ...plan,
//           coupon_code: coupon_code || null,
//           next_billing_date:
//             plan_id === 'free'
//               ? null
//               : new Date(Date.now() + 30 * 86400000).toISOString(),
//           subscription_starts_at: new Date().toISOString(),
//           status: 'active',
//           updated_at: new Date().toISOString(),
//         })
//         .eq('user_id', user.id)
//         .select()
//         .single()

//       if (error || !updatedSub) throw error

//       /* -------------------------
//          Billing record
//       -------------------------- */
//       if (plan_id !== 'free') {
//         await supabase.from('billing_history').insert({
//           user_id: user.id,
//           subscription_id: updatedSub.id,
//           date: new Date().toISOString(),
//           description: `Upgraded to ${plan.plan_name} Plan`,
//           amount: plan.plan_price,
//           currency: 'USD',
//           status: 'paid',
//         })
//       }

//       return NextResponse.json({
//         success: true,
//         subscription: updatedSub,
//       })
//     } catch (error: any) {
//       console.error('[Subscription] Update error:', error)
//       return NextResponse.json(
//         { error: 'Failed to update subscription', details: error.message },
//         { status: 500 }
//       )
//     }
//   }
// )

// app/api/settings/subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, AuthUser } from '@/lib/auth-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      console.log('📊 [Settings] Fetching subscription for user:', user.email);

      // Get user subscription
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no subscription exists, create a default free one
        if (error.code === 'PGRST116') {
          console.log('📝 [Settings] No subscription found, creating free plan');
          
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
              status: 'active',
            })
            .select()
            .single();

          if (createError) {
            console.error('🔴 [Settings] Failed to create subscription:', createError);
            throw createError;
          }

          return NextResponse.json({
            success: true,
            subscription: newSub,
          });
        }

        console.error('🔴 [Settings] Subscription fetch error:', error);
        throw error;
      }

      // Get billing history if Stripe customer exists
      let billingHistory = [];
      if (subscription.stripe_customer_id) {
        const { data: history, error: historyError } = await supabase
          .from('billing_history')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(10);

        if (!historyError && history) {
          billingHistory = history;
        }
      }

      console.log('✅ [Settings] Subscription fetched:', {
        plan: subscription.plan_tier,
        status: subscription.status,
        hasPaymentMethod: !!subscription.payment_method,
        hasBillingHistory: billingHistory.length > 0,
      });

      return NextResponse.json({
        success: true,
        subscription: {
          ...subscription,
          billing_history: billingHistory,
        },
      });

    } catch (error: any) {
      console.error('🔴 [Settings] Subscription error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch subscription' },
        { status: 500 }
      );
    }
  }
);