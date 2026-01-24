// app/api/campaigns/[id]/send/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:notifications@yourdomain.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

//  Send a campaign to subscribers
 
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }  // ✅ FIXED: params is a Promise
) {
  try {
    // ✅ FIXED: Await the params
    const { id: campaignId } = await context.params;
    
    console.log('[Campaign Send] Starting send for campaign:', campaignId);

    // 1. Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      console.error('[Campaign Send] Error fetching campaign:', campaignError);
      return NextResponse.json(
        { success: false, error: 'Campaign not found', details: campaignError.message },
        { status: 404 }
      );
    }

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    console.log('[Campaign Send] Campaign found:', campaign.name);
    console.log('[Campaign Send] Website ID:', campaign.website_id);
    console.log('[Campaign Send] Segment:', campaign.segment);

    // 2. Get subscribers based on segment
    let query = supabase
      .from('subscribers')
      .select('*')
      .eq('website_id', campaign.website_id)
      .eq('status', 'active')
      .not('endpoint', 'is', null);

    // Apply segment filters
    if (campaign.segment === 'active') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte('last_seen_at', thirtyDaysAgo.toISOString());
      console.log('[Campaign Send] Filtering for active users (last seen >= 30 days ago)');
    } else if (campaign.segment === 'inactive') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.lt('last_seen_at', thirtyDaysAgo.toISOString());
      console.log('[Campaign Send] Filtering for inactive users (last seen < 30 days ago)');
    } else {
      console.log('[Campaign Send] Sending to all active subscribers');
    }

    const { data: subscribers, error: subscribersError } = await query;

    if (subscribersError) {
      console.error('[Campaign Send] Error fetching subscribers:', subscribersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch subscribers', details: subscribersError.message },
        { status: 500 }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      console.log('[Campaign Send] No subscribers found');
      
      // Still update campaign status
      await supabase
        .from('campaigns')
        .update({
          status: 'completed',
          sent_count: 0,
          delivered_count: 0,
          failed_count: 0,
          sent_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      return NextResponse.json({
        success: true,
        sent: 0,
        delivered: 0,
        failed: 0,
        message: 'No active subscribers found for this segment'
      });
    }

    console.log(`[Campaign Send] Found ${subscribers.length} subscribers to send to`);

    let sent = 0;
    let delivered = 0;
    let failed = 0;

    // 3. Send notifications to each subscriber
    for (const subscriber of subscribers) {
      try {
        // Validate subscription keys
        if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
          console.error(`[Campaign Send] Invalid subscription for ${subscriber.id}`);
          failed++;
          
          // Log invalid subscription
          await supabase.from('notification_logs').insert({
            campaign_id: campaign.id,
            subscriber_id: subscriber.id,
            website_id: campaign.website_id,
            status: 'failed',
            platform: subscriber.platform || 'web',
            error_message: 'Invalid subscription keys',
            sent_at: new Date().toISOString()
          });
          
          continue;
        }

        // 🔥 CRITICAL: Include subscriber_id and campaign_id in notification data
        const payload = {
          title: campaign.title,
          body: campaign.body,
          icon: campaign.icon_url || '/icon.png',
          badge: '/badge.png',
          image: campaign.image_url || undefined,
          data: {
            url: campaign.click_url || '/',
            subscriber_id: subscriber.id,    // ← Required for click tracking
            campaign_id: campaign.id,        // ← Required for click tracking
            journey_id: null,
            timestamp: new Date().toISOString()
          }
        };

        console.log(`[Campaign Send] Sending to subscriber: ${subscriber.id}`);

        // Send push notification
        await webpush.sendNotification(
          {
            endpoint: subscriber.endpoint,
            keys: {
              p256dh: subscriber.p256dh_key,
              auth: subscriber.auth_key
            }
          },
          JSON.stringify(payload)
        );

        sent++;
        delivered++;

        // Log successful delivery
        await supabase.from('notification_logs').insert({
          campaign_id: campaign.id,
          subscriber_id: subscriber.id,
          website_id: campaign.website_id,
          status: 'delivered',
          platform: subscriber.platform || 'web',
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString()
        });

        console.log(`[Campaign Send] ✅ Successfully sent to ${subscriber.id}`);

      } catch (error: any) {
        console.error(`[Campaign Send] ❌ Failed to send to ${subscriber.id}:`, error.message);
        failed++;

        // Log failure
        await supabase.from('notification_logs').insert({
          campaign_id: campaign.id,
          subscriber_id: subscriber.id,
          website_id: campaign.website_id,
          status: 'failed',
          platform: subscriber.platform || 'web',
          error_message: error.message,
          sent_at: new Date().toISOString()
        });
      }
    }

    // 4. Update campaign with results
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: 'completed',
        sent_count: sent,
        delivered_count: delivered,
        failed_count: failed,
        sent_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (updateError) {
      console.error('[Campaign Send] Error updating campaign:', updateError);
    }

    console.log(`[Campaign Send] ✅ Complete - Sent: ${sent}, Delivered: ${delivered}, Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      sent,
      delivered,
      failed,
      message: `Campaign sent successfully to ${delivered} subscribers`
    });

  } catch (error: any) {
    console.error('[Campaign Send] ❌ Fatal error:', error);
    console.error('[Campaign Send] Error stack:', error.stack);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send campaign',
        details: error.stack
      },
      { status: 500 }
    );
  }
}
