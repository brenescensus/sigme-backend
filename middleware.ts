// // FILE: middleware.ts
// // Authentication middleware for API routes
// // ============================================================

// import { createServerClient, type CookieOptions } from '@supabase/ssr';
// import { NextResponse, type NextRequest } from 'next/server';

// export async function middleware(request: NextRequest) {
//   let response = NextResponse.next({
//     request: {
//       headers: request.headers,
//     },
//   });

//   const supabase = createMiddlewareClient()
// (
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         get(name: string) {
//           return request.cookies.get(name)?.value;
//         },
//         set(name: string, value: string, options: CookieOptions) {
//           request.cookies.set({
//             name,
//             value,
//             ...options,
//           });
//           response = NextResponse.next({
//             request: {
//               headers: request.headers,
//             },
//           });
//           response.cookies.set({
//             name,
//             value,
//             ...options,
//           });
//         },
//         remove(name: string, options: CookieOptions) {
//           request.cookies.set({
//             name,
//             value: '',
//             ...options,
//           });
//           response = NextResponse.next({
//             request: {
//               headers: request.headers,
//             },
//           });
//           response.cookies.set({
//             name,
//             value: '',
//             ...options,
//           });
//         },
//       },
//     }
//   );

//   // Refresh session if expired
//   await supabase.auth.getUser();

//   return response;
// }

// export const config = {
//   matcher: ['/api/:path*'],
// };
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  

 // Handle preflight requests (OPTIONS) 
  if (request.method === 'OPTIONS') {
    const allowedOrigins = [
      'https://sigme-push-notification-suite.vercel.app', 
      'http://localhost:8080',
      'http://localhost:3000'
    ];
    
    const origin = request.headers.get('origin');
    
    // If origin is valid, return preflight response
    if (origin && allowedOrigins.includes(origin)) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin, // SPECIFIC origin
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400', // 24 hours
        },
      });
    }
    
    // If origin is not in allowed list, return 200 without CORS headers
    return new NextResponse(null, { status: 200 });
  }

  let response = NextResponse.next();

  // Add CORS headers for actual requests
  const allowedOrigins = [
    'https://sigme-push-notification-suite.vercel.app', 
    'http://localhost:8080',
    'http://localhost:3000'
  ];
  
  const origin = request.headers.get('origin');
  
  // Only set CORS headers if origin is in allowed list
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Set other CORS headers
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // 🔄 Refresh session if expired
  await supabase.auth.getUser();

  return response;
}



export const config = {
  matcher: [
    '/api/websites/:path*',
    '/api/campaigns/:path*',
    '/api/subscribers/:path*',
    '/api/notifications/:path*',
  ],
};
