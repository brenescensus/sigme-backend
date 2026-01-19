
// // app/api/auth/login/route.ts 
// import { NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';

// export async function POST(req: Request) {
//   try {
//     const { email, password } = await req.json();

//     if (!email || !password) {
//       return NextResponse.json(
//         { error: 'Email and password are required' },
//         { status: 400 }
//       );
//     }

//     const supabase = await createClient();

//     //  Use Supabase Auth to sign in
//     const { data, error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (error) {
//       console.error('[LOGIN] Supabase error:', error);
//       return NextResponse.json(
//         { error: error.message },
//         { status: 401 }
//       );
//     }

//     if (!data.user || !data.session) {
//       return NextResponse.json(
//         { error: 'Login failed' },
//         { status: 401 }
//       );
//     }

//     //  Return JWT token from Supabase session
//     return NextResponse.json({
//       success: true,
//       token: data.session.access_token,
//       user: {
//         id: data.user.id,
//         email: data.user.email,
//         fullName: data.user.user_metadata?.full_name,
//       },
//     });

//   } catch (err: any) {
//     console.error('[LOGIN] Error:', err);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

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
