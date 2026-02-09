//api/auth/me
import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    //  JWT-only client (no cookies)
    const supabase = createPublicClient()

    //  Validate token directly
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName:
          user.user_metadata?.full_name ??
          user.email?.split('@')[0] ??
          'User',
        created_at: user.created_at,
      },
    })
  } catch (err) {
    console.error('[AUTH ME]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
