// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Sign out - this clears the cookies automatically
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[LOGOUT]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}