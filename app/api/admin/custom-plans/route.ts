// // app/api/admin/custom-plans/route.ts
// // Admin API for managing custom plans

// import { createClient } from '@/lib/supabase/server';
// import { NextRequest, NextResponse } from 'next/server';
// import { withSuperAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';

// // ============================================
// // GET - List all custom plans
// // ============================================
// export const GET = withSuperAdmin(async (request, user) => {
//   try {
//     // const supabase = await createClient();
//        const supabase = await getAdminClient();
//     // Check if user is admin
//     const { data: { user }, error: authError } = await supabase.auth.getUser();
    
//     if (authError || !user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // TODO: Add admin check
//     // For now, any authenticated user can view
    
//     const { data: plans, error } = await supabase
//       .from('custom_plans')
//       .select(`
//         *,
//         user_subscriptions (
//           user_id,
//           status,
//           subscription_starts_at,
//           subscription_ends_at
//         ),
//         custom_plan_usage (
//           subscribers_used,
//           websites_used,
//           notifications_used,
//           journeys_used,
//           team_members_used,
//           api_calls_used,
//           updated_at
//         )
//       `)
//       .order('created_at', { ascending: false });

//     if (error) throw error;

//     return NextResponse.json({ success: true, plans });

//   } catch (error: any) {
//     console.error('[Custom Plans API] GET error:', error);
//     return NextResponse.json(
//       { error: error.message },
//       { status: 500 }
//     );
//   }
// }

// // ============================================
// // POST - Create new custom plan
// // ============================================
// export async function POST(request: NextRequest) {
//   try {
//     // const supabase = await createClient();
//     const supabase = await getAdminClient();
//     const { data: { user }, error: authError } = await supabase.auth.getUser();
    
//     if (authError || !user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const body = await request.json();

//     const {
//       plan_code,
//       plan_name,
//       description,
//       user_id,  // Client's user ID
//       organization_name,
//       contact_email,
//       monthly_price,
//       annual_price,
//       billing_cycle,
      
//       // Limits
//       subscribers_limit,
//       websites_limit,
//       notifications_limit,
//       journeys_limit,
//       team_members_limit,
//       api_calls_limit,
//       data_retention_days,
      
//       // Features
//       features,
      
//       // Contract
//       contract_start_date,
//       contract_end_date,
//       auto_renew,
      
//       // Metadata
//       notes,
//       sales_contact,
//     } = body;

//     // Validation
//     if (!plan_code || !plan_name || !user_id) {
//       return NextResponse.json(
//         { error: 'Missing required fields: plan_code, plan_name, user_id' },
//         { status: 400 }
//       );
//     }

//     // Create custom plan
//     const { data: customPlan, error: planError } = await supabase
//       .from('custom_plans')
//       .insert({
//         plan_code,
//         plan_name,
//         description,
//         user_id,
//         organization_name,
//         contact_email,
//         monthly_price: monthly_price || 0,
//         annual_price: annual_price || 0,
//         billing_cycle: billing_cycle || 'monthly',
//         subscribers_limit: subscribers_limit ?? -1,
//         websites_limit: websites_limit ?? -1,
//         notifications_limit: notifications_limit ?? -1,
//         journeys_limit: journeys_limit ?? -1,
//         team_members_limit: team_members_limit ?? -1,
//         api_calls_limit: api_calls_limit ?? -1,
//         data_retention_days: data_retention_days ?? -1,
//         features: features || {},
//         contract_start_date,
//         contract_end_date,
//         auto_renew: auto_renew ?? false,
//         notes,
//         sales_contact,
//         created_by: user.id,
//         status: 'draft', // Start as draft
//       })
//       .select()
//       .single();

//     if (planError) throw planError;

//     // Initialize usage tracking
//     const { error: usageError } = await supabase
//       .from('custom_plan_usage')
//       .insert({
//         custom_plan_id: customPlan.id,
//         user_id: user_id,
//         subscribers_used: 0,
//         websites_used: 0,
//         notifications_used: 0,
//         journeys_used: 0,
//         team_members_used: 0,
//         api_calls_used: 0,
//         period_start: contract_start_date || new Date().toISOString(),
//         period_end: contract_end_date,
//       });

//     if (usageError) {
//       console.error('[Custom Plans] Usage init error:', usageError);
//     }

//     // Log creation
//     await supabase.from('custom_plan_audit_log').insert({
//       custom_plan_id: customPlan.id,
//       action: 'created',
//       changes: { plan: customPlan },
//       performed_by: user.id,
//       performed_by_email: user.email,
//     });

//     return NextResponse.json({
//       success: true,
//       plan: customPlan,
//       message: 'Custom plan created successfully. Activate it to assign to user.',
//     });

//   } catch (error: any) {
//     console.error('[Custom Plans API] POST error:', error);
//     return NextResponse.json(
//       { error: error.message },
//       { status: 500 }
//     );
//   }
// }


// app/api/admin/custom-plans/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, getAdminClient } from '@/lib/admin-middleware';

// ============================================
// GET - List all custom plans
// ============================================
export const GET = withSuperAdmin(async (request, user) => {
  try {
    const supabase = await getAdminClient();

    const { data: plans, error } = await supabase
      .from('custom_plans')
      .select(`
        *,
        user_subscriptions (
          user_id,
          status,
          subscription_starts_at,
          subscription_ends_at
        ),
        custom_plan_usage (
          subscribers_used,
          websites_used,
          notifications_used,
          journeys_used,
          team_members_used,
          api_calls_used,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    console.error('[Custom Plans API] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// ============================================
// POST - Create new custom plan
// ============================================
export const POST = withSuperAdmin(async (request, user) => {
  try {
    const supabase = await getAdminClient();
    const body = await request.json();

        const {
      plan_code,
      plan_name,
      description,
      user_id,  // Client's user ID
      organization_name,
      contact_email,
      monthly_price,
      annual_price,
      billing_cycle,
      
      // Limits
      subscribers_limit,
      websites_limit,
      notifications_limit,
      journeys_limit,
      team_members_limit,
      api_calls_limit,
      data_retention_days,
      
      // Features
      features,
      
      // Contract
      contract_start_date,
      contract_end_date,
      auto_renew,
      
      // Metadata
      notes,
      sales_contact,
    } = body;

    // Validation
    if (!plan_code || !plan_name || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: plan_code, plan_name, user_id' },
        { status: 400 }
      );
    }

    // Create custom plan
    const { data: customPlan, error: planError } = await supabase
      .from('custom_plans')
      .insert({
        plan_code,
        plan_name,
        description,
        user_id,
        organization_name,
        contact_email,
        monthly_price: monthly_price || 0,
        annual_price: annual_price || 0,
        billing_cycle: billing_cycle || 'monthly',
        subscribers_limit: subscribers_limit ?? -1,
        websites_limit: websites_limit ?? -1,
        notifications_limit: notifications_limit ?? -1,
        journeys_limit: journeys_limit ?? -1,
        team_members_limit: team_members_limit ?? -1,
        api_calls_limit: api_calls_limit ?? -1,
        data_retention_days: data_retention_days ?? -1,
        features: features || {},
        contract_start_date,
        contract_end_date,
        auto_renew: auto_renew ?? false,
        notes,
        sales_contact,
        created_by: user.id,
        status: 'draft', // Start as draft
      })
      .select()
      .single();

    if (planError) throw planError;

    // Initialize usage tracking
    const { error: usageError } = await supabase
      .from('custom_plan_usage')
      .insert({
        custom_plan_id: customPlan.id,
        user_id: user_id,
        subscribers_used: 0,
        websites_used: 0,
        notifications_used: 0,
        journeys_used: 0,
        team_members_used: 0,
        api_calls_used: 0,
        period_start: contract_start_date || new Date().toISOString(),
        period_end: contract_end_date,
      });

    if (usageError) {
      console.error('[Custom Plans] Usage init error:', usageError);
    }

    // Log creation
    await supabase.from('custom_plan_audit_log').insert({
      custom_plan_id: customPlan.id,
      action: 'created',
      changes: { plan: customPlan },
      performed_by: user.id,
      performed_by_email: user.email,
    });

    return NextResponse.json({
      success: true,
      plan: customPlan,
      message: 'Custom plan created successfully. Activate it to assign to user.',
    });

  } catch (error: any) {
    console.error('[Custom Plans API] POST error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
});