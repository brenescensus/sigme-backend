// // // app/api/auth/login/route.ts
// // import { NextResponse } from 'next/server';
// // import { createClient } from '@/lib/supabase/server';

// // export async function POST(req: Request) {
// //   const { email, password } = await req.json();

// //   const supabase = await createClient();

// //   const { error } = await supabase.auth.signInWithPassword({
// //     email,
// //     password,
// //   });

// //   if (error) {
// //     return NextResponse.json({ error: error.message }, { status: 401 });
// //   }

// //   return NextResponse.json({ success: true });
// // }

// // FILE: app/api/auth/login/route.ts
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

//     const { data, error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (error) {
//       return NextResponse.json({ error: error.message }, { status: 401 });
//     }

//     // Session is automatically set in cookies by the Supabase client
//     // Return user data to confirm successful login
//     return NextResponse.json({
//       success: true,
//       user: {
//         id: data.user.id,
//         email: data.user.email,
//         full_name: data.user.user_metadata?.full_name,
//       },
//       session: {
//         access_token: data.session.access_token,
//         expires_at: data.session.expires_at,
//       },
//     });
//   } catch (error: any) {
//     console.error('[Auth Login] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }


// FILE: app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handle OPTIONS (preflight) requests
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || 'http://localhost:8080';
  const allowedOrigins = [
    'https://sigme-push-notification-suite.vercel.app', 
    'http://localhost:8080',
    'http://localhost:3000'
  ];
  
  // Only allow specific origins
  if (origin && allowedOrigins.includes(origin)) {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin, // Specific origin, NOT *
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400', // 24 hours
      },
    });
  }
  
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin') || 'http://localhost:8080';
  const allowedOrigins = [
    'https://sigme-push-notification-suite.vercel.app', 
    'http://localhost:8080',
    'http://localhost:3000'
  ];
  
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      const response = NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
      
      // Add CORS headers
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      return response;
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const response = NextResponse.json(
        { error: error.message }, 
        { status: 401 }
      );
      
      // Add CORS headers
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      return response;
    }

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name,
      },
      session: {
        access_token: data.session.access_token,
        expires_at: data.session.expires_at,
      },
    });

    // Add CORS headers to the successful response
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
    
  } catch (error: any) {
    console.error('[Auth Login] Error:', error);
    
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    
    // Add CORS headers to error response
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return response;
  }
}