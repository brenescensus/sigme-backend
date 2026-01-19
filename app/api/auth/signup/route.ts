

// // app/api/auth/signup/route.ts 
// import { NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';

// export async function POST(req: Request) {
//   try {
//     const { email, password, fullName } = await req.json();

//     // Validation
//     if (!email || !password) {
//       return NextResponse.json(
//         { error: 'Email and password are required' },
//         { status: 400 }
//       );
//     }

//     if (password.length < 6) {
//       return NextResponse.json(
//         { error: 'Password must be at least 6 characters' },
//         { status: 400 }
//       );
//     }

//     const supabase = await createClient();

//     //  Use Supabase Auth to create user
//     const { data, error } = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         data: {
//           full_name: fullName,
//         },
//       },
//     });

//     if (error) {
//       console.error('[SIGNUP] Supabase error:', error);
//       return NextResponse.json(
//         { error: error.message },
//         { status: 400 }
//       );
//     }

//     if (!data.user || !data.session) {
//       return NextResponse.json(
//         { error: 'Failed to create account' },
//         { status: 500 }
//       );
//     }

//     //  Return JWT token from Supabase session
//     return NextResponse.json({
//       success: true,
//       token: data.session.access_token,
//       user: {
//         id: data.user.id,
//         email: data.user.email,
//         fullName: data.user.user_metadata?.full_name || fullName,
//       },
//     }, { status: 201 });

//   } catch (err: any) {
//     console.error('[SIGNUP] Error:', err);
//     return NextResponse.json(
//       { error: 'Signup failed', message: err.message },
//       { status: 500 }
//     );
//   }
// }

// app/api/auth/signup/route.ts

import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { email, password, fullName } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createPublicClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      {
        success: true,
        token: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          fullName: data.user?.user_metadata?.full_name,
        },
      },
      { status: 201 }
    )
  } catch (e) {
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
  }
}
