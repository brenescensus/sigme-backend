// app/api/auth/refresh/route.ts
import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { refresh_token } = await req.json();
    
    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token required' }, 
        { status: 400 }
      );
    }

    const supabase = createPublicClient();
    
    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      console.error('🔄 [Refresh] Auth error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'Session refresh failed' }, 
        { status: 401 }
      );
    }

    console.log('[Refresh] Token refreshed successfully');

    return NextResponse.json({
      success: true,
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      session: data.session,
    });
  } catch (e: any) {
    console.error('❌ [Refresh] Error:', e.message);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}