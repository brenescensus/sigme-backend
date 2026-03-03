// app/api/auth/reset-password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    console.log('[Reset Password] Request received');
    console.log('[Reset Password] Token length:', token?.length);

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // Use anon key, not service role
    );

    console.log('[Reset Password] Verifying token...');

    // Set the session using the access token from the email link
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token,  // Supabase recovery tokens work as both
    });

    if (sessionError || !sessionData.user) {
      console.error('[Reset Password] Session error:', sessionError);
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 401 }
      );
    }

    console.log('[Reset Password] Token verified for user:', sessionData.user.email);

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      console.error('[Reset Password] Update error:', updateError);
      throw updateError;
    }

    console.log('[Reset Password] Password updated successfully');

    // Sign out the user (they'll need to log in with new password)
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });

  } catch (error: any) {
    console.error('[Reset Password] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password', details: error.message },
      { status: 500 }
    );
  }
}