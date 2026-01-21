// // ============================================
// // PART 1: Campaign Delivery Status Checker
// // app/api/campaigns/[id]/delivery-status/route.ts
// // ============================================
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser, context: any) => {
//     try {
//       const params = await context.params;
//       const campaignId = params.id;
//       const supabase = await getAuthenticatedClient(req);

//       console.log('[Delivery Status] Checking campaign:', campaignId);

//       // Verify ownership
//       const { data: campaign, error: campaignError } = await supabase
//         .from('campaigns')
//         .select(`
//           id,
//           name,
//           status,
//           sent_at,
//           sent_count,
//           delivered_count,
//           clicked_count,
//           failed_count,
//           website:websites!inner(id, user_id)
//         `)
//         .eq('id', campaignId)
//         .eq('website.user_id', user.id)
//         .single();

//       if (campaignError || !campaign) {
//         return NextResponse.json(
//           { error: 'Campaign not found' },
//           { status: 404 }
//         );
//       }

//       // Get detailed delivery logs
//       const { data: logs, error: logsError } = await supabase
//         .from('notification_logs')
//         .select(`
//           id,
//           status,
//           created_at,
//           sent_at,
//           delivered_at,
//           clicked_at,
//           error_message,
//           subscriber:subscribers(
//             id,
//             device_type,
//             browser,
//             country
//           )
//         `)
//         .eq('campaign_id', campaignId)
//         .order('created_at', { ascending: false });

//       if (logsError) {
//         console.error('[Delivery Status] Logs error:', logsError);
//       }

//       // Calculate real-time stats
//       const totalSent = logs?.length || 0;
//       const pending = logs?.filter(l => 
//         l.status === 'pending' || 
//         l.status === 'queued'
//       ).length || 0;
//       const delivered = logs?.filter(l => 
//         l.delivered_at || 
//         l.status === 'delivered' || 
//         l.status === 'sent'
//       ).length || 0;
//       const failed = logs?.filter(l => 
//         l.status === 'failed'
//       ).length || 0;
//       const clicked = logs?.filter(l => l.clicked_at).length || 0;

//       // Calculate percentages
//       const deliveryRate = totalSent > 0 ? (delivered / totalSent * 100) : 0;
//       const failureRate = totalSent > 0 ? (failed / totalSent * 100) : 0;
//       const clickRate = totalSent > 0 ? (clicked / totalSent * 100) : 0;

//       // Group errors by type
//       const errorsByType = logs?.reduce((acc: any, log) => {
//         if (log.error_message && log.status === 'failed') {
//           const errorType = log.error_message.split(':')[0] || 'Unknown';
//           acc[errorType] = (acc[errorType] || 0) + 1;
//         }
//         return acc;
//       }, {}) || {};

//       // Delivery timeline (grouped by hour)
//       const deliveryTimeline = logs?.reduce((acc: any, log) => {
//         if (log.delivered_at) {
//           const hour = new Date(log.delivered_at).toISOString().slice(0, 13) + ':00';
//           acc[hour] = (acc[hour] || 0) + 1;
//         }
//         return acc;
//       }, {}) || {};

//       const deliveryStatus = {
//         campaign_id: campaign.id,
//         campaign_name: campaign.name,
//         campaign_status: campaign.status,
//         sent_at: campaign.sent_at,
        
//         // Counts
//         total_sent: totalSent,
//         pending,
//         delivered,
//         failed,
//         clicked,
        
//         // Rates
//         delivery_rate: parseFloat(deliveryRate.toFixed(2)),
//         failure_rate: parseFloat(failureRate.toFixed(2)),
//         click_rate: parseFloat(clickRate.toFixed(2)),
        
//         // Progress
//         progress_percentage: totalSent > 0 
//           ? parseFloat(((delivered + failed) / totalSent * 100).toFixed(2))
//           : 0,
        
//         // Status determination
//         is_delivering: pending > 0,
//         is_completed: pending === 0 && totalSent > 0,
//         has_failures: failed > 0,
        
//         // Detailed data
//         errors_by_type: errorsByType,
//         delivery_timeline: Object.entries(deliveryTimeline).map(([time, count]) => ({
//           time,
//           count,
//         })),
        
//         // Recent failures (last 10)
//         recent_failures: logs
//           ?.filter(l => l.status === 'failed')
//           .slice(0, 10)
//           .map(l => ({
//             id: l.id,
//             error: l.error_message,
//             created_at: l.created_at,
//             device: l.subscriber?.device_type,
//             browser: l.subscriber?.browser,
//           })) || [],
//       };

//       return NextResponse.json({
//         success: true,
//         delivery_status: deliveryStatus,
//       });

//     } catch (error: any) {
//       console.error('[Delivery Status] Error:', error);
//       return NextResponse.json(
//         { error: 'Failed to fetch delivery status', details: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );


// ============================================
// app/api/campaigns/[id]/delivery-status/route.ts
// Fixed to match actual database schema
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

export const GET = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const campaignId = params.id;
      const supabase = await getAuthenticatedClient(req);

      console.log('[Delivery Status] Checking campaign:', campaignId);

      // Verify ownership and get campaign data
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          status,
          sent_at,
          sent_count,
          delivered_count,
          clicked_count,
          failed_count,
          website:websites!inner(id, user_id)
        `)
        .eq('id', campaignId)
        .eq('website.user_id', user.id)
        .single();

      if (campaignError || !campaign) {
        console.error('[Delivery Status] Campaign error:', campaignError);
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }

      // Get detailed delivery logs
      const { data: logs, error: logsError } = await supabase
        .from('notification_logs')
        .select(`
          id,
          status,
          created_at,
          sent_at,
          delivered_at,
          clicked_at,
          error_message,
          platform,
          subscriber:subscribers(
            id,
            device_type,
            browser,
            country,
            os
          )
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (logsError) {
        console.error('[Delivery Status] Logs error:', logsError);
      }

      // Calculate real-time stats from logs
      const totalLogs = logs?.length || 0;
      
      // Count statuses based on actual log data
      const delivered = logs?.filter(l => 
        l.status === 'delivered' || 
        l.delivered_at != null
      ).length || 0;
      
      const failed = logs?.filter(l => 
        l.status === 'failed' && !l.delivered_at
      ).length || 0;
      
      const clicked = logs?.filter(l => l.clicked_at != null).length || 0;

      // Use campaign counts as source of truth
      const sentCount = campaign.sent_count || 0;
      const deliveredCount = campaign.delivered_count || 0;
      const failedCount = campaign.failed_count || 0;
      const clickedCount = campaign.clicked_count || 0;
      
      // Calculate pending (sent but not yet delivered or failed)
      const pending = sentCount - deliveredCount - failedCount;

      // Calculate percentages
      const deliveryRate = sentCount > 0 ? (deliveredCount / sentCount * 100) : 0;
      const failureRate = sentCount > 0 ? (failedCount / sentCount * 100) : 0;
      const clickRate = sentCount > 0 ? (clickedCount / sentCount * 100) : 0;

      // Group errors by type
      const errorsByType = logs?.reduce((acc: Record<string, number>, log) => {
        if (log.error_message && log.status === 'failed') {
          // Extract error type (first part before colon or first 50 chars)
          const errorType = log.error_message.includes(':')
            ? log.error_message.split(':')[0].trim()
            : log.error_message.substring(0, 50);
          acc[errorType] = (acc[errorType] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      // Delivery timeline (grouped by hour)
      const deliveryTimeline = logs?.reduce((acc: Record<string, number>, log) => {
        const timestamp = log.delivered_at || log.sent_at;
        if (timestamp) {
          const hour = new Date(timestamp).toISOString().slice(0, 13) + ':00';
          acc[hour] = (acc[hour] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      // Device breakdown
      const deviceBreakdown = logs?.reduce((acc: Record<string, number>, log) => {
        const device = log.subscriber?.device_type || 'Unknown';
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {}) || {};

      // Browser breakdown
      const browserBreakdown = logs?.reduce((acc: Record<string, number>, log) => {
        const browser = log.subscriber?.browser || 'Unknown';
        acc[browser] = (acc[browser] || 0) + 1;
        return acc;
      }, {}) || {};

      // Country breakdown
      const countryBreakdown = logs?.reduce((acc: Record<string, number>, log) => {
        const country = log.subscriber?.country || 'Unknown';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {}) || {};

      const deliveryStatus = {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        campaign_status: campaign.status,
        sent_at: campaign.sent_at,
        
        // Counts (from campaign table - source of truth)
        total_sent: sentCount,
        pending,
        delivered: deliveredCount,
        failed: failedCount,
        clicked: clickedCount,
        
        // Rates
        delivery_rate: parseFloat(deliveryRate.toFixed(2)),
        failure_rate: parseFloat(failureRate.toFixed(2)),
        click_rate: parseFloat(clickRate.toFixed(2)),
        
        // Progress
        progress_percentage: sentCount > 0 
          ? parseFloat(((deliveredCount + failedCount) / sentCount * 100).toFixed(2))
          : 0,
        
        // Status flags
        is_delivering: pending > 0,
        is_completed: pending === 0 && sentCount > 0,
        has_failures: failedCount > 0,
        
        // Detailed breakdowns
        errors_by_type: Object.entries(errorsByType)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => ({ type, count })),
        
        device_breakdown: Object.entries(deviceBreakdown)
          .sort((a, b) => b[1] - a[1])
          .map(([device, count]) => ({ device, count })),
        
        browser_breakdown: Object.entries(browserBreakdown)
          .sort((a, b) => b[1] - a[1])
          .map(([browser, count]) => ({ browser, count })),
        
        country_breakdown: Object.entries(countryBreakdown)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([country, count]) => ({ country, count })),
        
        delivery_timeline: Object.entries(deliveryTimeline)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([time, count]) => ({ time, count })),
        
        // Recent failures (last 20)
        recent_failures: logs
          ?.filter(l => l.status === 'failed')
          .slice(0, 20)
          .map(l => ({
            id: l.id,
            error: l.error_message,
            created_at: l.created_at,
            sent_at: l.sent_at,
            device: l.subscriber?.device_type,
            browser: l.subscriber?.browser,
            os: l.subscriber?.os,
            country: l.subscriber?.country,
          })) || [],
        
        // Recent successes (last 20)
        recent_successes: logs
          ?.filter(l => l.status === 'delivered' || l.delivered_at)
          .slice(0, 20)
          .map(l => ({
            id: l.id,
            delivered_at: l.delivered_at,
            clicked_at: l.clicked_at,
            device: l.subscriber?.device_type,
            browser: l.subscriber?.browser,
          })) || [],
      };

      return NextResponse.json({
        success: true,
        delivery_status: deliveryStatus,
      });

    } catch (error: any) {
      console.error('[Delivery Status] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch delivery status', details: error.message },
        { status: 500 }
      );
    }
  }
);