// middleware.ts - 
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Handle preflight (OPTIONS) requests
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

  // Create response with CORS headers
  const response = NextResponse.next();

  // Add CORS headers for actual requests
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  } else {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

  //  No Supabase client here - let API routes handle it
  return response;
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/websites/:path*',
    '/api/campaigns/:path*',
    '/api/subscribers/:path*',
    '/api/notifications/:path*',
  ],
};