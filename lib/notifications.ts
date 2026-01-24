// // backend/lib/notifications.ts

// import { createServiceClient } from '@/lib/supabase/server';
// import webpush from 'web-push';

// const supabase = createServiceClient();

// interface SendNotificationParams {
//   subscriberId: string;
//   websiteId: string;
//   campaignId?: string;  // 🔥 ADD THIS
//   journeyId?: string;   // 🔥 ADD THIS
//   nodeId?: string;      // 🔥 ADD THIS (for journey steps)
//   notification: {
//     title: string;
//     body: string;
//     icon?: string;
//     image?: string;
//     data?: any;
//   };
// }

// interface NotificationResult {
//   success: boolean;
//   error?: string;
//   logId?: string;  // 🔥 ADD THIS to track the log entry
// }

// /**
//  * Send push notification to a subscriber
//  */
// export async function sendNotification(
//   params: SendNotificationParams
// ): Promise<NotificationResult> {
//   try {
//     const { subscriberId, websiteId, campaignId, journeyId, nodeId, notification } = params;

//     console.log(`[Notifications] Sending to subscriber ${subscriberId}`);

//     // Get subscriber details
//     const { data: subscriber, error: subError } = await supabase
//       .from('subscribers')
//       .select('endpoint, auth_key, p256dh_key, platform')
//       .eq('id', subscriberId)
//       .single();

//     if (subError || !subscriber) {
//       throw new Error('Subscriber not found');
//     }

//     // Get website VAPID keys
//     const { data: website, error: webError } = await supabase
//       .from('websites')
//       .select('vapid_public_key, vapid_private_key')
//       .eq('id', websiteId)
//       .single();

//     if (webError || !website) {
//       throw new Error('Website not found');
//     }

//     if (!website.vapid_public_key || !website.vapid_private_key) {
//       throw new Error('VAPID keys not configured for website');
//     }

//     // 🔥 CREATE LOG ENTRY FIRST (before sending)
//     const { data: logEntry, error: logError } = await supabase
//       .from('notification_logs')
//       .insert({
//         subscriber_id: subscriberId,
//         website_id: websiteId,
//         campaign_id: campaignId || null,
//         status: 'pending',
//         platform: subscriber.platform || 'web',
//         sent_at: new Date().toISOString(),
//       })
//       .select()
//       .single();

//     if (logError) {
//       console.error('[Notifications] Failed to create log entry:', logError);
//     }

//     // Configure web-push
//     webpush.setVapidDetails(
//       process.env.VAPID_SUBJECT || 'mailto:notifications@yourdomain.com',
//       website.vapid_public_key,
//       website.vapid_private_key
//     );

//     // Prepare push subscription
//     const pushSubscription = {
//       endpoint: subscriber.endpoint!,
//       keys: {
//         auth: subscriber.auth_key!,
//         p256dh: subscriber.p256dh_key!,
//       },
//     };

//     // 🔥 ENHANCED: Include tracking data in notification payload
//     const payload = JSON.stringify({
//       title: notification.title,
//       body: notification.body,
//       icon: notification.icon,
//       image: notification.image,
//       data: {
//         ...notification.data,
//         // 🔥 Add tracking IDs to notification data
//         subscriber_id: subscriberId,
//         campaign_id: campaignId || null,
//         journey_id: journeyId || null,
//         node_id: nodeId || null,
//         log_id: logEntry?.id || null,
//       },
//     });

//     // Send notification
//     await webpush.sendNotification(pushSubscription, payload);

//     // 🔥 UPDATE log entry to delivered
//     if (logEntry) {
//       await supabase
//         .from('notification_logs')
//         .update({
//           status: 'delivered',
//           delivered_at: new Date().toISOString(),
//         })
//         .eq('id', logEntry.id);
//     }

//     console.log(`[Notifications] Successfully sent to ${subscriberId}`);

//     return { 
//       success: true,
//       logId: logEntry?.id,
//     };
//   } catch (error: any) {
//     console.error('[Notifications] Send error:', error);

//     // Log failure
//     await supabase.from('notification_logs').insert({
//       subscriber_id: params.subscriberId,
//       website_id: params.websiteId,
//       campaign_id: params.campaignId || null,
//       status: 'failed',
//       error_message: error.message,
//       platform: 'web',
//       sent_at: new Date().toISOString(),
//     });

//     return {
//       success: false,
//       error: error.message || 'Failed to send notification',
//     };
//   }
// }

// backend/lib/notifications.ts

import { createServiceClient } from '@/lib/supabase/server';
import webpush from 'web-push';

const supabase = createServiceClient();

interface SendNotificationParams {
  subscriberId: string;
  websiteId: string;
  campaignId?: string;  // 🔥 ADD THIS
  journeyId?: string;   // 🔥 ADD THIS
  nodeId?: string;      // 🔥 ADD THIS (for journey steps)
  notification: {
    title: string;
    body: string;
    icon?: string;
    image?: string;
    data?: any;
  };
}

interface NotificationResult {
  success: boolean;
  error?: string;
  logId?: string;  // 🔥 ADD THIS to track the log entry
}

/**
 * Send push notification to a subscriber
 */
export async function sendNotification(
  params: SendNotificationParams
): Promise<NotificationResult> {
  try {
    const { subscriberId, websiteId, campaignId, journeyId, nodeId, notification } = params;

    console.log(`[Notifications] Sending to subscriber ${subscriberId}`);

    // Get subscriber details
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('endpoint, auth_key, p256dh_key, platform')
      .eq('id', subscriberId)
      .single();

    if (subError || !subscriber) {
      throw new Error('Subscriber not found');
    }

    // Get website VAPID keys
    const { data: website, error: webError } = await supabase
      .from('websites')
      .select('vapid_public_key, vapid_private_key')
      .eq('id', websiteId)
      .single();

    if (webError || !website) {
      throw new Error('Website not found');
    }

    if (!website.vapid_public_key || !website.vapid_private_key) {
      throw new Error('VAPID keys not configured for website');
    }

    // 🔥 CREATE LOG ENTRY FIRST (before sending)
    const { data: logEntry, error: logError } = await supabase
      .from('notification_logs')
      .insert({
        subscriber_id: subscriberId,
        website_id: websiteId,
        campaign_id: campaignId || null,
        status: 'pending',
        platform: subscriber.platform || 'web',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('[Notifications] Failed to create log entry:', logError);
    }

    // Configure web-push
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:notifications@yourdomain.com',
      website.vapid_public_key,
      website.vapid_private_key
    );

    // Prepare push subscription
    const pushSubscription = {
      endpoint: subscriber.endpoint!,
      keys: {
        auth: subscriber.auth_key!,
        p256dh: subscriber.p256dh_key!,
      },
    };

    // 🔥 ENHANCED: Include tracking data in notification payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      image: notification.image,
      data: {
        ...notification.data,
        // 🔥 Add tracking IDs to notification data
        subscriber_id: subscriberId,
        campaign_id: campaignId || null,
        journey_id: journeyId || null,
        node_id: nodeId || null,
        log_id: logEntry?.id || null,
      },
    });

    // Send notification
    await webpush.sendNotification(pushSubscription, payload);

    // 🔥 UPDATE log entry to delivered
    if (logEntry) {
      await supabase
        .from('notification_logs')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', logEntry.id);
    }

    console.log(`[Notifications] Successfully sent to ${subscriberId}`);

    return { 
      success: true,
      logId: logEntry?.id,
    };
  } catch (error: any) {
    console.error('[Notifications] Send error:', error);

    // Log failure
    await supabase.from('notification_logs').insert({
      subscriber_id: params.subscriberId,
      website_id: params.websiteId,
      campaign_id: params.campaignId || null,
      status: 'failed',
      error_message: error.message,
      platform: 'web',
      sent_at: new Date().toISOString(),
    });

    return {
      success: false,
      error: error.message || 'Failed to send notification',
    };
  }
}