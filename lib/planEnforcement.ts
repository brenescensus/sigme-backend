// FILE 1: lib/planEnforcement.ts
// Reusable enforcement helpers called from any route handler
// -----------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database"; 

// ─── Error class ──────────────────────────────────────────────────────────────

export class PlanLimitError extends Error {
  public statusCode = 403;
  public code: string;
  public upgrade_url = "/dashboard/billing";

  constructor(message: string, code: string) {
    super(message);
    this.name = "PlanLimitError";
    this.code = code;
  }
}

// ─── Load subscription from user_subscriptions table ─────────────────────────

export async function getSubscription(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new PlanLimitError("No active subscription found.", "NO_SUBSCRIPTION");
  }

  return data;
}

// ─── Enforcement functions ────────────────────────────────────────────────────
// These mirror the DB functions already in your schema (can_add_website,
// can_send_notification, check_custom_plan_limit) but add clear error messages.

/**
 * WEBSITE CREATION
 * Uses your existing DB function: can_add_website(p_user_id)
 * Also checks user_subscriptions.websites_used vs websites_limit
 */
export async function enforceWebsiteLimit(supabase: any, userId: string) {
  // Use your existing DB function first (most accurate)
  const { data, error } = await supabase.rpc("can_add_website", {
    p_user_id: userId,
  });

  if (error) {
    // Fallback: manual check if RPC fails
    const sub = await getSubscription(supabase, userId);
    const used = sub.websites_used ?? 0;
    const limit = sub.websites_limit ?? 1;
    if (used >= limit) {
      throw new PlanLimitError(
        `Your ${sub.plan_name} plan allows ${limit} website(s). You have ${used}. Please upgrade to add more.`,
        "WEBSITE_LIMIT_EXCEEDED"
      );
    }
    return;
  }

  if (!data) {
    const sub = await getSubscription(supabase, userId);
    throw new PlanLimitError(
      `Your ${sub.plan_name} plan allows ${sub.websites_limit} website(s). Please upgrade to add more.`,
      "WEBSITE_LIMIT_EXCEEDED"
    );
  }
}

/**
 * SENDING NOTIFICATIONS
 * Uses your existing DB function: can_send_notification(p_user_id)
 * Also checks notifications_used vs notifications_limit
 */
export async function enforceNotificationLimit(
  supabase: any,
  userId: string,
  recipientCount = 1
) {
  const sub = await getSubscription(supabase, userId);

  // Use your existing DB function
  const { data, error } = await supabase.rpc("can_send_notification", {
    p_user_id: userId,
  });

  if (error || !data) {
    throw new PlanLimitError(
      `You have used ${sub.notifications_used?.toLocaleString()} of your ${sub.notifications_limit?.toLocaleString()} monthly notifications. ` +
        `Upgrade your plan or wait until your next billing cycle.`,
      "NOTIFICATION_LIMIT_EXCEEDED"
    );
  }

  // Extra check: will this batch push us over?
  const used = sub.notifications_used ?? 0;
  const limit = sub.notifications_limit ?? 0;
  if (limit > 0 && used + recipientCount > limit) {
    throw new PlanLimitError(
      `Sending to ${recipientCount} subscribers would exceed your monthly limit of ${limit.toLocaleString()} notifications.`,
      "NOTIFICATION_LIMIT_EXCEEDED"
    );
  }
}

/**
 * RECURRING CAMPAIGNS
 * Checks recurring_limit in user_subscriptions
 */
export async function enforceRecurringLimit(supabase: any, userId: string) {
  const sub = await getSubscription(supabase, userId);
  const limit = sub.recurring_limit ?? 0;
  const used = sub.recurring_used ?? 0;

  if (limit === 0) {
    throw new PlanLimitError(
      `Recurring campaigns are not available on your ${sub.plan_name} plan. Please upgrade to Starter or higher.`,
      "RECURRING_NOT_AVAILABLE"
    );
  }

  // -1 or 999999 = unlimited
  if (limit !== -1 && limit !== 999999 && used >= limit) {
    throw new PlanLimitError(
      `You have reached your recurring campaign limit (${used}/${limit}). Upgrade to create more.`,
      "RECURRING_LIMIT_EXCEEDED"
    );
  }
}

/**
 * CUSTOM PLAN FEATURES (journeys, api calls, custom domains, team members)
 * Uses your existing DB function: check_custom_plan_limit(p_limit_type, p_user_id)
 * p_limit_type: 'websites' | 'notifications' | 'subscribers' | 'journeys'
 *               | 'api_calls' | 'custom_domains' | 'team_members'
 */
export async function enforceCustomPlanLimit(
  supabase: any,
  userId: string,
  limitType: string
) {
  const { data, error } = await supabase.rpc("check_custom_plan_limit", {
    p_limit_type: limitType,
    p_user_id: userId,
  });

  if (error || !data?.[0]) return; // non-custom plan, skip

  const result = data[0];
  if (!result.allowed) {
    throw new PlanLimitError(
      `You have reached your ${limitType} limit (${result.used_value}/${result.limit_value}) on your custom plan.`,
      `CUSTOM_${limitType.toUpperCase()}_LIMIT_EXCEEDED`
    );
  }
}

// ─── Usage increment helpers ──────────────────────────────────────────────────
// Always call these AFTER successfully completing the action

export async function incrementWebsiteUsage(supabase: any, userId: string) {
  await supabase.rpc("increment_website_usage", { p_user_id: userId });
}

export async function decrementWebsiteUsage(supabase: any, userId: string) {
  await supabase.rpc("decrement_website_usage", { p_user_id: userId });
}

export async function incrementNotificationUsage(supabase: any, userId: string) {
  await supabase.rpc("increment_notification_usage", { p_user_id: userId });
}

// For bulk sends: update notifications_used directly
export async function incrementNotificationUsageBulk(
  supabase: any,
  userId: string,
  count: number
) {
  await supabase
    .from("user_subscriptions")
    .update({
      notifications_used: supabase.raw(`notifications_used + ${count}`),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

// ─── Global error handler for route handlers ──────────────────────────────────

export function handleEnforcementError(error: unknown) {
  if (error instanceof PlanLimitError) {
    return Response.json(
      {
        success: false,
        code: error.code,
        message: error.message,
        upgrade_url: error.upgrade_url,
      },
      { status: 403 }
    );
  }
  // Re-throw unknown errors
  throw error;
}
