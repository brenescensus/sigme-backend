// app/api/websites/[id]/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthUser } from '@/lib/auth-middleware';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleGetAnalytics(
  req: NextRequest,
  user: AuthUser,
  context: { params: Promise<{ id: string }> }
) {
  console.log('[Analytics] Handler started');
  console.log(' [Analytics] User:', user.email);
  
  try {
    // Await params in Next.js 15
    const { id: websiteId } = await context.params;
    console.log(' [Analytics] Website ID:', websiteId);
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '7d';
    console.log('[Analytics] Period:', period);

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    console.log('[Analytics] Date range:', {
      from: startDate.toISOString(),
      to: now.toISOString()
    });

    // Verify website ownership
    console.log(' [Analytics] Verifying website ownership...');
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (websiteError) {
      console.error(' [Analytics] Website query error:', websiteError);
      return NextResponse.json(
        { success: false, error: 'Database error: ' + websiteError.message },
        { status: 500 }
      );
    }

    if (!website) {
      console.error(' [Analytics] Website not found or access denied');
      return NextResponse.json(
        { success: false, error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    console.log(' [Analytics] Website verified:', website.name);

    // Get total subscribers
    console.log(' [Analytics] Fetching subscriber counts...');
    const { count: totalSubscribers, error: subCountError } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('website_id', websiteId);

    if (subCountError) {
      console.error(' [Analytics] Subscriber count error:', subCountError);
    }

    // Get active subscribers
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeSubscribers } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('website_id', websiteId)
      .eq('status', 'active')
      .gte('last_seen_at', thirtyDaysAgo.toISOString());

    console.log(' [Analytics] Subscribers - Total:', totalSubscribers, 'Active:', activeSubscribers);

    // Get notification logs
    console.log(' [Analytics] Fetching notification logs...');
    const { data: logs, error: logsError } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('website_id', websiteId)
      .gte('created_at', startDate.toISOString());

    if (logsError) {
      console.error(' [Analytics] Logs error:', logsError);
    } else {
      console.log(' [Analytics] Found', logs?.length || 0, 'notification logs');
    }

    // Get click events
    console.log(' [Analytics] Fetching click events...');
    const { data: clickEvents, error: clickError } = await supabase
      .from('subscriber_events')
      .select('*')
      .eq('website_id', websiteId)
      .eq('event_name', 'notification_clicked')
      .gte('created_at', startDate.toISOString());

    if (clickError) {
      console.error(' [Analytics] Click events error:', clickError);
    } else {
      console.log(' [Analytics] Found', clickEvents?.length || 0, 'click events');
    }

    // Calculate metrics
    const totalNotificationsSent = logs?.length || 0;
    const totalDelivered = logs?.filter(l => l.delivered_at || l.status === 'delivered').length || 0;
    const totalFailed = logs?.filter(l => l.status === 'failed').length || 0;
    const totalClicked = clickEvents?.length || 0;

    const deliveryRate = totalNotificationsSent > 0 
      ? (totalDelivered / totalNotificationsSent) * 100 
      : 0;

    const clickThroughRate = totalNotificationsSent > 0 
      ? (totalClicked / totalNotificationsSent) * 100
      : 0;

    // Get new subscribers
    const { data: newSubscribers } = await supabase
      .from('subscribers')
      .select('created_at')
      .eq('website_id', websiteId)
      .gte('created_at', startDate.toISOString());

    const analyticsData = {
      total_subscribers: totalSubscribers || 0,
      active_subscribers: activeSubscribers || 0,
      new_subscribers: newSubscribers?.length || 0,
      total_sent: totalNotificationsSent,
      total_delivered: totalDelivered,
      total_clicked: totalClicked,
      total_failed: totalFailed,
      delivery_rate: parseFloat(deliveryRate.toFixed(2)),
      click_through_rate: parseFloat(clickThroughRate.toFixed(2)),
      period
    };

    console.log(' [Analytics] Returning analytics:', analyticsData);

    return NextResponse.json({
      success: true,
      analytics: analyticsData
    });

  } catch (error: any) {
    console.error(' [Analytics] Fatal error:', error);
    console.error(' [Analytics] Stack:', error.stack);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch analytics',
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetAnalytics);