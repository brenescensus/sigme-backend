// // // ============================================
// // // app/api/campaigns/[id]/delivery-status/route.ts
// // // Fixed to match actual database schema
// // // ============================================
// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // export const GET = withAuth(
// //   async (req: NextRequest, user: AuthUser, context: any) => {
// //     try {
// //       const params = await context.params;
// //       const campaignId = params.id;
// //       const supabase = await getAuthenticatedClient(req);

// //       console.log('[Delivery Status] Checking campaign:', campaignId);

// //       // Verify ownership and get campaign data
// //       const { data: campaign, error: campaignError } = await supabase
// //         .from('campaigns')
// //         .select(`
// //           id,
// //           name,
// //           status,
// //           sent_at,
// //           sent_count,
// //           delivered_count,
// //           clicked_count,
// //           failed_count,
// //           website:websites!inner(id, user_id)
// //         `)
// //         .eq('id', campaignId)
// //         .eq('website.user_id', user.id)
// //         .single();

// //       if (campaignError || !campaign) {
// //         console.error('[Delivery Status] Campaign error:', campaignError);
// //         return NextResponse.json(
// //           { error: 'Campaign not found' },
// //           { status: 404 }
// //         );
// //       }

// //       // Get detailed delivery logs
// //       const { data: logs, error: logsError } = await supabase
// //         .from('notification_logs')
// //         .select(`
// //           id,
// //           status,
// //           created_at,
// //           sent_at,
// //           delivered_at,
// //           clicked_at,
// //           error_message,
// //           platform,
// //           subscriber:subscribers(
// //             id,
// //             device_type,
// //             browser,
// //             country,
// //             os
// //           )
// //         `)
// //         .eq('campaign_id', campaignId)
// //         .order('created_at', { ascending: false });

// //       if (logsError) {
// //         console.error('[Delivery Status] Logs error:', logsError);
// //       }

// //       // Calculate real-time stats from logs
// //       const totalLogs = logs?.length || 0;
      
// //       // Count statuses based on actual log data
// //       const delivered = logs?.filter(l => 
// //         l.status === 'delivered' || 
// //         l.delivered_at != null
// //       ).length || 0;
      
// //       const failed = logs?.filter(l => 
// //         l.status === 'failed' && !l.delivered_at
// //       ).length || 0;
      
// //       const clicked = logs?.filter(l => l.clicked_at != null).length || 0;

// //       // Use campaign counts as source of truth
// //       const sentCount = campaign.sent_count || 0;
// //       const deliveredCount = campaign.delivered_count || 0;
// //       const failedCount = campaign.failed_count || 0;
// //       const clickedCount = campaign.clicked_count || 0;
      
// //       // Calculate pending (sent but not yet delivered or failed)
// //       const pending = sentCount - deliveredCount - failedCount;

// //       // Calculate percentages
// //       const deliveryRate = sentCount > 0 ? (deliveredCount / sentCount * 100) : 0;
// //       const failureRate = sentCount > 0 ? (failedCount / sentCount * 100) : 0;
// //       const clickRate = sentCount > 0 ? (clickedCount / sentCount * 100) : 0;

// //       // Group errors by type
// //       const errorsByType = logs?.reduce((acc: Record<string, number>, log) => {
// //         if (log.error_message && log.status === 'failed') {
// //           // Extract error type (first part before colon or first 50 chars)
// //           const errorType = log.error_message.includes(':')
// //             ? log.error_message.split(':')[0].trim()
// //             : log.error_message.substring(0, 50);
// //           acc[errorType] = (acc[errorType] || 0) + 1;
// //         }
// //         return acc;
// //       }, {}) || {};

// //       // Delivery timeline (grouped by hour)
// //       const deliveryTimeline = logs?.reduce((acc: Record<string, number>, log) => {
// //         const timestamp = log.delivered_at || log.sent_at;
// //         if (timestamp) {
// //           const hour = new Date(timestamp).toISOString().slice(0, 13) + ':00';
// //           acc[hour] = (acc[hour] || 0) + 1;
// //         }
// //         return acc;
// //       }, {}) || {};

// //       // Device breakdown
// //       const deviceBreakdown = logs?.reduce((acc: Record<string, number>, log) => {
// //         const device = log.subscriber?.device_type || 'Unknown';
// //         acc[device] = (acc[device] || 0) + 1;
// //         return acc;
// //       }, {}) || {};

// //       // Browser breakdown
// //       const browserBreakdown = logs?.reduce((acc: Record<string, number>, log) => {
// //         const browser = log.subscriber?.browser || 'Unknown';
// //         acc[browser] = (acc[browser] || 0) + 1;
// //         return acc;
// //       }, {}) || {};

// //       // Country breakdown
// //       const countryBreakdown = logs?.reduce((acc: Record<string, number>, log) => {
// //         const country = log.subscriber?.country || 'Unknown';
// //         acc[country] = (acc[country] || 0) + 1;
// //         return acc;
// //       }, {}) || {};

// //       const deliveryStatus = {
// //         campaign_id: campaign.id,
// //         campaign_name: campaign.name,
// //         campaign_status: campaign.status,
// //         sent_at: campaign.sent_at,
        
// //         // Counts (from campaign table - source of truth)
// //         total_sent: sentCount,
// //         pending,
// //         delivered: deliveredCount,
// //         failed: failedCount,
// //         clicked: clickedCount,
        
// //         // Rates
// //         delivery_rate: parseFloat(deliveryRate.toFixed(2)),
// //         failure_rate: parseFloat(failureRate.toFixed(2)),
// //         click_rate: parseFloat(clickRate.toFixed(2)),
        
// //         // Progress
// //         progress_percentage: sentCount > 0 
// //           ? parseFloat(((deliveredCount + failedCount) / sentCount * 100).toFixed(2))
// //           : 0,
        
// //         // Status flags
// //         is_delivering: pending > 0,
// //         is_completed: pending === 0 && sentCount > 0,
// //         has_failures: failedCount > 0,
        
// //         // Detailed breakdowns
// //         errors_by_type: Object.entries(errorsByType)
// //           .sort((a, b) => b[1] - a[1])
// //           .map(([type, count]) => ({ type, count })),
        
// //         device_breakdown: Object.entries(deviceBreakdown)
// //           .sort((a, b) => b[1] - a[1])
// //           .map(([device, count]) => ({ device, count })),
        
// //         browser_breakdown: Object.entries(browserBreakdown)
// //           .sort((a, b) => b[1] - a[1])
// //           .map(([browser, count]) => ({ browser, count })),
        
// //         country_breakdown: Object.entries(countryBreakdown)
// //           .sort((a, b) => b[1] - a[1])
// //           .slice(0, 10)
// //           .map(([country, count]) => ({ country, count })),
        
// //         delivery_timeline: Object.entries(deliveryTimeline)
// //           .sort((a, b) => a[0].localeCompare(b[0]))
// //           .map(([time, count]) => ({ time, count })),
        
// //         // Recent failures (last 20)
// //         recent_failures: logs
// //           ?.filter(l => l.status === 'failed')
// //           .slice(0, 20)
// //           .map(l => ({
// //             id: l.id,
// //             error: l.error_message,
// //             created_at: l.created_at,
// //             sent_at: l.sent_at,
// //             device: l.subscriber?.device_type,
// //             browser: l.subscriber?.browser,
// //             os: l.subscriber?.os,
// //             country: l.subscriber?.country,
// //           })) || [],
        
// //         // Recent successes (last 20)
// //         recent_successes: logs
// //           ?.filter(l => l.status === 'delivered' || l.delivered_at)
// //           .slice(0, 20)
// //           .map(l => ({
// //             id: l.id,
// //             delivered_at: l.delivered_at,
// //             clicked_at: l.clicked_at,
// //             device: l.subscriber?.device_type,
// //             browser: l.subscriber?.browser,
// //           })) || [],
// //       };

// //       return NextResponse.json({
// //         success: true,
// //         delivery_status: deliveryStatus,
// //       });

// //     } catch (error: any) {
// //       console.error('[Delivery Status] Error:', error);
// //       return NextResponse.json(
// //         { error: 'Failed to fetch delivery status', details: error.message },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );













// // ============================================
// // app/api/campaigns/[id]/delivery-status/route.ts
// // FIXED: Proper count reconciliation with debugging and single source of truth
// // ============================================
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser, context: any) => {
//     try {
//       const params = await context.params;
//       const campaignId = params.id;
//       const supabase = await getAuthenticatedClient(req);

//       console.log('[Delivery Status]  Checking campaign:', campaignId);

//       // Verify ownership and get campaign data
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
//         console.error('[Delivery Status]  Campaign error:', campaignError);
//         return NextResponse.json(
//           { error: 'Campaign not found' },
//           { status: 404 }
//         );
//       }

//       console.log('[Delivery Status] Campaign found:', campaign.name);

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
//           platform,
//           subscriber:subscribers(
//             id,
//             device_type,
//             browser,
//             country,
//             os
//           )
//         `)
//         .eq('campaign_id', campaignId)
//         .order('created_at', { ascending: false });

//       if (logsError) {
//         console.error('[Delivery Status]  Logs error:', logsError);
//       }

//       // USE CAMPAIGN COUNTS AS SINGLE SOURCE OF TRUTH
//       const sentCount = campaign.sent_count || 0;
//       const deliveredCount = campaign.delivered_count || 0;
//       const failedCount = campaign.failed_count || 0;
//       const clickedCount = campaign.clicked_count || 0;
      
//       // Calculate pending (sent but not yet delivered or failed)
//       const pending = Math.max(0, sentCount - deliveredCount - failedCount);

//       console.log('[Delivery Status] 📈 Campaign Counts (Source of Truth):');
//       console.log('  - Sent:', sentCount);
//       console.log('  - Delivered:', deliveredCount);
//       console.log('  - Failed:', failedCount);
//       console.log('  - Clicked:', clickedCount);
//       console.log('  - Pending:', pending);

//       // COUNT LOGS FOR DEBUGGING ONLY (not used in response)
//       const totalLogs = logs?.length || 0;
      
//       const logsDelivered = logs?.filter(l => 
//         l.status === 'delivered' || 
//         l.delivered_at != null
//       ).length || 0;
      
//       const logsFailed = logs?.filter(l => 
//         l.status === 'failed' && !l.delivered_at
//       ).length || 0;
      
//       const logsClicked = logs?.filter(l => l.clicked_at != null).length || 0;

//       console.log('[Delivery Status] 📋 Log Counts (Debug Only):');
//       console.log('  - Total logs:', totalLogs);
//       console.log('  - Delivered logs:', logsDelivered);
//       console.log('  - Failed logs:', logsFailed);
//       console.log('  - Clicked logs:', logsClicked);

//       // DETECT DISCREPANCIES
//       const deliveredDiscrepancy = deliveredCount - logsDelivered;
//       const failedDiscrepancy = failedCount - logsFailed;
//       const clickedDiscrepancy = clickedCount - logsClicked;

//       if (deliveredDiscrepancy !== 0 || failedDiscrepancy !== 0) {
//         console.warn('[Delivery Status]  COUNT MISMATCH DETECTED:');
//         console.warn('  - Delivered difference:', deliveredDiscrepancy);
//         console.warn('  - Failed difference:', failedDiscrepancy);
//         console.warn('  - Clicked difference:', clickedDiscrepancy);
//         console.warn('  This usually means:');
//         console.warn('    1. Some deliveries tracked but logs are incomplete, OR');
//         console.warn('    2. Database function increment worked but log update failed');
//       } else {
//         console.log('[Delivery Status] Counts match perfectly!');
//       }

//       // Calculate percentages based on campaign counts
//       const deliveryRate = sentCount > 0 ? (deliveredCount / sentCount * 100) : 0;
//       const failureRate = sentCount > 0 ? (failedCount / sentCount * 100) : 0;
//       const clickRate = sentCount > 0 ? (clickedCount / sentCount * 100) : 0;

//       // Group errors by type
//       const errorsByType = logs?.reduce((acc: Record<string, number>, log) => {
//         if (log.error_message && log.status === 'failed') {
//           const errorType = log.error_message.includes(':')
//             ? log.error_message.split(':')[0].trim()
//             : log.error_message.substring(0, 50);
//           acc[errorType] = (acc[errorType] || 0) + 1;
//         }
//         return acc;
//       }, {}) || {};

//       // Delivery timeline (grouped by hour)
//       const deliveryTimeline = logs?.reduce((acc: Record<string, number>, log) => {
//         const timestamp = log.delivered_at || log.sent_at;
//         if (timestamp) {
//           const hour = new Date(timestamp).toISOString().slice(0, 13) + ':00';
//           acc[hour] = (acc[hour] || 0) + 1;
//         }
//         return acc;
//       }, {}) || {};

//       // Device breakdown
//       const deviceBreakdown = logs?.reduce((acc: Record<string, number>, log) => {
//         const device = log.subscriber?.device_type || 'Unknown';
//         acc[device] = (acc[device] || 0) + 1;
//         return acc;
//       }, {}) || {};

//       // Browser breakdown
//       const browserBreakdown = logs?.reduce((acc: Record<string, number>, log) => {
//         const browser = log.subscriber?.browser || 'Unknown';
//         acc[browser] = (acc[browser] || 0) + 1;
//         return acc;
//       }, {}) || {};

//       // Country breakdown
//       const countryBreakdown = logs?.reduce((acc: Record<string, number>, log) => {
//         const country = log.subscriber?.country || 'Unknown';
//         acc[country] = (acc[country] || 0) + 1;
//         return acc;
//       }, {}) || {};

//       // BUILD RESPONSE USING CAMPAIGN COUNTS (SOURCE OF TRUTH)
//       const deliveryStatus = {
//         campaign_id: campaign.id,
//         campaign_name: campaign.name,
//         campaign_status: campaign.status,
//         sent_at: campaign.sent_at,
        
//         // Counts from campaign table (SINGLE SOURCE OF TRUTH)
//         total_sent: sentCount,
//         pending: pending,
//         delivered: deliveredCount,    // Use campaign count
//         failed: failedCount,          // Use campaign count
//         clicked: clickedCount,        // Use campaign count
        
//         // Rates (calculated from campaign counts)
//         delivery_rate: parseFloat(deliveryRate.toFixed(2)),
//         failure_rate: parseFloat(failureRate.toFixed(2)),
//         click_rate: parseFloat(clickRate.toFixed(2)),
        
//         // Progress
//         progress_percentage: sentCount > 0 
//           ? parseFloat(((deliveredCount + failedCount) / sentCount * 100).toFixed(2))
//           : 0,
        
//         // Status flags
//         is_delivering: pending > 0,
//         is_completed: pending === 0 && sentCount > 0,
//         has_failures: failedCount > 0,
        
//         //  DEBUG INFO (helps identify issues)
//         debug: {
//           campaign_counts: {
//             sent: sentCount,
//             delivered: deliveredCount,
//             failed: failedCount,
//             clicked: clickedCount,
//             pending: pending,
//           },
//           log_counts: {
//             total_logs: totalLogs,
//             delivered_logs: logsDelivered,
//             failed_logs: logsFailed,
//             clicked_logs: logsClicked,
//           },
//           discrepancies: {
//             delivered: deliveredDiscrepancy,
//             failed: failedDiscrepancy,
//             clicked: clickedDiscrepancy,
//           },
//           has_discrepancy: deliveredDiscrepancy !== 0 || failedDiscrepancy !== 0,
//         },
        
//         // Detailed breakdowns (based on logs)
//         errors_by_type: Object.entries(errorsByType)
//           .sort((a, b) => b[1] - a[1])
//           .map(([type, count]) => ({ type, count })),
        
//         device_breakdown: Object.entries(deviceBreakdown)
//           .sort((a, b) => b[1] - a[1])
//           .map(([device, count]) => ({ device, count })),
        
//         browser_breakdown: Object.entries(browserBreakdown)
//           .sort((a, b) => b[1] - a[1])
//           .map(([browser, count]) => ({ browser, count })),
        
//         country_breakdown: Object.entries(countryBreakdown)
//           .sort((a, b) => b[1] - a[1])
//           .slice(0, 10)
//           .map(([country, count]) => ({ country, count })),
        
//         delivery_timeline: Object.entries(deliveryTimeline)
//           .sort((a, b) => a[0].localeCompare(b[0]))
//           .map(([time, count]) => ({ time, count })),
        
//         // Recent failures (last 20)
//         recent_failures: logs
//           ?.filter(l => l.status === 'failed')
//           .slice(0, 20)
//           .map(l => ({
//             id: l.id,
//             error: l.error_message,
//             created_at: l.created_at,
//             sent_at: l.sent_at,
//             device: l.subscriber?.device_type,
//             browser: l.subscriber?.browser,
//             os: l.subscriber?.os,
//             country: l.subscriber?.country,
//           })) || [],
        
//         // Recent successes (last 20)
//         recent_successes: logs
//           ?.filter(l => l.status === 'delivered' || l.delivered_at)
//           .slice(0, 20)
//           .map(l => ({
//             id: l.id,
//             delivered_at: l.delivered_at,
//             clicked_at: l.clicked_at,
//             device: l.subscriber?.device_type,
//             browser: l.subscriber?.browser,
//           })) || [],
//       };

//       console.log('[Delivery Status]  Response prepared');
//       console.log('[Delivery Status]  Final counts:');
//       console.log('  - Delivered:', deliveryStatus.delivered);
//       console.log('  - Failed:', deliveryStatus.failed);
//       console.log('  - Pending:', deliveryStatus.pending);

//       return NextResponse.json({
//         success: true,
//         delivery_status: deliveryStatus,
//       });

//     } catch (error: any) {
//       console.error('[Delivery Status]  Fatal error:', error);
//       return NextResponse.json(
//         { error: 'Failed to fetch delivery status', details: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );










// ============================================
// app/api/campaigns/[id]/delivery-status/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

export const GET = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const campaignId = params.id;
      const supabase = await getAuthenticatedClient(req);

      console.log('[Delivery Status]  Checking campaign:', campaignId);

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
        console.error('[Delivery Status]  Campaign error:', campaignError);
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }

      console.log('[Delivery Status] Campaign found:', campaign.name);

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

      // USE CAMPAIGN COUNTS AS SINGLE SOURCE OF TRUTH
      const sentCount = campaign.sent_count || 0;
      const deliveredCount = campaign.delivered_count || 0;
      const failedCount = campaign.failed_count || 0;
      const clickedCount = campaign.clicked_count || 0;
      
      // Calculate pending (sent but not yet delivered or failed)
      const pending = Math.max(0, sentCount - deliveredCount - failedCount);

      console.log('[Delivery Status]  Campaign Counts (Source of Truth):');
      console.log('  - Sent:', sentCount);
      console.log('  - Delivered:', deliveredCount);
      console.log('  - Failed:', failedCount);
      console.log('  - Clicked:', clickedCount);
      console.log('  - Pending:', pending);

      // Calculate percentages based on campaign counts
      const deliveryRate = sentCount > 0 ? (deliveredCount / sentCount * 100) : 0;
      const failureRate = sentCount > 0 ? (failedCount / sentCount * 100) : 0;
      const clickRate = sentCount > 0 ? (clickedCount / sentCount * 100) : 0;

      // Group errors by type
      const errorsByType = logs?.reduce((acc: Record<string, number>, log) => {
        if (log.error_message && log.status === 'failed') {
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

      // BUILD RESPONSE USING CAMPAIGN COUNTS
      const deliveryStatus = {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        campaign_status: campaign.status,
        sent_at: campaign.sent_at,
        
        // Counts from campaign table (SINGLE SOURCE OF TRUTH)
        total_sent: sentCount,
        pending: pending,
        delivered: deliveredCount,
        failed: failedCount,
        clicked: clickedCount,
        
        // Rates (calculated from campaign counts)
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
        
        // Detailed breakdowns (based on logs)
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

      console.log('[Delivery Status] Response prepared');
      console.log('[Delivery Status] Final counts:');
      console.log('  - Delivered:', deliveryStatus.delivered);
      console.log('  - Failed:', deliveryStatus.failed);
      console.log('  - Pending:', deliveryStatus.pending);

      return NextResponse.json({
        success: true,
        delivery_status: deliveryStatus,
      });

    } catch (error: any) {
      console.error('[Delivery Status]  Fatal error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch delivery status', details: error.message },
        { status: 500 }
      );
    }
  }
);