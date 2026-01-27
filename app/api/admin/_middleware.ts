// app/api/admin/_middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function requireSuperAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
    };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
    };
  }

  // Check role from user metadata
  const role = user.user_metadata?.role || 'user';
  
  if (role !== 'super_admin') {
    return {
      error: NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { user, error: null };
}

// Helper to log admin activity
export async function logAdminActivity(
  supabase: any,
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: any
) {
  try {
    await supabase.from('admin_activity_log').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
}
