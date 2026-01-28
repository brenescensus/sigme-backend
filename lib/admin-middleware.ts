// lib/admin-middleware.ts - Token-based Super Admin Authentication

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export interface AdminAuthUser {
  id: string;
  email: string;
  role: string;
  fullName?: string;
}

/**
 * Create a Supabase client with JWT token (no cookies)
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
 * Create a Supabase admin client with service role key
 */
function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}

/**
 * Verify JWT token and check role
 */
async function verifyAdminToken(req: NextRequest): Promise<AdminAuthUser | null> {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(' [Admin Auth] No authorization header');
      return null;
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      console.error(' [Admin Auth] Empty token');
      return null;
    }

    // Verify token with Supabase
    const supabase = createClientFromToken(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error(' [Admin Auth] Token verification failed:', error?.message);
      return null;
    }

    // Get role from user metadata
    const role = user.user_metadata?.role || 'user';
    
    console.log(' [Admin Auth] User verified:', {
      email: user.email,
      role,
      userId: user.id,
    });

    return {
      id: user.id,
      email: user.email!,
      role,
      fullName: user.user_metadata?.full_name,
    };
  } catch (error: any) {
    console.error(' [Admin Auth] Verification error:', error.message);
    return null;
  }
}

/**
 * Require Super Admin role
 */
export async function requireSuperAdmin(req: NextRequest) {
  const user = await verifyAdminToken(req);

  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      ),
      user: null,
    };
  }

  if (user.role !== 'super_admin') {
    console.error(' [Admin Auth] Super admin required, got:', user.role);
    return {
      error: NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      ),
      user: null,
    };
  }

  console.log(' [Admin Auth] Super admin access granted:', user.email);
  
  return {
    user,
    error: null,
  };
}

/**
 * Require Admin role (admin OR super_admin)
 */
export async function requireAdmin(req: NextRequest) {
  const user = await verifyAdminToken(req);

  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      ),
      user: null,
    };
  }

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    console.error(' [Admin Auth] Admin required, got:', user.role);
    return {
      error: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ),
      user: null,
    };
  }

  console.log(' [Admin Auth] Admin access granted:', user.email);
  
  return {
    user,
    error: null,
  };
}

/**
 * Add CORS headers for admin endpoints
 * Restricts to dashboard origins only
 */
function addAdminCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  const DASHBOARD_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'https://notifications-app-seven.vercel.app',
    process.env.NEXT_PUBLIC_FRONTEND_URL,
  ].filter(Boolean) as string[];

  const isAllowed = origin && DASHBOARD_ORIGINS.includes(origin);
  
  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (DASHBOARD_ORIGINS.length > 0) {
    response.headers.set('Access-Control-Allow-Origin', DASHBOARD_ORIGINS[0]);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin'
  );
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}

/**
 * Wrapper for super admin endpoints
 * Handles auth, CORS, and error responses
 */
export function withSuperAdmin(
  handler: (req: NextRequest, user: AdminAuthUser, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const origin = req.headers.get('origin');
    
    console.log(`🛡️ [Super Admin] ${req.method} ${req.url} from ${origin}`);
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      return addAdminCorsHeaders(response, origin);
    }
    
    // Verify super admin
    const auth = await requireSuperAdmin(req);
    if (auth.error) {
      return addAdminCorsHeaders(auth.error, origin);
    }
    
    try {
      const response = await handler(req, auth.user!, ...args);
      return addAdminCorsHeaders(response, origin);
    } catch (error: any) {
      console.error(' [Super Admin] Handler error:', error);
      const errorResponse = NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
      return addAdminCorsHeaders(errorResponse, origin);
    }
  };
}

/**
 * Wrapper for admin endpoints (admin OR super_admin)
 * Handles auth, CORS, and error responses
 */
export function withAdmin(
  handler: (req: NextRequest, user: AdminAuthUser, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const origin = req.headers.get('origin');
    
    console.log(`🛡️ [Admin] ${req.method} ${req.url} from ${origin}`);
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      return addAdminCorsHeaders(response, origin);
    }
    
    // Verify admin
    const auth = await requireAdmin(req);
    if (auth.error) {
      return addAdminCorsHeaders(auth.error, origin);
    }
    
    try {
      const response = await handler(req, auth.user!, ...args);
      return addAdminCorsHeaders(response, origin);
    } catch (error: any) {
      console.error(' [Admin] Handler error:', error);
      const errorResponse = NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
      return addAdminCorsHeaders(errorResponse, origin);
    }
  };
}

/**
 * Log admin activity to database
 */
export async function logAdminActivity(
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: any,
  ipAddress?: string
) {
  try {
    const supabase = createAdminClient();
    
    await supabase.from('admin_activity_log').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details ? JSON.stringify(details) : null,
      ip_address: ipAddress,
    });
    
    console.log(' [Activity Log]', {
      admin: adminId,
      action,
      target: targetType,
    });
  } catch (error: any) {
    console.error(' [Activity Log] Failed to log:', error.message);
    // Don't throw - logging failure shouldn't break the request
  }
}

/**
 * Get admin client with service role (for admin operations)
 */
export function getAdminClient() {
  return createAdminClient();
}

/**
 * Get user client with token (for user-scoped operations)
 */
export function getUserClient(token: string) {
  return createClientFromToken(token);
}