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
  let response = NextResponse.next();


 
// Add CORS headers
  const allowedOrigins = [
    'https://sigme-push-notification-suite.vercel.app', 
    'http://localhost:8080'
  ];
  
  const origin = request.headers.get('origin');
  
  // Only set the Access-Control-Allow-Origin header if origin is valid
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  // Set other CORS headers
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

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
