// // // // lib/auth-middleware.ts -FOR JWT TOKENS
// // // import { NextRequest, NextResponse } from 'next/server';
// // // import { createServerClient } from '@supabase/ssr';
// // // import type { Database } from '@/types/database';

// // // export interface AuthUser {
// // //   id: string;
// // //   email: string;
// // //   fullName?: string;
// // // }

// // // /**
// // //  * Create a Supabase client that uses JWT from Authorization header
// // //  */
// // // function createClientFromToken(token: string) {
// // //   return createServerClient<Database>(
// // //     process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // //     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
// // //     {
// // //       cookies: {
// // //         getAll() {
// // //           return [];
// // //         },
// // //         setAll() {},
// // //       },
// // //       global: {
// // //         headers: {
// // //           Authorization: `Bearer ${token}`,
// // //         },
// // //       },
// // //     }
// // //   );
// // // }

// // // /**
// // //  * Verify JWT token from Authorization header
// // //  */
// // // export async function verifyToken(req: NextRequest): Promise<AuthUser | null> {
// // //   try {
// // //     console.log(' [Auth] Verifying token...');
    
// // //     const authHeader = 
// // //       req.headers.get('authorization') || 
// // //       req.headers.get('Authorization');
    
// // //     console.log(' [Auth] Authorization header:', authHeader ? `EXISTS (${authHeader.substring(0, 30)}...)` : 'MISSING');
    
// // //     if (!authHeader) {
// // //       console.log(' [Auth] No authorization header found');
// // //       return null;
// // //     }

// // //     if (!authHeader.startsWith('Bearer ')) {
// // //       console.log(' [Auth] Invalid authorization format');
// // //       return null;
// // //     }

// // //     const token = authHeader.substring(7).trim();
    
// // //     console.log(' [Auth] Token extracted:', token ? `${token.substring(0, 30)}...` : 'NULL');
    
// // //     if (!token) {
// // //       console.log(' [Auth] Token is empty');
// // //       return null;
// // //     }

// // //     // Create Supabase client with the token
// // //     const supabase = createClientFromToken(token);
    
// // //     // Verify token by getting user
// // //     const { data: { user }, error } = await supabase.auth.getUser();
    
// // //     if (error) {
// // //       console.error(' [Auth] Token verification failed:', error.message);
// // //       return null;
// // //     }

// // //     if (!user) {
// // //       console.error(' [Auth] No user found for token');
// // //       return null;
// // //     }

// // //     console.log(' [Auth] Token verified successfully for user:', user.email);

// // //     return {
// // //       id: user.id,
// // //       email: user.email!,
// // //       fullName: user.user_metadata?.full_name,
// // //     };
// // //   } catch (error: any) {
// // //     console.error(' [Auth] Verification error:', error.message);
// // //     return null;
// // //   }
// // // }

// // // /**
// // //  * Middleware wrapper that requires authentication
// // //  */
// // // export function withAuth(
// // //   handler: (req: NextRequest, user: AuthUser, ...args: any[]) => Promise<NextResponse>
// // // ) {
// // //   return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
// // //     console.log(' [withAuth] Checking authentication for:', req.method, req.url);
// // //     console.log(' [withAuth] Headers:', {
// // //       authorization: req.headers.get('authorization') ? 'EXISTS' : 'MISSING',
// // //       'content-type': req.headers.get('content-type'),
// // //     });
    
// // //     const user = await verifyToken(req);
    
// // //     if (!user) {
// // //       console.error(' [withAuth] Authentication failed - returning 401');
// // //       return NextResponse.json(
// // //         { error: 'Unauthorized - Invalid or missing token' },
// // //         { status: 401 }
// // //       );
// // //     }
    
// // //     console.log(' [withAuth] Authentication successful, user:', user.email);
// // //     return handler(req, user, ...args);
// // //   };
// // // }

// // // /**
// // //  * Get authenticated Supabase client from request
// // //  */
// // // export async function getAuthenticatedClient(req: NextRequest) {
// // //   const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  
// // //   if (!authHeader?.startsWith('Bearer ')) {
// // //     throw new Error('No valid authorization header');
// // //   }
  
// // //   const token = authHeader.substring(7).trim();
// // //   return createClientFromToken(token);
// // // }

// // // /**
// // //  * Verify website ownership
// // //  */
// // // export async function verifyWebsiteOwnership(
// // //   req: NextRequest,
// // //   websiteId: string,
// // //   userId: string
// // // ): Promise<{ success: boolean; website?: any; error?: string }> {
// // //   try {
// // //     const supabase = await getAuthenticatedClient(req);
    
// // //     const { data: website, error } = await supabase
// // //       .from('websites')
// // //       .select('*')
// // //       .eq('id', websiteId)
// // //       .eq('user_id', userId)
// // //       .single();

// // //     if (error || !website) {
// // //       return {
// // //         success: false,
// // //         error: 'Website not found or access denied',
// // //       };
// // //     }

// // //     return {
// // //       success: true,
// // //       website,
// // //     };
// // //   } catch (error: any) {
// // //     return {
// // //       success: false,
// // //       error: error.message || 'Failed to verify website ownership',
// // //     };
// // //   }
// // // }

// // // /**
// // //  * Extract pagination params from request
// // //  */
// // // export function getPaginationParams(req: NextRequest) {
// // //   const { searchParams } = new URL(req.url);
  
// // //   return {
// // //     limit: parseInt(searchParams.get('limit') || '100'),
// // //     offset: parseInt(searchParams.get('offset') || '0'),
// // //     page: parseInt(searchParams.get('page') || '1'),
// // //   };
// // // }

// // // /**
// // //  * Build pagination response
// // //  */
// // // export function buildPaginationResponse(
// // //   count: number,
// // //   limit: number,
// // //   offset: number
// // // ) {
// // //   const totalPages = Math.ceil(count / limit);
// // //   const currentPage = Math.floor(offset / limit) + 1;
  
// // //   return {
// // //     total: count,
// // //     limit,
// // //     offset,
// // //     currentPage,
// // //     totalPages,
// // //     hasMore: count > offset + limit,
// // //     hasPrevious: offset > 0,
// // //   };
// // // }



// // // lib/auth-middleware.ts - UPDATED with built-in CORS support
// // import { NextRequest, NextResponse } from 'next/server';
// // import { createServerClient } from '@supabase/ssr';
// // import type { Database } from '@/types/database';

// // export interface AuthUser {
// //   id: string;
// //   email: string;
// //   fullName?: string;
// // }

// // /**
// //  * CORS Configuration
// //  */
// // const ALLOWED_ORIGINS = [
// //   'http://localhost:5173', // Vite dev server
// //   'http://localhost:8080', // Next.js dev server
// //   'http://localhost:4173', // Vite preview
// //     'http://localhost:3000', // Next.js dev server
// //     'https://notifications-app-seven.vercel.app',
// //     'https://sigme-backend-fkde.vercel.app',

// //   process.env.NEXT_PUBLIC_APP_URL || '',
// // ].filter(Boolean);

// // /**
// //  * Add CORS headers to response
// //  */
// // function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
// //   const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

// //   response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
// //   response.headers.set('Access-Control-Allow-Credentials', 'true');
// //   response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
// //   response.headers.set(
// //     'Access-Control-Allow-Headers',
// //     'Content-Type, Authorization, X-Requested-With, Accept, Origin'
// //   );
// //   response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

// //   return response;
// // }

// // /**
// //  * Create a Supabase client that uses JWT from Authorization header
// //  */
// // function createClientFromToken(token: string) {
// //   return createServerClient<Database>(
// //     process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
// //     {
// //       cookies: {
// //         getAll() {
// //           return [];
// //         },
// //         setAll() {},
// //       },
// //       global: {
// //         headers: {
// //           Authorization: `Bearer ${token}`,
// //         },
// //       },
// //     }
// //   );
// // }

// // /**
// //  * Verify JWT token from Authorization header
// //  */
// // export async function verifyToken(req: NextRequest): Promise<AuthUser | null> {
// //   try {
// //     const authHeader = 
// //       req.headers.get('authorization') || 
// //       req.headers.get('Authorization');
    
// //     if (!authHeader) {
// //       console.log('🔴 [Auth] No authorization header found');
// //       return null;
// //     }

// //     if (!authHeader.startsWith('Bearer ')) {
// //       console.log('🔴 [Auth] Invalid authorization format');
// //       return null;
// //     }

// //     const token = authHeader.substring(7).trim();
    
// //     if (!token) {
// //       console.log('🔴 [Auth] Token is empty');
// //       return null;
// //     }

// //     // Create Supabase client with the token
// //     const supabase = createClientFromToken(token);
    
// //     // Verify token by getting user
// //     const { data: { user }, error } = await supabase.auth.getUser();
    
// //     if (error) {
// //       console.error('🔴 [Auth] Token verification failed:', error.message);
// //       return null;
// //     }

// //     if (!user) {
// //       console.error('🔴 [Auth] No user found for token');
// //       return null;
// //     }

// //     console.log('✅ [Auth] Token verified for:', user.email);

// //     return {
// //       id: user.id,
// //       email: user.email!,
// //       fullName: user.user_metadata?.full_name,
// //     };
// //   } catch (error: any) {
// //     console.error('🔴 [Auth] Verification error:', error.message);
// //     return null;
// //   }
// // }

// // /**
// //  * Middleware wrapper that requires authentication AND adds CORS
// //  * This is your ONE-STOP solution for all API routes
// //  */
// // export function withAuth(
// //   handler: (req: NextRequest, user: AuthUser, ...args: any[]) => Promise<NextResponse>
// // ) {
// //   return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
// //     const origin = req.headers.get('origin');
    
// //     // Handle OPTIONS preflight request FIRST (before auth check)
// //     if (req.method === 'OPTIONS') {
// //       console.log('✨ [CORS] Handling OPTIONS preflight request');
// //       const response = new NextResponse(null, { status: 204 });
// //       return addCorsHeaders(response, origin);
// //     }
    
// //     console.log(`🔍 [Auth] ${req.method} ${req.url}`);
    
// //     const user = await verifyToken(req);
    
// //     if (!user) {
// //       console.error('🔴 [Auth] Authentication failed - returning 401');
// //       const response = NextResponse.json(
// //         { error: 'Unauthorized - Invalid or missing token' },
// //         { status: 401 }
// //       );
// //       return addCorsHeaders(response, origin);
// //     }
    
// //     console.log('✅ [Auth] Authenticated:', user.email);
    
// //     try {
// //       // Call the actual handler
// //       const response = await handler(req, user, ...args);
      
// //       // Add CORS headers to successful response
// //       return addCorsHeaders(response, origin);
// //     } catch (error: any) {
// //       console.error('🔴 [Handler Error]:', error);
// //       const errorResponse = NextResponse.json(
// //         { error: error.message || 'Internal server error' },
// //         { status: 500 }
// //       );
// //       return addCorsHeaders(errorResponse, origin);
// //     }
// //   };
// // }

// // /**
// //  * Public endpoint wrapper (no auth required, just CORS)
// //  * Use for login, signup, public data, etc.
// //  */
// // export function withCors(
// //   handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
// // ) {
// //   return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
// //     const origin = req.headers.get('origin');
    
// //     // Handle OPTIONS preflight
// //     if (req.method === 'OPTIONS') {
// //       const response = new NextResponse(null, { status: 204 });
// //       return addCorsHeaders(response, origin);
// //     }
    
// //     try {
// //       const response = await handler(req, ...args);
// //       return addCorsHeaders(response, origin);
// //     } catch (error: any) {
// //       console.error('🔴 [Handler Error]:', error);
// //       const errorResponse = NextResponse.json(
// //         { error: error.message || 'Internal server error' },
// //         { status: 500 }
// //       );
// //       return addCorsHeaders(errorResponse, origin);
// //     }
// //   };
// // }

// // /**
// //  * Get authenticated Supabase client from request
// //  */
// // export async function getAuthenticatedClient(req: NextRequest) {
// //   const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  
// //   if (!authHeader?.startsWith('Bearer ')) {
// //     throw new Error('No valid authorization header');
// //   }
  
// //   const token = authHeader.substring(7).trim();
// //   return createClientFromToken(token);
// // }

// // /**
// //  * Verify website ownership
// //  */
// // export async function verifyWebsiteOwnership(
// //   req: NextRequest,
// //   websiteId: string,
// //   userId: string
// // ): Promise<{ success: boolean; website?: any; error?: string }> {
// //   try {
// //     const supabase = await getAuthenticatedClient(req);
    
// //     const { data: website, error } = await supabase
// //       .from('websites')
// //       .select('*')
// //       .eq('id', websiteId)
// //       .eq('user_id', userId)
// //       .single();

// //     if (error || !website) {
// //       return {
// //         success: false,
// //         error: 'Website not found or access denied',
// //       };
// //     }

// //     return {
// //       success: true,
// //       website,
// //     };
// //   } catch (error: any) {
// //     return {
// //       success: false,
// //       error: error.message || 'Failed to verify website ownership',
// //     };
// //   }
// // }

// // /**
// //  * Extract pagination params from request
// //  */
// // export function getPaginationParams(req: NextRequest) {
// //   const { searchParams } = new URL(req.url);
  
// //   return {
// //     limit: parseInt(searchParams.get('limit') || '100'),
// //     offset: parseInt(searchParams.get('offset') || '0'),
// //     page: parseInt(searchParams.get('page') || '1'),
// //   };
// // }

// // /**
// //  * Build pagination response
// //  */
// // export function buildPaginationResponse(
// //   count: number,
// //   limit: number,
// //   offset: number
// // ) {
// //   const totalPages = Math.ceil(count / limit);
// //   const currentPage = Math.floor(offset / limit) + 1;
  
// //   return {
// //     total: count,
// //     limit,
// //     offset,
// //     currentPage,
// //     totalPages,
// //     hasMore: count > offset + limit,
// //     hasPrevious: offset > 0,
// //   };
// // }


// // lib/auth-middleware.ts - FIXED CORS Configuration

// import { NextRequest, NextResponse } from 'next/server';
// import { createServerClient } from '@supabase/ssr';
// import type { Database } from '@/types/database';

// export interface AuthUser {
//   id: string;
//   email: string;
//   fullName?: string;
// }

// /**
//  * CORS Configuration - FIXED
//  * The issue was that the origin header value didn't match exactly
//  */
// const ALLOWED_ORIGINS = [
//   'http://localhost:5173',
//   'http://localhost:3000',
//   'http://localhost:8080',
//   'http://localhost:4173',
//   'https://notifications-app-seven.vercel.app',
//   'https://sigme-backend-fkde.vercel.app',
//   // Add your production URLs
//   process.env.NEXT_PUBLIC_APP_URL,
//   process.env.NEXT_PUBLIC_FRONTEND_URL,
// ].filter(Boolean) as string[];

// console.log('🔧 [CORS] Configured allowed origins:', ALLOWED_ORIGINS);

// /**
//  * Add CORS headers to response - FIXED
//  */
// function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
//   // Check if origin is in allowed list
//   const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  
//   if (isAllowed) {
//     // ✅ Use the EXACT origin from the request if it's allowed
//     response.headers.set('Access-Control-Allow-Origin', origin);
//   } else if (ALLOWED_ORIGINS.length > 0) {
//     // ✅ Fallback to first allowed origin
//     response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
//   } else {
//     // ✅ Development fallback - allow all (use with caution!)
//     response.headers.set('Access-Control-Allow-Origin', '*');
//   }
  
//   response.headers.set('Access-Control-Allow-Credentials', 'true');
//   response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
//   response.headers.set(
//     'Access-Control-Allow-Headers',
//     'Content-Type, Authorization, X-Requested-With, Accept, Origin'
//   );
//   response.headers.set('Access-Control-Max-Age', '86400');

//   return response;
// }

// /**
//  * Create a Supabase client that uses JWT from Authorization header
//  */
// function createClientFromToken(token: string) {
//   return createServerClient<Database>(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return [];
//         },
//         setAll() {},
//       },
//       global: {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       },
//     }
//   );
// }

// /**
//  * Verify JWT token from Authorization header
//  */
// export async function verifyToken(req: NextRequest): Promise<AuthUser | null> {
//   try {
//     const authHeader = 
//       req.headers.get('authorization') || 
//       req.headers.get('Authorization');
    
//     if (!authHeader) {
//       console.log('🔴 [Auth] No authorization header found');
//       return null;
//     }

//     if (!authHeader.startsWith('Bearer ')) {
//       console.log('🔴 [Auth] Invalid authorization format');
//       return null;
//     }

//     const token = authHeader.substring(7).trim();
    
//     if (!token) {
//       console.log('🔴 [Auth] Token is empty');
//       return null;
//     }

//     const supabase = createClientFromToken(token);
//     const { data: { user }, error } = await supabase.auth.getUser();
    
//     if (error) {
//       console.error('🔴 [Auth] Token verification failed:', error.message);
//       return null;
//     }

//     if (!user) {
//       console.error('🔴 [Auth] No user found for token');
//       return null;
//     }

//     console.log('✅ [Auth] Token verified for:', user.email);

//     return {
//       id: user.id,
//       email: user.email!,
//       fullName: user.user_metadata?.full_name,
//     };
//   } catch (error: any) {
//     console.error('🔴 [Auth] Verification error:', error.message);
//     return null;
//   }
// }

// /**
//  * Middleware wrapper with authentication AND CORS
//  */
// export function withAuth(
//   handler: (req: NextRequest, user: AuthUser, ...args: any[]) => Promise<NextResponse>
// ) {
//   return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
//     const origin = req.headers.get('origin');
    
//     console.log('🌐 [CORS] Request from origin:', origin);
//     console.log('🔍 [Auth] ${req.method} ${req.url}');
    
//     // Handle OPTIONS preflight FIRST
//     if (req.method === 'OPTIONS') {
//       console.log('✨ [CORS] Handling OPTIONS preflight');
//       const response = new NextResponse(null, { status: 204 });
//       return addCorsHeaders(response, origin);
//     }
    
//     // Verify authentication
//     const user = await verifyToken(req);
    
//     if (!user) {
//       console.error('🔴 [Auth] Authentication failed');
//       const response = NextResponse.json(
//         { error: 'Unauthorized - Invalid or missing token' },
//         { status: 401 }
//       );
//       return addCorsHeaders(response, origin);
//     }
    
//     console.log('✅ [Auth] Authenticated:', user.email);
    
//     try {
//       const response = await handler(req, user, ...args);
//       return addCorsHeaders(response, origin);
//     } catch (error: any) {
//       console.error('🔴 [Handler Error]:', error);
//       const errorResponse = NextResponse.json(
//         { error: error.message || 'Internal server error' },
//         { status: 500 }
//       );
//       return addCorsHeaders(errorResponse, origin);
//     }
//   };
// }

// /**
//  * Public endpoint wrapper (no auth, just CORS)
//  */
// export function withCors(
//   handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
// ) {
//   return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
//     const origin = req.headers.get('origin');
    
//     console.log('🌐 [CORS] Public endpoint from origin:', origin);
    
//     if (req.method === 'OPTIONS') {
//       console.log('✨ [CORS] Handling OPTIONS preflight');
//       const response = new NextResponse(null, { status: 204 });
//       return addCorsHeaders(response, origin);
//     }
    
//     try {
//       const response = await handler(req, ...args);
//       return addCorsHeaders(response, origin);
//     } catch (error: any) {
//       console.error('🔴 [Handler Error]:', error);
//       const errorResponse = NextResponse.json(
//         { error: error.message || 'Internal server error' },
//         { status: 500 }
//       );
//       return addCorsHeaders(errorResponse, origin);
//     }
//   };
// }

// /**
//  * Get authenticated Supabase client
//  */
// export async function getAuthenticatedClient(req: NextRequest) {
//   const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  
//   if (!authHeader?.startsWith('Bearer ')) {
//     throw new Error('No valid authorization header');
//   }
  
//   const token = authHeader.substring(7).trim();
//   return createClientFromToken(token);
// }

// /**
//  * Verify website ownership
//  */
// export async function verifyWebsiteOwnership(
//   req: NextRequest,
//   websiteId: string,
//   userId: string
// ): Promise<{ success: boolean; website?: any; error?: string }> {
//   try {
//     const supabase = await getAuthenticatedClient(req);
    
//     const { data: website, error } = await supabase
//       .from('websites')
//       .select('*')
//       .eq('id', websiteId)
//       .eq('user_id', userId)
//       .single();

//     if (error || !website) {
//       return {
//         success: false,
//         error: 'Website not found or access denied',
//       };
//     }

//     return {
//       success: true,
//       website,
//     };
//   } catch (error: any) {
//     return {
//       success: false,
//       error: error.message || 'Failed to verify website ownership',
//     };
//   }
// }

// /**
//  * Extract pagination params
//  */
// export function getPaginationParams(req: NextRequest) {
//   const { searchParams } = new URL(req.url);
  
//   return {
//     limit: parseInt(searchParams.get('limit') || '100'),
//     offset: parseInt(searchParams.get('offset') || '0'),
//     page: parseInt(searchParams.get('page') || '1'),
//   };
// }

// /**
//  * Build pagination response
//  */
// export function buildPaginationResponse(
//   count: number,
//   limit: number,
//   offset: number
// ) {
//   const totalPages = Math.ceil(count / limit);
//   const currentPage = Math.floor(offset / limit) + 1;
  
//   return {
//     total: count,
//     limit,
//     offset,
//     currentPage,
//     totalPages,
//     hasMore: count > offset + limit,
//     hasPrevious: offset > 0,
//   };
// }

// lib/auth-middleware.ts - UNIVERSAL CORS for Public API

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
}

/**
 * CORS Configuration
 * - Dashboard origins: Restricted to your frontend only
 * - Public API origins: Allow ANY origin (for universal script usage)
 */
const DASHBOARD_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://notifications-app-seven.vercel.app',
  process.env.NEXT_PUBLIC_FRONTEND_URL,
].filter(Boolean) as string[];

console.log('🔧 [CORS] Dashboard origins:', DASHBOARD_ORIGINS);

/**
 * Add CORS headers - UNIVERSAL for public endpoints
 */
function addPublicCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  // Allow ANY origin for public endpoints
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin'
  );
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Access-Control-Allow-Credentials', 'false'); // No credentials for public

  return response;
}

/**
 * Add CORS headers - RESTRICTED for authenticated endpoints
 */
function addAuthCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  // Only allow dashboard origins
  const isAllowed = origin && DASHBOARD_ORIGINS.includes(origin);
  
  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  } else if (DASHBOARD_ORIGINS.length > 0) {
    response.headers.set('Access-Control-Allow-Origin', DASHBOARD_ORIGINS[0]);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin'
  );
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

/**
 * Create a Supabase client with JWT token
 */
function createClientFromToken(token: string) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}

/**
 * Verify JWT token
 */
export async function verifyToken(req: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = 
      req.headers.get('authorization') || 
      req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7).trim();
    if (!token) return null;

    const supabase = createClientFromToken(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error('🔴 [Auth] Token verification failed:', error?.message);
      return null;
    }

    console.log('✅ [Auth] Token verified for:', user.email);

    return {
      id: user.id,
      email: user.email!,
      fullName: user.user_metadata?.full_name,
    };
  } catch (error: any) {
    console.error('🔴 [Auth] Verification error:', error.message);
    return null;
  }
}

/**
 * Authenticated endpoint wrapper (for dashboard API)
 * Uses RESTRICTED CORS - only allows your frontend
 */
export function withAuth(
  handler: (req: NextRequest, user: AuthUser, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const origin = req.headers.get('origin');
    
    console.log(`🔍 [Auth] ${req.method} ${req.url} from ${origin}`);
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      console.log('✨ [CORS] Auth endpoint OPTIONS');
      const response = new NextResponse(null, { status: 204 });
      return addAuthCorsHeaders(response, origin);
    }
    
    // Verify authentication
    const user = await verifyToken(req);
    
    if (!user) {
      console.error('🔴 [Auth] Authentication failed');
      const response = NextResponse.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      );
      return addAuthCorsHeaders(response, origin);
    }
    
    console.log('✅ [Auth] Authenticated:', user.email);
    
    try {
      const response = await handler(req, user, ...args);
      return addAuthCorsHeaders(response, origin);
    } catch (error: any) {
      console.error('🔴 [Handler Error]:', error);
      const errorResponse = NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
      return addAuthCorsHeaders(errorResponse, origin);
    }
  };
}

/**
 * Public endpoint wrapper (for client websites using your script)
 * Uses UNIVERSAL CORS - allows ANY origin
 * 
 * Use this for:
 * - /api/websites/detect
 * - /api/subscribers/register
 * - Any other public-facing API
 */
export function withPublicCors(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const origin = req.headers.get('origin');
    
    console.log(`🌐 [Public] ${req.method} ${req.url} from ${origin}`);
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      console.log('✨ [CORS] Public endpoint OPTIONS');
      const response = new NextResponse(null, { status: 204 });
      return addPublicCorsHeaders(response, origin);
    }
    
    try {
      const response = await handler(req, ...args);
      return addPublicCorsHeaders(response, origin);
    } catch (error: any) {
      console.error('🔴 [Handler Error]:', error);
      const errorResponse = NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
      return addPublicCorsHeaders(errorResponse, origin);
    }
  };
}

/**
 * Legacy: withCors (redirect to withPublicCors)
 * Keeping for backward compatibility
 */
export const withCors = withPublicCors;

/**
 * Get authenticated Supabase client
 */
export async function getAuthenticatedClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No valid authorization header');
  }
  
  const token = authHeader.substring(7).trim();
  return createClientFromToken(token);
}

/**
 * Verify website ownership
 */
export async function verifyWebsiteOwnership(
  req: NextRequest,
  websiteId: string,
  userId: string
): Promise<{ success: boolean; website?: any; error?: string }> {
  try {
    const supabase = await getAuthenticatedClient(req);
    
    const { data: website, error } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', userId)
      .single();

    if (error || !website) {
      return {
        success: false,
        error: 'Website not found or access denied',
      };
    }

    return {
      success: true,
      website,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to verify website ownership',
    };
  }
}

/**
 * Extract pagination params
 */
export function getPaginationParams(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  return {
    limit: parseInt(searchParams.get('limit') || '100'),
    offset: parseInt(searchParams.get('offset') || '0'),
    page: parseInt(searchParams.get('page') || '1'),
  };
}

/**
 * Build pagination response
 */
export function buildPaginationResponse(
  count: number,
  limit: number,
  offset: number
) {
  const totalPages = Math.ceil(count / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  
  return {
    total: count,
    limit,
    offset,
    currentPage,
    totalPages,
    hasMore: count > offset + limit,
    hasPrevious: offset > 0,
  };
}