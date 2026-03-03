// ═══════════════════════════════════════════════════════════════════════════
// app/api/agency/[slug]/settings/route.ts
// GET | PUT — agency admin's own profile
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getAdminClient } from '@/lib/admin-middleware';

export const GET_settings = withAuth(async (request: NextRequest, user, { params }: any) => {
  const supabase = getAdminClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    profile: {
      id: user.id,
      email: user.email,
      first_name: profile?.first_name,
      last_name: profile?.last_name,
      avatar_url: profile?.avatar_url,
      timezone: profile?.timezone,
    },
  });
});

export const PUT = withAuth(async (request: NextRequest, user, { params }: any) => {
  const supabase = getAdminClient();
  const body = await request.json();

  await supabase.from('user_profiles').upsert({
    id: user.id,
    first_name: body.first_name,
    last_name: body.last_name,
    timezone: body.timezone,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
});
