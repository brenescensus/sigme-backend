// // middleware.ts - 
// import { NextResponse, type NextRequest } from 'next/server';

// export async function middleware(request: NextRequest) {
//   const origin = request.headers.get('origin');

//   // Handle preflight (OPTIONS) requests
//   if (request.method === 'OPTIONS') {
//     return new NextResponse(null, {
//       status: 200,
//       headers: {
//         'Access-Control-Allow-Origin': origin || '*',
//         'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
//         'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
//         'Access-Control-Allow-Credentials': 'true',
//         'Access-Control-Max-Age': '86400',
//       },
//     });
//   }

//   // Create response with CORS headers
//   const response = NextResponse.next();

//   // Add CORS headers for actual requests
//   if (origin) {
//     response.headers.set('Access-Control-Allow-Origin', origin);
//     response.headers.set('Access-Control-Allow-Credentials', 'true');
//   } else {
//     response.headers.set('Access-Control-Allow-Origin', '*');
//   }
  
//   response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
//   response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

//   //  No Supabase client here - let API routes handle it
//   return response;
// }

// export const config = {
//   matcher: [
//     '/api/auth/:path*',
//     '/api/websites/:path*',
//     '/api/campaigns/:path*',
//     '/api/subscribers/:path*',
//     '/api/notifications/:path*',
//   ],
// };





// middleware.ts — Subdomain-aware routing for agency white-label portals

import { NextResponse, type NextRequest } from 'next/server';

const MAIN_APP_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const origin = request.headers.get('origin');

  // ── CORS preflight ───────────────────────────────────────────────────────
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // ── Detect agency subdomain ───────────────────────────────────────────────
  // e.g. "acme.yourdomain.com" → subdomain = "acme"
  // Ignore "www", "app", "api" and localhost
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  let agencySubdomain: string | null = null;

  if (!isLocalhost) {
    const hostWithoutPort = hostname.split(':')[0];
    const rootDomain = MAIN_APP_DOMAIN;

    if (
      hostWithoutPort.endsWith(`.${rootDomain}`) &&
      hostWithoutPort !== rootDomain &&
      hostWithoutPort !== `www.${rootDomain}` &&
      hostWithoutPort !== `app.${rootDomain}` &&
      hostWithoutPort !== `api.${rootDomain}`
    ) {
      agencySubdomain = hostWithoutPort.replace(`.${rootDomain}`, '');
    }
  } else {
    // Local dev: support ?agency=acme query param to simulate subdomain
    agencySubdomain = url.searchParams.get('agency') || null;
  }

  // ── Agency portal rewrite ─────────────────────────────────────────────────
  if (agencySubdomain) {
    // Rewrite all requests under this subdomain to /agency/[slug]/...
    // so Next.js serves the agency portal pages without the user seeing the path change
    const path = url.pathname === '/' ? '' : url.pathname;
    url.pathname = `/agency/${agencySubdomain}${path}`;

    // Pass subdomain as header so server components / API routes can read it
    const response = NextResponse.rewrite(url);
    response.headers.set('x-agency-subdomain', agencySubdomain);
    addCorsHeaders(response, origin, hostname);
    return response;
  }

  // ── Standard app request ──────────────────────────────────────────────────
  const response = NextResponse.next();
  addCorsHeaders(response, origin, hostname);
  return response;
}

function addCorsHeaders(response: NextResponse, origin: string | null, hostname: string) {
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  } else {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};