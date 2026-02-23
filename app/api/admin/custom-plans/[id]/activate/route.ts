// app/api/admin/custom-plans/[id]/activate/route.ts

import { withSuperAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  
  return withSuperAdmin(async (req, user) => {
    const supabase = await getAdminClient();
    
    try {
      const planId = params.id;

      console.log('[Custom Plans] Activating plan:', planId);

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

      console.log('[Custom Plans] Found plan:', customPlan.plan_code);

      // Get target user info
      const { data: targetUser, error: userError } = await supabase
        .from('user_with_profile')
        .select('id, email')
        .eq('id', customPlan.user_id)
        .single();

      if (userError || !targetUser) {
        console.error('[Custom Plans] User not found:', userError);
        return NextResponse.json(
          { success: false, error: 'Target user not found' },
          { status: 404 }
        );
      }

      console.log('[Custom Plans] Target user:', targetUser.email);

      // Check for existing subscription
      const { data: existingSub, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', customPlan.user_id)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') {
        console.error('[Custom Plans] Error checking subscription:', subError);
        throw subError;
      }

      if (existingSub) {
        console.log('[Custom Plans] Found existing subscription:', {
          id: existingSub.id,
          current_plan: existingSub.plan_tier,
          current_status: existingSub.status,
          has_custom_plan: !!existingSub.custom_plan_id,
        });
      }

      //  Helper to convert -1 (unlimited) to large number, keep null as null
      const convertLimit = (value: number | null): number | null => {
        if (value === null) return null;
        return value === -1 ? 999999 : value;
      };

      //  Determine plan_tier (keep existing or default to free)
      const plan_tier = existingSub?.plan_tier || 'free';

      //  CRITICAL: Build update data with proper null handling
      const updateData = {
        plan_name: customPlan.plan_name,
         plan_tier: 'custom',          
  is_custom_plan: true,          
  has_custom_plan: true, 
        plan_price: customPlan.monthly_price,
        custom_plan_id: customPlan.id,
                websites_limit: convertLimit(customPlan.websites_limit) ?? 1,
        notifications_limit: convertLimit(customPlan.notifications_limit) ?? 10000,
        recurring_limit: convertLimit(customPlan.journeys_limit) ?? null,
        custom_domains_limit: convertLimit(customPlan.custom_domains_limit) ?? null,
        
        subscription_starts_at: customPlan.contract_start_date || new Date().toISOString(),
        subscription_ends_at: customPlan.contract_end_date, // Keep null if not set
        
        status: 'active' as const,
        updated_at: new Date().toISOString(),
      };

      //  Build insert data (for new subscriptions)
      const insertData = {
        user_id: customPlan.user_id, //  Only in insert, not update
        ...updateData,
        
        // Initialize usage counters
        websites_used: 0,
        notifications_used: 0,
        recurring_used: 0,
        custom_domains_used: 0,
        subscribers_used: 0,
      };

      if (existingSub) {
        console.log('[Custom Plans] Updating existing subscription:', existingSub.id);
        
        //  Update (no user_id field in update)
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update(updateData)
          .eq('id', existingSub.id);

        if (updateError) {
          console.error('[Custom Plans] Update error:', updateError);
          throw updateError;
        }

        console.log('[Custom Plans]  Subscription updated');

      } else {
        console.log('[Custom Plans] Creating new subscription');
        
        //  Insert (includes user_id)
        const { error: createError } = await supabase
          .from('user_subscriptions')
          .insert(insertData);

        if (createError) {
          console.error('[Custom Plans] Create error:', createError);
          throw createError;
        }

        console.log('[Custom Plans]  Subscription created');
      }

      // Activate the custom plan
      const { error: activateError } = await supabase
        .from('custom_plans')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId);

      if (activateError) {
        console.error('[Custom Plans] Activate error:', activateError);
        throw activateError;
      }

      console.log('[Custom Plans]  Plan status updated to active');

      // Sync current usage
      await syncUsageToCustomPlan(customPlan.user_id, planId);

      // Audit logging
      await supabase.from('custom_plan_audit_log').insert({
        custom_plan_id: planId,
        action: 'activated',
        changes: {
          from_status: customPlan.status,
          to_status: 'active',
          previous_subscription: existingSub ? {
            plan_tier: existingSub.plan_tier,
            plan_name: existingSub.plan_name,
            had_custom_plan: !!existingSub.custom_plan_id,
          } : null,
        },
        performed_by: user.id,
        performed_by_email: user.email,
      });

      await logAdminActivity(
        user.id,
        'ACTIVATE_CUSTOM_PLAN',
        'custom_plan',
        planId,
        { 
          plan_code: customPlan.plan_code, 
          user_id: customPlan.user_id,
          user_email: targetUser.email,
          replaced_subscription: !!existingSub,
        }
      );

      console.log('[Custom Plans]  Activation complete');

      return NextResponse.json({
        success: true,
        message: existingSub 
          ? `Custom plan "${customPlan.plan_name}" activated. User's subscription has been upgraded.`
          : `Custom plan "${customPlan.plan_name}" activated and assigned to ${targetUser.email}`,
        plan: {
          id: customPlan.id,
          plan_code: customPlan.plan_code,
          plan_name: customPlan.plan_name,
          user_email: targetUser.email,
        },
        previous_subscription: existingSub ? {
          plan_tier: existingSub.plan_tier,
          plan_name: existingSub.plan_name,
          had_custom_plan: !!existingSub.custom_plan_id,
        } : null,
      });

    } catch (error: any) {
      console.error('[Custom Plans] Activation error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message || 'Failed to activate custom plan',
          details: error.details || error.hint || null,
        },
        { status: 500 }
      );
    }
  })(request);
}

// Helper: Sync current usage to custom plan
async function syncUsageToCustomPlan(userId: string, customPlanId: string) {
  try {
    const supabase = await getAdminClient();
    
    console.log('[Sync Usage] Starting sync for user:', userId);

    // Get current subscription usage
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('websites_used, notifications_used, recurring_used, subscribers_used, custom_domains_used')
      .eq('user_id', userId)
      .single();

    if (!subscription) {
      console.warn('[Sync Usage] No subscription found');
      return;
    }

    // Get actual counts from related tables
    const { count: websitesCount } = await supabase
      .from('websites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: journeysCount } = await supabase
      .from('journeys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: teamMembersCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('invited_by', userId)
      .eq('status', 'accepted');

    console.log('[Sync Usage] Current counts:', {
      websites: websitesCount,
      journeys: journeysCount,
      teamMembers: teamMembersCount,
    });

    // Check if usage record exists
    const { data: existingUsage } = await supabase
      .from('custom_plan_usage')
      .select('id')
      .eq('custom_plan_id', customPlanId)
      .eq('user_id', userId)
      .maybeSingle();

    const usageData = {
      subscribers_used: subscription.subscribers_used || 0,
      websites_used: websitesCount || 0,
      notifications_used: subscription.notifications_used || 0,
      journeys_used: journeysCount || 0,
      team_members_used: teamMembersCount || 0,
      api_calls_used: 0,
      custom_domains_used: subscription.custom_domains_used || 0,
      updated_at: new Date().toISOString(),
    };

    if (existingUsage) {
      // Update existing usage record
      const { error: updateError } = await supabase
        .from('custom_plan_usage')
        .update(usageData)
        .eq('id', existingUsage.id);

      if (updateError) {
        console.error('[Sync Usage] Update error:', updateError);
      } else {
        console.log('[Sync Usage]  Usage updated');
      }
    } else {
      // Create new usage record
      const { error: insertError } = await supabase
        .from('custom_plan_usage')
        .insert({
          custom_plan_id: customPlanId,
          user_id: userId,
          ...usageData,
          period_start: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[Sync Usage] Insert error:', insertError);
      } else {
        console.log('[Sync Usage]  Usage record created');
      }
    }

  } catch (error) {
    console.error('[Sync Usage] Error:', error);
  }
}