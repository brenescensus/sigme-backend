// // // ============================================
// // // FILE: app/api/websites/[id]/analytics/route.ts
// // // FIXED: Proper async params handling for Next.js 15
// // // ============================================

// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@supabase/supabase-js';
// // import { withAuth, type AuthUser } from '@/lib/auth-middleware';
// // import type { Database } from '@/types/database';

// // const supabase = createClient<Database>(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // async function handleGetAnalytics(
// //   req: NextRequest,
// //   user: AuthUser,
// //   context: { params: Promise<{ id: string }> }
// // ) {
// //   try {
// //     //  FIX: Await params in Next.js 15
// //     const { id: websiteId } = await context.params;
    
// //     const { searchParams } = new URL(req.url);
// //     const period = searchParams.get('period') || '7d';

// //     console.log(`📊 [Analytics] Fetching for website: ${websiteId}, period: ${period}`);

// //     // Calculate date range
// //     const now = new Date();
// //     let startDate = new Date();
    
// //     switch (period) {
// //       case '24h':
// //         startDate.setHours(now.getHours() - 24);
// //         break;
// //       case '7d':
// //         startDate.setDate(now.getDate() - 7);
// //         break;
// //       case '30d':
// //         startDate.setDate(now.getDate() - 30);
// //         break;
// //       case '90d':
// //         startDate.setDate(now.getDate() - 90);
// //         break;
// //       default:
// //         startDate.setDate(now.getDate() - 7);
// //     }

// //     // Verify website ownership
// //     const { data: website, error: websiteError } = await supabase
// //       .from('websites')
// //       .select('*')
// //       .eq('id', websiteId)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (websiteError || !website) {
// //       console.error(' [Analytics] Website not found or access denied');
// //       return NextResponse.json(
// //         { success: false, error: 'Website not found or access denied' },
// //         { status: 404 }
// //       );
// //     }

// //     // Get total subscribers
// //     const { count: totalSubscribers } = await supabase
// //       .from('subscribers')
// //       .select('*', { count: 'exact', head: true })
// //       .eq('website_id', websiteId);

// //     // Get active subscribers (seen in last 30 days)
// //     const thirtyDaysAgo = new Date();
// //     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
// //     const { count: activeSubscribers } = await supabase
// //       .from('subscribers')
// //       .select('*', { count: 'exact', head: true })
// //       .eq('website_id', websiteId)
// //       .eq('status', 'active')
// //       .gte('last_seen_at', thirtyDaysAgo.toISOString());

// //     // Get notifications sent in period
// //     const { data: logs } = await supabase
// //       .from('notification_logs')
// //       .select('*')
// //       .eq('website_id', websiteId)
// //       .gte('created_at', startDate.toISOString());

// //     const totalNotificationsSent = logs?.length || 0;
// //     const clickedNotifications = logs?.filter(log => log.clicked_at).length || 0;
// //     const avgClickRate = totalNotificationsSent > 0 
// //       ? (clickedNotifications / totalNotificationsSent) * 100 
// //       : 0;

// //     // Calculate previous period for comparison
// //     const prevStartDate = new Date(startDate);
// //     const periodLength = now.getTime() - startDate.getTime();
// //     prevStartDate.setTime(prevStartDate.getTime() - periodLength);

// //     const { data: prevLogs } = await supabase
// //       .from('notification_logs')
// //       .select('*')
// //       .eq('website_id', websiteId)
// //       .gte('created_at', prevStartDate.toISOString())
// //       .lt('created_at', startDate.toISOString());

// //     const prevNotificationsSent = prevLogs?.length || 0;
// //     const notificationsChangePercent = prevNotificationsSent > 0
// //       ? ((totalNotificationsSent - prevNotificationsSent) / prevNotificationsSent) * 100
// //       : 0;

// //     // Get daily stats
// //     const dailyStatsMap = new Map<string, { new_subscribers: number; notifications_sent: number }>();
    
// //     // Initialize all days in period
// //     for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
// //       const dateKey = d.toISOString().split('T')[0];
// //       dailyStatsMap.set(dateKey, { new_subscribers: 0, notifications_sent: 0 });
// //     }

// //     // Count notifications per day
// //     logs?.forEach(log => {

// //       if (log.created_at) {
// //   const dateKey = log.created_at.split('T')[0];
// //       // const dateKey = log.created_at.split('T')[0];
// //       const stats = dailyStatsMap.get(dateKey);
// //       if (stats) {
// //         stats.notifications_sent++;
// //       }}
// //     });

// //     // Get subscribers created in period
// //     const { data: newSubscribers } = await supabase
// //       .from('subscribers')
// //       .select('created_at')
// //       .eq('website_id', websiteId)
// //       .gte('created_at', startDate.toISOString());

// //     // Count new subscribers per day
// //     newSubscribers?.forEach(sub => {
// //       if (sub.created_at) {
// //   const dateKey = sub.created_at.split('T')[0];
// //       // const dateKey = sub.created_at.split('T')[0];
// //       const stats = dailyStatsMap.get(dateKey);
// //       if (stats) {
// //         stats.new_subscribers++;
// //       }}
// //     });

// //     // Convert to array
// //     const daily_stats = Array.from(dailyStatsMap.entries()).map(([date, stats]) => ({
// //       date,
// //       ...stats
// //     }));

// //     console.log(' [Analytics] Returning data:', {
// //       subscribers: totalSubscribers,
// //       notifications: totalNotificationsSent,
// //       clickRate: avgClickRate.toFixed(2)
// //     });

// //     return NextResponse.json({
// //       success: true,
// //       analytics: {
// //         total_subscribers: totalSubscribers || 0,
// //         active_subscribers: activeSubscribers || 0,
// //         total_notifications_sent: totalNotificationsSent,
// //         avg_click_rate: avgClickRate,
// //         subscribers_change_percent: 0,
// //         notifications_change_percent: notificationsChangePercent,
// //         click_rate_change_percent: 0,
// //         daily_stats,
// //         period
// //       }
// //     });

// //   } catch (error: any) {
// //     console.error(' [Analytics] Error:', error);
// //     return NextResponse.json(
// //       { success: false, error: error.message || 'Failed to fetch analytics' },
// //       { status: 500 }
// //     );
// //   }
// // }

// // // app/api/websites/[id]/analytics/route.ts
// // // ... existing code ...

// // async function handleGetAnalytics(
// //   req: NextRequest,
// //   user: AuthUser,
// //   context: { params: Promise<{ id: string }> }
// // ) {
// //   try {
// //     const { id: websiteId } = await context.params;
// //     const { searchParams } = new URL(req.url);
// //     const period = searchParams.get('period') || '7d';

// //     console.log(`📊 [Analytics] Fetching for website: ${websiteId}, period: ${period}`);

// //     // Calculate date range
// //     const now = new Date();
// //     let startDate = new Date();
    
// //     switch (period) {
// //       case '24h':
// //         startDate.setHours(now.getHours() - 24);
// //         break;
// //       case '7d':
// //         startDate.setDate(now.getDate() - 7);
// //         break;
// //       case '30d':
// //         startDate.setDate(now.getDate() - 30);
// //         break;
// //       case '90d':
// //         startDate.setDate(now.getDate() - 90);
// //         break;
// //       default:
// //         startDate.setDate(now.getDate() - 7);
// //     }

// //     // ... existing website verification code ...

// //     // Get notification logs
// //     const { data: logs } = await supabase
// //       .from('notification_logs')
// //       .select('*')
// //       .eq('website_id', websiteId)
// //       .gte('created_at', startDate.toISOString());

// //     // 🔥 NEW: Get click events from subscriber_events
// //     const { data: clickEvents } = await supabase
// //       .from('subscriber_events')
// //       .select('*')
// //       .eq('website_id', websiteId)
// //       .eq('event_name', 'notification_clicked')
// //       .gte('created_at', startDate.toISOString());

// //     const totalNotificationsSent = logs?.length || 0;
// //     const totalClicked = clickEvents?.length || 0; // 🔥 Use actual click events
// //     const clickedNotifications = logs?.filter(log => log.clicked_at).length || 0;
    
// //     const avgClickRate = totalNotificationsSent > 0 
// //       ? (totalClicked / totalNotificationsSent) * 100  // 🔥 Use actual clicks
// //       : 0;

// //     // ... rest of existing code, but update to use totalClicked ...

// //     return NextResponse.json({
// //       success: true,
// //       analytics: {
// //         total_subscribers: totalSubscribers || 0,
// //         active_subscribers: activeSubscribers || 0,
// //         new_subscribers: newSubscribers?.length || 0,
// //         total_sent: totalNotificationsSent,
// //         total_delivered: logs?.filter(l => l.delivered_at || l.status === 'delivered').length || 0,
// //         total_clicked: totalClicked, // 🔥 Use actual click events
// //         total_failed: logs?.filter(l => l.status === 'failed').length || 0,
// //         delivery_rate: totalNotificationsSent > 0 
// //           ? ((logs?.filter(l => l.delivered_at || l.status === 'delivered').length || 0) / totalNotificationsSent * 100)
// //           : 0,
// //         click_through_rate: avgClickRate,
// //         subscribers_change_percent: 0,
// //         notifications_change_percent: notificationsChangePercent,
// //         click_rate_change_percent: 0,
// //         daily_stats,
// //         period
// //       }
// //     });

// //   } catch (error: any) {
// //     console.error(' [Analytics] Error:', error);
// //     return NextResponse.json(
// //       { success: false, error: error.message || 'Failed to fetch analytics' },
// //       { status: 500 }
// //     );
// //   }
// // }

// // export const GET = withAuth(handleGetAnalytics);
// // app/api/websites/[id]/analytics/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import { withAuth, type AuthUser } from '@/lib/auth-middleware';
// import type { Database } from '@/types/database';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// async function handleGetAnalytics(
//   req: NextRequest,
//   user: AuthUser,
//   context: { params: Promise<{ id: string }> }
// ) {
//   try {
//     //  Await params in Next.js 15
//     const { id: websiteId } = await context.params;
    
//     const { searchParams } = new URL(req.url);
//     const period = searchParams.get('period') || '7d';

//     console.log(`📊 [Analytics] Fetching for website: ${websiteId}, period: ${period}`);

//     // Calculate date range
//     const now = new Date();
//     let startDate = new Date();
    
//     switch (period) {
//       case '24h':
//         startDate.setHours(now.getHours() - 24);
//         break;
//       case '7d':
//         startDate.setDate(now.getDate() - 7);
//         break;
//       case '30d':
//         startDate.setDate(now.getDate() - 30);
//         break;
//       case '90d':
//         startDate.setDate(now.getDate() - 90);
//         break;
//       default:
//         startDate.setDate(now.getDate() - 7);
//     }

//     // Verify website ownership
//     const { data: website, error: websiteError } = await supabase
//       .from('websites')
//       .select('*')
//       .eq('id', websiteId)
//       .eq('user_id', user.id)
//       .single();

//     if (websiteError || !website) {
//       console.error(' [Analytics] Website not found or access denied');
//       return NextResponse.json(
//         { success: false, error: 'Website not found or access denied' },
//         { status: 404 }
//       );
//     }

//     // Get total subscribers
//     const { count: totalSubscribers } = await supabase
//       .from('subscribers')
//       .select('*', { count: 'exact', head: true })
//       .eq('website_id', websiteId);

//     // Get active subscribers (seen in last 30 days)
//     const thirtyDaysAgo = new Date();
//     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
//     const { count: activeSubscribers } = await supabase
//       .from('subscribers')
//       .select('*', { count: 'exact', head: true })
//       .eq('website_id', websiteId)
//       .eq('status', 'active')
//       .gte('last_seen_at', thirtyDaysAgo.toISOString());

//     // Get notification logs in period
//     const { data: logs } = await supabase
//       .from('notification_logs')
//       .select('*')
//       .eq('website_id', websiteId)
//       .gte('created_at', startDate.toISOString());

//     // 🔥 Get click events from subscriber_events table
//     const { data: clickEvents } = await supabase
//       .from('subscriber_events')
//       .select('*')
//       .eq('website_id', websiteId)
//       .eq('event_name', 'notification_clicked')
//       .gte('created_at', startDate.toISOString());

//     console.log('📊 [Analytics] Click events found:', clickEvents?.length || 0);

//     // Calculate metrics
//     const totalNotificationsSent = logs?.length || 0;
//     const totalDelivered = logs?.filter(l => l.delivered_at || l.status === 'delivered').length || 0;
//     const totalFailed = logs?.filter(l => l.status === 'failed').length || 0;
//     const totalClicked = clickEvents?.length || 0; // 🔥 Use actual click events

//     const deliveryRate = totalNotificationsSent > 0 
//       ? (totalDelivered / totalNotificationsSent) * 100 
//       : 0;

//     const clickThroughRate = totalNotificationsSent > 0 
//       ? (totalClicked / totalNotificationsSent) * 100  // 🔥 Use actual clicks
//       : 0;

//     // Calculate previous period for comparison
//     const prevStartDate = new Date(startDate);
//     const periodLength = now.getTime() - startDate.getTime();
//     prevStartDate.setTime(prevStartDate.getTime() - periodLength);

//     const { data: prevLogs } = await supabase
//       .from('notification_logs')
//       .select('*')
//       .eq('website_id', websiteId)
//       .gte('created_at', prevStartDate.toISOString())
//       .lt('created_at', startDate.toISOString());

//     const prevNotificationsSent = prevLogs?.length || 0;
//     const notificationsChangePercent = prevNotificationsSent > 0
//       ? ((totalNotificationsSent - prevNotificationsSent) / prevNotificationsSent) * 100
//       : 0;

//     // Get subscribers created in period
//     const { data: newSubscribers } = await supabase
//       .from('subscribers')
//       .select('created_at')
//       .eq('website_id', websiteId)
//       .gte('created_at', startDate.toISOString());

//     // Get daily stats
//     const dailyStatsMap = new Map<string, { new_subscribers: number; notifications_sent: number }>();
    
//     // Initialize all days in period
//     for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
//       const dateKey = d.toISOString().split('T')[0];
//       dailyStatsMap.set(dateKey, { new_subscribers: 0, notifications_sent: 0 });
//     }

//     // Count notifications per day
//     logs?.forEach(log => {
//       if (log.created_at) {
//         const dateKey = log.created_at.split('T')[0];
//         const stats = dailyStatsMap.get(dateKey);
//         if (stats) {
//           stats.notifications_sent++;
//         }
//       }
//     });

//     // Count new subscribers per day
//     newSubscribers?.forEach(sub => {
//       if (sub.created_at) {
//         const dateKey = sub.created_at.split('T')[0];
//         const stats = dailyStatsMap.get(dateKey);
//         if (stats) {
//           stats.new_subscribers++;
//         }
//       }
//     });

//     // Convert to array
//     const daily_stats = Array.from(dailyStatsMap.entries()).map(([date, stats]) => ({
//       date,
//       ...stats
//     }));

//     console.log(' [Analytics] Returning data:', {
//       subscribers: totalSubscribers,
//       notifications: totalNotificationsSent,
//       clicked: totalClicked,
//       clickRate: clickThroughRate.toFixed(2)
//     });

//     return NextResponse.json({
//       success: true,
//       analytics: {
//         total_subscribers: totalSubscribers || 0,
//         active_subscribers: activeSubscribers || 0,
//         new_subscribers: newSubscribers?.length || 0,
//         total_sent: totalNotificationsSent,
//         total_delivered: totalDelivered,
//         total_clicked: totalClicked, // 🔥 From subscriber_events
//         total_failed: totalFailed,
//         delivery_rate: parseFloat(deliveryRate.toFixed(2)),
//         click_through_rate: parseFloat(clickThroughRate.toFixed(2)), // 🔥 Based on actual clicks
//         subscribers_change_percent: 0,
//         notifications_change_percent: parseFloat(notificationsChangePercent.toFixed(2)),
//         click_rate_change_percent: 0,
//         daily_stats,
//         period
//       }
//     });

//   } catch (error: any) {
//     console.error(' [Analytics] Error:', error);
//     return NextResponse.json(
//       { success: false, error: error.message || 'Failed to fetch analytics' },
//       { status: 500 }
//     );
//   }
// }

// export const GET = withAuth(handleGetAnalytics);


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
  console.log('🚀 [Analytics] Handler started');
  console.log('👤 [Analytics] User:', user.email);
  
  try {
    // Await params in Next.js 15
    const { id: websiteId } = await context.params;
    console.log('🌐 [Analytics] Website ID:', websiteId);
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '7d';
    console.log('📅 [Analytics] Period:', period);

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

    console.log('📆 [Analytics] Date range:', {
      from: startDate.toISOString(),
      to: now.toISOString()
    });

    // Verify website ownership
    console.log('🔍 [Analytics] Verifying website ownership...');
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (websiteError) {
      console.error('❌ [Analytics] Website query error:', websiteError);
      return NextResponse.json(
        { success: false, error: 'Database error: ' + websiteError.message },
        { status: 500 }
      );
    }

    if (!website) {
      console.error('❌ [Analytics] Website not found or access denied');
      return NextResponse.json(
        { success: false, error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    console.log(' [Analytics] Website verified:', website.name);

    // Get total subscribers
    console.log('📊 [Analytics] Fetching subscriber counts...');
    const { count: totalSubscribers, error: subCountError } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('website_id', websiteId);

    if (subCountError) {
      console.error('❌ [Analytics] Subscriber count error:', subCountError);
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

    console.log('👥 [Analytics] Subscribers - Total:', totalSubscribers, 'Active:', activeSubscribers);

    // Get notification logs
    console.log('📝 [Analytics] Fetching notification logs...');
    const { data: logs, error: logsError } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('website_id', websiteId)
      .gte('created_at', startDate.toISOString());

    if (logsError) {
      console.error('❌ [Analytics] Logs error:', logsError);
    } else {
      console.log('📝 [Analytics] Found', logs?.length || 0, 'notification logs');
    }

    // Get click events
    console.log('🖱️ [Analytics] Fetching click events...');
    const { data: clickEvents, error: clickError } = await supabase
      .from('subscriber_events')
      .select('*')
      .eq('website_id', websiteId)
      .eq('event_name', 'notification_clicked')
      .gte('created_at', startDate.toISOString());

    if (clickError) {
      console.error('❌ [Analytics] Click events error:', clickError);
    } else {
      console.log('🖱️ [Analytics] Found', clickEvents?.length || 0, 'click events');
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