// // ============================================
// // app/api/campaigns/[id]/analytics/route.ts
// // GET campaign analytics 
// // ============================================

// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser, context: any) => {
//     try {
//       const params = await context.params;
//       const campaignId = params.id;

//       const supabase = await getAuthenticatedClient(req);

//       console.log('[Campaign Analytics] Fetching analytics for campaign:', campaignId);

//       // Verify ownership
//       const { data: campaign, error: campaignError } = await supabase
//         .from('campaigns')
//         .select(`
//           id,
//           name,
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
//         console.error('[Campaign Analytics] Campaign not found:', campaignError);
//         return NextResponse.json(
//           { error: 'Campaign not found or access denied' },
//           { status: 404 }
//         );
//       }

//       // Get detailed logs
//       const { data: logs, error: logsError } = await supabase
//         .from('notification_logs')
//         .select('*')
//         .eq('campaign_id', campaignId)
//         .order('created_at', { ascending: false })
//         .limit(100);

//       if (logsError) {
//         console.error('[Campaign Analytics] Logs error:', logsError);
//       }

//       // Calculate metrics
//       // const deliveryRate = campaign.sent_count > 0
//       //   ? (campaign.delivered_count / campaign.sent_count * 100)
//       //   : 0;
//       const sentCount = campaign.sent_count ?? 0;
//       const deliveredCount = campaign.delivered_count ?? 0;
//       const deliveryRate = sentCount > 0
//         ? (deliveredCount / sentCount * 100)
//         : 0;

//       // const clickThroughRate = campaign.sent_count > 0
//       //         ? (campaign.clicked_count / campaign.sent_count * 100)
//       //         : 0;


//       const clickThroughRate = sentCount > 0
//         ? (campaign.clicked_count / sentCount * 100)
//         : 0;


//       const analytics = {
//         campaign_id: campaign.id,
//         campaign_name: campaign.name,
//         sent: campaign.sent_count || 0,
//         delivered: campaign.delivered_count || 0,
//         clicked: campaign.clicked_count || 0,
//         failed: campaign.failed_count || 0,
//         delivery_rate: parseFloat(deliveryRate.toFixed(2)),
//         click_through_rate: parseFloat(clickThroughRate.toFixed(2)),
//       };

//       console.log('[Campaign Analytics] Analytics:', {
//         sent: analytics.sent,
//         delivered: analytics.delivered,
//         clicked: analytics.clicked,
//         delivery_rate: analytics.delivery_rate,
//         ctr: analytics.click_through_rate,
//       });

//       return NextResponse.json({
//         success: true,
//         analytics,
//         recent_logs: logs || [],
//       });
//     } catch (error: any) {
//       console.error('[Campaign Analytics] Error:', error);
//       return NextResponse.json(
//         { error: 'Internal server error', details: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );




// app/api/campaigns/[id]/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const campaignId = params.id;

      console.log('[Campaign Analytics] Fetching analytics for campaign:', campaignId);

      // Verify ownership
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          sent_count,
          delivered_count,
          clicked_count,
          failed_count,
          websites!inner(id, user_id)
        `)
        .eq('id', campaignId)
        .eq('websites.user_id', user.id)
        .single();

      if (campaignError || !campaign) {
        console.error('[Campaign Analytics] Campaign not found:', campaignError);
        return NextResponse.json(
          { error: 'Campaign not found or access denied' },
          { status: 404 }
        );
      }

      // Get detailed logs from notification_logs
      const { data: logs, error: logsError } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        console.error('[Campaign Analytics] Logs error:', logsError);
      }

      // 🔥 NEW: Get click events from subscriber_events table
      const { data: clickEvents, error: clickError } = await supabase
        .from('subscriber_events')
        .select(`
          *,
          subscribers(id, browser, device_type, country, os)
        `)
        .eq('event_name', 'notification_clicked')
        .contains('properties', { campaign_id: campaignId })
        .order('created_at', { ascending: false });

      if (clickError) {
        console.error('[Campaign Analytics] Click events error:', clickError);
      }

      // Calculate actual click count from events
      const actualClickCount = clickEvents?.length || 0;
      
      // Get unique clickers
      const uniqueClickers = new Set(clickEvents?.map(e => e.subscriber_id)).size;

      // Calculate metrics
      const sentCount = campaign.sent_count ?? 0;
      const deliveredCount = campaign.delivered_count ?? 0;
      const deliveryRate = sentCount > 0
        ? (deliveredCount / sentCount * 100)
        : 0;

      // Use actual click count from events
      const clickThroughRate = sentCount > 0
        ? (actualClickCount / sentCount * 100)
        : 0;

      const analytics = {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        sent: sentCount,
        delivered: deliveredCount,
        clicked: actualClickCount, // 🔥 Use actual count from events
        failed: campaign.failed_count || 0,
        delivery_rate: parseFloat(deliveryRate.toFixed(2)),
        click_through_rate: parseFloat(clickThroughRate.toFixed(2)),
        unique_clickers: uniqueClickers,
        // 🔥 NEW: Include detailed click data
        click_events: clickEvents || [],
      };

      console.log('[Campaign Analytics] Analytics:', {
        sent: analytics.sent,
        delivered: analytics.delivered,
        clicked: analytics.clicked,
        unique_clickers: analytics.unique_clickers,
        delivery_rate: analytics.delivery_rate,
        ctr: analytics.click_through_rate,
      });

      return NextResponse.json({
        success: true,
        analytics,
        recent_logs: logs || [],
      });
    } catch (error: any) {
      console.error('[Campaign Analytics] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  }
);