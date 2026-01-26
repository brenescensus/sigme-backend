// // app/api/settings/billing-history/route.ts
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
//       console.log('💳 [Billing History] Fetching for user:', user.email);

//       const { data: history, error } = await supabase
//         .from('billing_history')
//         .select('*')
//         .eq('user_id', user.id)
//         .order('date', { ascending: false })
//         .limit(20);

//       if (error) {
//         console.error(' [Billing History] Fetch error:', error);
//         throw error;
//       }

//       console.log(`✅ [Billing History] Returning ${history?.length || 0} records`);

//       return NextResponse.json({
//         success: true,
//         billing_history: history || [],
//       });

//     } catch (error: any) {
//       console.error(' [Billing History] Error:', error);
//       return NextResponse.json(
//         { success: false, error: error.message || 'Failed to fetch billing history' },
//         { status: 500 }
//       );
//     }
//   }
// );




// app/api/settings/billing-history/route.ts
// Returns billing/invoice history

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
      console.log(`💳 [Billing History] Fetching for user: ${user.email}`);

      // Get user's Stripe customer ID
      const { data: userRecord } = await supabase
        .from('users')
        .select('stripe_customer_id, stripe_subscription_id')
        .eq('id', user.id)
        .single();

      // TODO: Integrate with Stripe API to get real billing history
      // For now, return empty array or mock data
      
      const billingHistory: any[] = [];

      // Optional: Add mock data for testing
      if (userRecord?.stripe_subscription_id) {
        // Mock billing history for testing
        billingHistory.push(
          {
            id: 'inv_1',
            date: '2025-01-01',
            description: 'Starter Plan - January 2025',
            amount: 10,
            status: 'paid',
            invoice_pdf: null,
          },
          {
            id: 'inv_2',
            date: '2024-12-01',
            description: 'Starter Plan - December 2024',
            amount: 10,
            status: 'paid',
            invoice_pdf: null,
          }
        );
      }

      console.log(`✅ [Billing History] Returning ${billingHistory.length} records`);

      return NextResponse.json({
        success: true,
        billing_history: billingHistory,
      });
    } catch (error: any) {
      console.error('❌ [Billing History] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch billing history' },
        { status: 500 }
      );
    }
  }
);