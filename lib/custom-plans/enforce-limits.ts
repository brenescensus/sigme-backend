// lib/custom-plans/enforce-limits.ts
// FIXED: Proper TypeScript typing for database results

import { createClient } from '@/lib/supabase/server';

export type LimitType =
  | 'subscribers'
  | 'websites'
  | 'notifications'
  | 'journeys'
  | 'team_members'
  | 'api_calls';

interface LimitCheckResult {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  isUnlimited: boolean;
  planType: 'custom' | 'standard' | 'none';
}

//  FIX: Define proper types for custom plan data
interface CustomPlanData {
  id: string;
  subscribers_limit: number | null;
  websites_limit: number | null;
  notifications_limit: number | null;
  journeys_limit: number | null;
  team_members_limit: number | null;
  api_calls_limit: number | null;
  status: string | null;
}

interface CustomPlanUsageData {
  subscribers_used: number | null;
  websites_used: number | null;
  notifications_used: number | null;
  journeys_used: number | null;
  team_members_used: number | null;
  api_calls_used: number | null;
}

/**
 * Check if user can perform an action based on their custom plan limits
 */
export async function checkCustomPlanLimit(
  userId: string,
  limitType: LimitType
): Promise<LimitCheckResult> {
  try {
    const supabase = await createClient();

    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        custom_plans!custom_plan_id (
          id,
          subscribers_limit,
          websites_limit,
          notifications_limit,
          journeys_limit,
          team_members_limit,
          api_calls_limit,
          status
        ),
        custom_plan_usage!custom_plan_id (
          subscribers_used,
          websites_used,
          notifications_used,
          journeys_used,
          team_members_used,
          api_calls_used
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    // if (error || !subscription) {
    //   return {
    //     allowed: false,
    //     limit: 0,
    //     used: 0,
    //     remaining: 0,
    //     isUnlimited: false,
    //     planType: 'none',
    //   };
    // }
    if (error || !subscription) {
      return checkStandardPlanLimit(
        { plan_tier: 'free' },
        limitType
      );
    }


    // Check if user has a custom plan
    if (subscription.custom_plan_id && subscription.custom_plans) {
      //  FIX: Cast to proper type
      const customPlan = subscription.custom_plans as unknown as CustomPlanData;
      const usage = (subscription.custom_plan_usage?.[0] || {}) as CustomPlanUsageData;

      if (!customPlan || customPlan.status !== 'active') {
        return checkStandardPlanLimit(subscription, limitType);
      }

      //  FIX: Type-safe property access
      const limitKey = `${limitType}_limit` as keyof CustomPlanData;
      const usedKey = `${limitType}_used` as keyof CustomPlanUsageData;

      const limit = customPlan[limitKey] as number | null ?? 0;
      const used = usage[usedKey] as number | null ?? 0;

      // -1 means unlimited
      const isUnlimited = limit === -1;
      const allowed = isUnlimited || used < limit;
      const remaining = isUnlimited ? -1 : Math.max(0, limit - used);

      return {
        allowed,
        limit,
        used,
        remaining,
        isUnlimited,
        planType: 'custom',
      };
    }

    // No custom plan, use standard plan limits
    return checkStandardPlanLimit(subscription, limitType);

  } catch (error) {
    console.error('[Limit Check] Error:', error);
    return {
    //   allowed: false,
    //   limit: 0,
    //   used: 0,
    //   remaining: 0,
    //   isUnlimited: false,
    //   planType: 'none',
    // };
    ...checkStandardPlanLimit(
      { plan_tier: 'free', notifications_used: 0 },
      limitType
    ),
    planType: 'standard',
  };
  }
}

/**
 * Check standard (non-custom) plan limits
 */
function checkStandardPlanLimit(
  subscription: any,
  limitType: LimitType
): LimitCheckResult {
  let limit = 0;
  let used = 0;

  switch (limitType) {
    // case 'subscribers':
    //   limit = subscription.subscribers_limit || 0;
    //   used = subscription.subscribers_used || 0;
    //   break;
    // case 'websites':
    //   limit = subscription.websites_limit || 0;
    //   used = subscription.websites_used || 0;
    //   break;

    case 'subscribers': {
  limit = subscription.subscribers_limit ?? Infinity;
  used = subscription.subscribers_used ?? 0;
  break;
}

case 'websites': {
  limit = subscription.websites_limit ?? Infinity;
  used = subscription.websites_used ?? 0;
  break;
}

    case 'notifications':
      limit = getStandardPlanNotificationLimit(subscription.plan_tier);
      used = subscription.notifications_used || 0;
      // limit = subscription.notifications_limit || 0;
      // used = subscription.notifications_used || 0;
      break;
    case 'journeys':
      limit = getStandardPlanJourneyLimit(subscription.plan_tier);
      used = 0;
      break;
    case 'team_members':
      limit = getStandardPlanTeamMemberLimit(subscription.plan_tier);
      used = 0;
      break;
    case 'api_calls':
      limit = getStandardPlanAPILimit(subscription.plan_tier);
      used = 0;
      break;
  }

  const isUnlimited = limit === -1;
  const allowed = isUnlimited || used < limit;
  const remaining = isUnlimited ? -1 : Math.max(0, limit - used);

  return {
    allowed,
    limit,
    used,
    remaining,
    isUnlimited,
    planType: 'standard',
  };
}

function getStandardPlanJourneyLimit(planTier: string): number {
  const limits: Record<string, number> = {
    free: 1,
    starter: 5,
    pro: 20,
    business: -1,
  };
  return limits[planTier] || 0;
}

function getStandardPlanTeamMemberLimit(planTier: string): number {
  const limits: Record<string, number> = {
    free: 1,
    starter: 3,
    pro: 10,
    business: -1,
  };
  return limits[planTier] || 1;
}

function getStandardPlanAPILimit(planTier: string): number {
  const limits: Record<string, number> = {
    free: 1000,
    starter: 10000,
    pro: 100000,
    business: -1,
  };
  return limits[planTier] || 0;
}
function getStandardPlanNotificationLimit(planTier: string): number {
  const limits: Record<string, number> = {
    free: 500,
    starter: 5000,
    pro: 50000,
    business: -1, // unlimited
  };

  return limits[planTier] ?? 0;
}

export async function incrementCustomPlanUsage(
  userId: string,
  usageType: LimitType,
  amount: number = 1
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc('increment_custom_plan_usage', {
      p_user_id: userId,
      p_usage_type: usageType,
      p_amount: amount,
    });

    if (error) {
      console.error('[Increment Usage] Error:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('[Increment Usage] Exception:', error);
    return false;
  }
}

export async function decrementCustomPlanUsage(
  userId: string,
  usageType: LimitType,
  amount: number = 1
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc('decrement_custom_plan_usage', {
      p_user_id: userId,
      p_usage_type: usageType,
      p_amount: amount,
    });

    if (error) {
      console.error('[Decrement Usage] Error:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('[Decrement Usage] Exception:', error);
    return false;
  }
}

export async function checkCustomPlanFeature(
  userId: string,
  featureName: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select(`
        custom_plans!custom_plan_id (
          features,
          status
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!subscription?.custom_plans) {
      return false;
    }

    const customPlan = subscription.custom_plans as any;

    if (customPlan.status !== 'active') {
      return false;
    }

    const features = customPlan.features as Record<string, boolean>;
    return features[featureName] === true;

  } catch (error) {
    console.error('[Feature Check] Error:', error);
    return false;
  }
}

export async function getUserPlanDetails(userId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_custom_plan_details', {
      p_user_id: userId,
    });

    if (error) {
      console.error('[Get Plan Details] Error:', error);
      return null;
    }

    return data?.[0] || null;

  } catch (error) {
    console.error('[Get Plan Details] Exception:', error);
    return null;
  }
}