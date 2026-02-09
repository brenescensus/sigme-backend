// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' }, 
        { status: 400 }
      );
    }

    const supabase = createPublicClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(' [Login] Auth error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.user || !data.session) {
      return NextResponse.json(
        { error: 'Login failed' }, 
        { status: 401 }
      );
    }

    // Extract role from user metadata
    const role = data.user.user_metadata?.role || 'user';
    const isSuperAdmin = role === 'super_admin';

    console.log(' [Login] User authenticated:', {
      email: data.user.email,
      role,
      isSuperAdmin,
    });

    return NextResponse.json({
      success: true,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      session: data.session,
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name,
        role: role,
        is_super_admin: isSuperAdmin,
        first_name: data.user.user_metadata?.first_name,
        last_name: data.user.user_metadata?.last_name,
      },
    });
  } catch (e: any) {
    console.error(' [Login] Error:', e.message);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}