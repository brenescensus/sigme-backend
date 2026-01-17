// // FILE: app/api/auth/signup/route.ts
// // User registration endpoint
// // ============================================================

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { email, password, fullName } = body;

//     if (!email || !password) {
//       return NextResponse.json(
//         { error: 'Email and password are required' },
//         { status: 400 }
//       );
//     }

//     const supabase = await createClient();


//     const { data, error } = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         data: {
//           full_name: fullName || '',
//         },
//       },
//     });

//     if (error) {
//       return NextResponse.json(
//         { error: error.message },
//         { status: 400 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       user: data.user,
//       session: data.session,
//     });
//   } catch (error: any) {
//     console.error('[Auth Signup] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }


// FILE: app/api/auth/signup/route.ts
// User registration endpoint
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper function to add CORS headers
function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://sigme-push-notification-suite.vercel.app', 
    'http://localhost:8080',
    'http://localhost:3000'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  return response;
}

// Handle OPTIONS (preflight) requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://sigme-push-notification-suite.vercel.app', 
    'http://localhost:8080',
    'http://localhost:3000'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName } = body;

    if (!email || !password) {
      const response = NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
      return addCorsHeaders(response, req);
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
        },
      },
    });

    if (error) {
      const response = NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
      return addCorsHeaders(response, req);
    }

    const response = NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });
    
    return addCorsHeaders(response, req);
    
  } catch (error: any) {
    console.error('[Auth Signup] Error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addCorsHeaders(response, req);
  }
}