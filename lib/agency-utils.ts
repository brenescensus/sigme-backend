// lib/agency-utils.ts
import { getAdminClient } from '@/lib/admin-middleware';
import type { Database } from '@/types/database';

type CustomPlan = Database['public']['Tables']['custom_plans']['Row'];

// Accepts null fallback — returns 1 as last-resort default if both value and fallback are null
export function enforceCeiling(
  value: number | null | undefined,
  fallback: number | null,
  lastResort = 0
): number {
  const resolved = value ?? fallback ?? lastResort;
  return resolved === -1 ? 999999 : resolved;
}

export async function resolveAgency(
  slug: string,
  userId: string
): Promise<CustomPlan | null> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('custom_plans')
    .select('*')
    .eq('agency_subdomain', slug)
    .eq('user_id', userId)
    .eq('is_agency', true)
    .eq('status', 'active')
    .single();

  if (error || !data) return null;
  return data;
}