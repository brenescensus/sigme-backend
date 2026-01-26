// app/api/auth/login/route.ts

import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const supabase = createPublicClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      token: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        fullName: data.user?.user_metadata?.full_name,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
