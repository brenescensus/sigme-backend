// app/api/affiliates/public/route.ts


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Add CORS headers for public endpoints
 */
function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

/**
 * GET /api/affiliates/public - Get program info
 */
export async function GET(req: NextRequest) {
  try {
    const { data: settings } = await supabase
      .from('affiliate_settings')
      .select('*')
      .single();

    // Get total affiliates and earnings (public stats)
    const { count: affiliateCount } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { data: stats } = await supabase
      .from('affiliates')
      .select('total_earnings')
      .eq('status', 'active');

    const totalPaid = stats?.reduce((sum, a) => sum + (a.total_earnings || 0), 0) || 0;

    const response = NextResponse.json({
      success: true,
      program: {
        enabled: settings?.program_enabled || false,
        commission_rate: settings?.default_commission_rate || 20,
        cookie_duration: settings?.cookie_duration || 30,
        min_payout: settings?.min_payout_amount || 50,
        recurring_commission: settings?.recurring_commission || true,
        stats: {
          active_affiliates: affiliateCount || 0,
          total_paid: totalPaid
        }
      }
    });

    return addCorsHeaders(response);

  } catch (error: any) {
    console.error('Get program info error:', error);
    const response = NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

/**
 * POST /api/affiliates/public - Track affiliate click
 * UPDATED: No cookie setting, returns click_id for client-side storage
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, referrer, landing_page } = body;
    
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    // Verify affiliate code exists and is active
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, status')
      .eq('affiliate_code', code)
      .eq('status', 'active')
      .single();

    if (affiliateError || !affiliate) {
      const response = NextResponse.json(
        { success: false, error: 'Invalid or inactive affiliate code' },
        { status: 404 }
      );
      return addCorsHeaders(response);
    }

    // Parse user agent for device info
    const deviceInfo = parseUserAgent(userAgent);

    // Insert click record
    const { data: click, error: clickError } = await supabase
      .from('affiliate_clicks')
      .insert({
        affiliate_id: affiliate.id,
        affiliate_code: code,
        ip_address: ip,
        user_agent: userAgent,
        referrer: referrer || null,
        landing_page: landing_page || '/',
        device_type: deviceInfo.device_type,
        browser: deviceInfo.browser,
        os: deviceInfo.os
      })
      .select()
      .single();

    if (clickError) throw clickError;

    // Return click_id for client to store in localStorage
    const response = NextResponse.json({
      success: true,
      click_id: click.id,
      affiliate_code: code,
      message: 'Click tracked - store affiliate_code in localStorage'
    });

    return addCorsHeaders(response);

  } catch (error: any) {
    console.error('Track click error:', error);
    const response = NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

/**
 * OPTIONS - Handle CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response);
}

// Helper function
function parseUserAgent(userAgent: string) {
  if (!userAgent) {
    return {
      device_type: 'Unknown',
      browser: 'Unknown',
      os: 'Unknown'
    };
  }

  let device_type = 'Desktop';
  if (/mobile/i.test(userAgent)) device_type = 'Mobile';
  else if (/tablet|ipad/i.test(userAgent)) device_type = 'Tablet';

  let browser = 'Unknown';
  if (/chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent)) browser = 'Safari';
  else if (/edge/i.test(userAgent)) browser = 'Edge';

  let os = 'Unknown';
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/mac/i.test(userAgent)) os = 'macOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/ios|iphone|ipad/i.test(userAgent)) os = 'iOS';

  return { device_type, browser, os };
}