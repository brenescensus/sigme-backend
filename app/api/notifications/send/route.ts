// FILE: app/api/notifications/send/route.ts
// Send push notifications
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendNotificationToSubscriber } from '@/lib/push/sender';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();


    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { websiteId, notification, targetSubscriberIds, campaignId } = body;

    // Validate required fields
    if (!websiteId || !notification?.title || !notification?.body) {
      return NextResponse.json(
        { error: 'Required: websiteId, notification.title, notification.body' },
        { status: 400 }
      );
    }

    // Verify website ownership
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (websiteError || !website) {
      return NextResponse.json(
        { error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    // Get subscribers
    let query = supabase
      .from('subscribers')
      .select('*')
      .eq('website_id', websiteId)
      .eq('status', 'active');

    if (targetSubscriberIds && Array.isArray(targetSubscriberIds) && targetSubscriberIds.length > 0) {
      query = query.in('id', targetSubscriberIds);
    }

    const { data: subscribers, error: subsError } = await query;

    if (subsError) {
      console.error('[Send Notification] Subscribers query error:', subsError);
      return NextResponse.json(
        { error: 'Failed to fetch subscribers' },
        { status: 500 }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No active subscribers found',
      });
    }

    // Prepare notification payload
    const notificationPayload = {
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192.png',
      badge: notification.badge || '/badge-72.png',
      image: notification.image,
      url: notification.url || '/',
      tag: notification.tag || `campaign-${campaignId || Date.now()}`,
      requireInteraction: notification.requireInteraction || false,
      actions: notification.actions || [],
    };

    // Send notifications
    let sentCount = 0;
    let failedCount = 0;
    const expiredSubscriberIds: string[] = [];
    const results: any[] = [];

    // Process in batches of 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(subscriber => sendNotificationToSubscriber(subscriber, notificationPayload))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const subscriber = batch[j];

        if (result.status === 'fulfilled' && result.value.success) {
          sentCount++;

          // Log success
          await supabase.from('notification_logs').insert({
            campaign_id: campaignId || null,
            subscriber_id: subscriber.id,
            website_id: websiteId,
            status: 'sent',
            platform: result.value.platform,
            sent_at: new Date().toISOString(),
          });
        } else {
          failedCount++;

          const error = result.status === 'rejected'
            ? result.reason?.message || 'Unknown error'
            : result.value.error || 'Unknown error';

          // Log failure
          await supabase.from('notification_logs').insert({
            campaign_id: campaignId || null,
            subscriber_id: subscriber.id,
            website_id: websiteId,
            status: 'failed',
            platform: result.status === 'fulfilled' ? result.value.platform : subscriber.platform,
            error_message: error,
          });

          // Mark expired subscriptions
          if (error.includes('SUBSCRIPTION_EXPIRED')) {
            expiredSubscriberIds.push(subscriber.id);
          }

          results.push({
            subscriberId: subscriber.id,
            error,
          });
        }
      }
    }

    // Mark expired subscriptions as inactive
    if (expiredSubscriberIds.length > 0) {
      await supabase
        .from('subscribers')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .in('id', expiredSubscriberIds);
    }

    // Update campaign stats if applicable
    if (campaignId) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('sent_count, failed_count')
        .eq('id', campaignId)
        .single();

      if (campaign) {
        await supabase
          .from('campaigns')
          .update({
            sent_count: (campaign.sent_count || 0) + sentCount,
            failed_count: (campaign.failed_count || 0) + failedCount,
            status: 'completed',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaignId);
      }
    }

    // Update website stats
    await supabase
      .from('websites')
      .update({
        notifications_sent: (website.notifications_sent || 0) + sentCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', websiteId);

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: subscribers.length,
      expiredSubscriptions: expiredSubscriberIds.length,
      errors: failedCount > 0 ? results.filter(r => r.error) : undefined,
    });
  } catch (error: any) {
    console.error('[Send Notification] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
