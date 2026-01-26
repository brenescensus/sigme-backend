// // // app/api/notifications/send/route.ts
// // // Fixed version with correct return values

// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth, AuthUser, getAuthenticatedClient } from '@/lib/auth-middleware';
// // import { sendNotificationToSubscriber } from '@/lib/push/sender';

// // async function handler(req: NextRequest, user: AuthUser) {
// //   try {
// //     const supabase = await getAuthenticatedClient(req);
// //     const body = await req.json();
// //     const { websiteId, notification, targetSubscriberIds, campaignId } = body;

// //     console.log('[Send Notification] Request:', {
// //       websiteId,
// //       campaignId,
// //       targetSubscriberIds: targetSubscriberIds?.length || 'all',
// //       hasNotification: !!notification,
// //     });

// //     // Validate required fields
// //     if (!websiteId || !notification?.title || !notification?.body) {
// //       return NextResponse.json(
// //         { error: 'Required: websiteId, notification.title, notification.body' },
// //         { status: 400 }
// //       );
// //     }

// //     // Verify website ownership
// //     const { data: website, error: websiteError } = await supabase
// //       .from('websites')
// //       .select('*')
// //       .eq('id', websiteId)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (websiteError || !website) {
// //       return NextResponse.json(
// //         { error: 'Website not found or access denied' },
// //         { status: 404 }
// //       );
// //     }

// //     // Get subscribers
// //     let query = supabase
// //       .from('subscribers')
// //       .select('*')
// //       .eq('website_id', websiteId)
// //       .eq('status', 'active');

// //     if (targetSubscriberIds && Array.isArray(targetSubscriberIds) && targetSubscriberIds.length > 0) {
// //       console.log('[Send Notification] Filtering to specific subscribers:', targetSubscriberIds.length);
// //       query = query.in('id', targetSubscriberIds);
// //     }

// //     const { data: subscribers, error: subsError } = await query;

// //     console.log('[Send Notification] Subscribers found:', subscribers?.length || 0);

// //     if (subsError) {
// //       console.error('[Send Notification] Subscribers query error:', subsError);
// //       return NextResponse.json(
// //         { error: 'Failed to fetch subscribers', details: subsError.message },
// //         { status: 500 }
// //       );
// //     }

// //     if (!subscribers || subscribers.length === 0) {
// //       console.log('[Send Notification] No subscribers to send to');
// //       return NextResponse.json({
// //         success: true,
// //         sent: 0,        // Total attempted
// //         delivered: 0,   // Successfully delivered
// //         failed: 0,
// //         message: 'No active subscribers found',
// //       });
// //     }

// //     // Prepare notification payload
// //     const notificationPayload = {
// //       title: notification.title,
// //       body: notification.body,
// //       icon: notification.icon || '/icon-192.png',
// //       badge: notification.badge || '/badge-72.png',
// //       image: notification.image,
// //       url: notification.url || '/',
// //       tag: notification.tag || `campaign-${campaignId || Date.now()}`,
// //       requireInteraction: notification.requireInteraction || false,
// //       actions: notification.actions || [],
// //     };

// //     console.log('[Send Notification] Starting delivery to', subscribers.length, 'subscribers');

// //     // Send notifications
// //     let deliveredCount = 0;  //  Successfully delivered
// //     let failedCount = 0;     //  Failed to deliver
// //     const expiredSubscriberIds: string[] = [];
// //     const results: any[] = [];

// //     // Process in batches of 50
// //     const BATCH_SIZE = 50;
// //     for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
// //       const batch = subscribers.slice(i, i + BATCH_SIZE);

// //       const batchResults = await Promise.allSettled(
// //         batch.map(subscriber => sendNotificationToSubscriber(subscriber, notificationPayload))
// //       );

// //       for (let j = 0; j < batchResults.length; j++) {
// //         const result = batchResults[j];
// //         const subscriber = batch[j];

// //         if (result.status === 'fulfilled' && result.value.success) {
// //           deliveredCount++;

// //           // Log success
// //           await supabase.from('notification_logs').insert({
// //             campaign_id: campaignId || null,
// //             subscriber_id: subscriber.id,
// //             website_id: websiteId,
// //             status: 'delivered',  //  Changed from 'sent' to 'delivered'
// //             platform: result.value.platform,
// //             sent_at: new Date().toISOString(),
// //           });
// //         } else {
// //           failedCount++;

// //           const error = result.status === 'rejected'
// //             ? result.reason?.message || 'Unknown error'
// //             : result.value.error || 'Unknown error';

// //           // Log failure
// //           await supabase.from('notification_logs').insert({
// //             campaign_id: campaignId || null,
// //             subscriber_id: subscriber.id,
// //             website_id: websiteId,
// //             status: 'failed',
// //             platform: result.status === 'fulfilled' ? result.value.platform : subscriber.platform,
// //             error_message: error,
// //             sent_at: new Date().toISOString(),
// //           });

// //           // Mark expired subscriptions
// //           if (error.includes('SUBSCRIPTION_EXPIRED') || error.includes('410')) {
// //             expiredSubscriberIds.push(subscriber.id);
// //           }

// //           results.push({
// //             subscriberId: subscriber.id,
// //             error,
// //           });
// //         }
// //       }
// //     }

// //     console.log('[Send Notification] Delivery complete:', {
// //       total: subscribers.length,
// //       delivered: deliveredCount,
// //       failed: failedCount,
// //     });

// //     // Mark expired subscriptions as inactive
// //     if (expiredSubscriberIds.length > 0) {
// //       console.log('[Send Notification] Marking', expiredSubscriberIds.length, 'subscriptions as inactive');
// //       await supabase
// //         .from('subscribers')
// //         .update({
// //           status: 'inactive',
// //           updated_at: new Date().toISOString(),
// //         })
// //         .in('id', expiredSubscriberIds);
// //     }

// //     //  DON'T update campaign stats here - let the campaign send endpoint do it
// //     // This prevents double-counting and conflicts

// //     // Update website stats
// //     await supabase
// //       .from('websites')
// //       .update({
// //         notifications_sent: (website.notifications_sent || 0) + deliveredCount,
// //         updated_at: new Date().toISOString(),
// //       })
// //       .eq('id', websiteId);

// //     //  Return proper field names
// //     return NextResponse.json({
// //       success: true,
// //       sent: subscribers.length,           // Total sent (attempted)
// //       delivered: deliveredCount,          // Successfully delivered
// //       failed: failedCount,                // Failed to deliver
// //       total: subscribers.length,          // Same as sent
// //       expiredSubscriptions: expiredSubscriberIds.length,
// //       errors: failedCount > 0 ? results.filter(r => r.error) : undefined,
// //     });
// //   } catch (error: any) {
// //     console.error('[Send Notification] Error:', error);
// //     console.error('[Send Notification] Error stack:', error.stack);
// //     return NextResponse.json(
// //       { error: 'Internal server error', details: error.message },
// //       { status: 500 }
// //     );
// //   }
// // }

// // export const POST = withAuth(handler);


// // app/api/notifications/send/route.ts
// // Updated version with branding support

// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, AuthUser, getAuthenticatedClient } from '@/lib/auth-middleware';
// import { sendNotificationToSubscriber } from '@/lib/push/sender';

// async function handler(req: NextRequest, user: AuthUser) {
//   try {
//     const supabase = await getAuthenticatedClient(req);
//     const body = await req.json();
//     const { websiteId, notification, targetSubscriberIds, campaignId } = body;

//     console.log('[Send Notification] Request:', {
//       websiteId,
//       campaignId,
//       targetSubscriberIds: targetSubscriberIds?.length || 'all',
//       hasNotification: !!notification,
//     });

//     // Validate required fields
//     if (!websiteId || !notification?.title || !notification?.body) {
//       return NextResponse.json(
//         { error: 'Required: websiteId, notification.title, notification.body' },
//         { status: 400 }
//       );
//     }

//     //  Fetch website with branding
//     const { data: website, error: websiteError } = await supabase
//       .from('websites')
//       .select('*')
//       .eq('id', websiteId)
//       .eq('user_id', user.id)
//       .single();

//     if (websiteError || !website) {
//       return NextResponse.json(
//         { error: 'Website not found or access denied' },
//         { status: 404 }
//       );
//     }

//     //  Extract and prepare branding data
//     const branding = website.notification_branding || {
//       primary_color: '#667eea',
//       secondary_color: '#764ba2',
//       logo_url: null,
//       font_family: 'Inter',
//       button_style: 'rounded',
//       notification_position: 'top-right',
//       animation_style: 'slide',
//       show_logo: true,
//       show_branding: true,
//     };

//     console.log('[Send Notification] Using branding:', {
//       hasLogo: !!branding.logo_url,
//       primaryColor: branding.primary_color,
//       position: branding.notification_position,
//     });

//     // Get subscribers
//     let query = supabase
//       .from('subscribers')
//       .select('*')
//       .eq('website_id', websiteId)
//       .eq('status', 'active');

//     if (targetSubscriberIds && Array.isArray(targetSubscriberIds) && targetSubscriberIds.length > 0) {
//       console.log('[Send Notification] Filtering to specific subscribers:', targetSubscriberIds.length);
//       query = query.in('id', targetSubscriberIds);
//     }

//     const { data: subscribers, error: subsError } = await query;

//     console.log('[Send Notification] Subscribers found:', subscribers?.length || 0);

//     if (subsError) {
//       console.error('[Send Notification] Subscribers query error:', subsError);
//       return NextResponse.json(
//         { error: 'Failed to fetch subscribers', details: subsError.message },
//         { status: 500 }
//       );
//     }

//     if (!subscribers || subscribers.length === 0) {
//       console.log('[Send Notification] No subscribers to send to');
//       return NextResponse.json({
//         success: true,
//         sent: 0,
//         delivered: 0,
//         failed: 0,
//         message: 'No active subscribers found',
//       });
//     }

//     //  Prepare notification payload WITH BRANDING
//     const notificationPayload = {
//       title: notification.title,
//       body: notification.body,
//       icon: branding.logo_url || notification.icon || '/icon-192.png',
//       badge: notification.badge || '/badge-72.png',
//       image: notification.image,
//       url: notification.url || website.url || '/',
//       tag: notification.tag || `campaign-${campaignId || Date.now()}`,
//       requireInteraction: notification.requireInteraction || false,
//       actions: notification.actions || [],
//       //  Include branding data in the payload
//       branding: {
//         primary_color: branding.primary_color,
//         secondary_color: branding.secondary_color,
//         logo_url: branding.logo_url,
//         font_family: branding.font_family,
//         button_style: branding.button_style,
//         notification_position: branding.notification_position,
//         animation_style: branding.animation_style,
//         show_logo: branding.show_logo,
//         show_branding: branding.show_branding,
//       }
//     };

//     console.log('[Send Notification] Starting delivery to', subscribers.length, 'subscribers');

//     // Send notifications
//     let deliveredCount = 0;
//     let failedCount = 0;
//     const expiredSubscriberIds: string[] = [];
//     const results: any[] = [];

//     // Process in batches of 50
//     const BATCH_SIZE = 50;
//     for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
//       const batch = subscribers.slice(i, i + BATCH_SIZE);

//       const batchResults = await Promise.allSettled(
//         batch.map(subscriber => sendNotificationToSubscriber(subscriber, notificationPayload))
//       );

//       for (let j = 0; j < batchResults.length; j++) {
//         const result = batchResults[j];
//         const subscriber = batch[j];

//         if (result.status === 'fulfilled' && result.value.success) {
//           deliveredCount++;

//           // Log success
//           await supabase.from('notification_logs').insert({
//             campaign_id: campaignId || null,
//             subscriber_id: subscriber.id,
//             website_id: websiteId,
//             status: 'delivered',
//             platform: result.value.platform,
//             sent_at: new Date().toISOString(),
//           });
//         } else {
//           failedCount++;

//           const error = result.status === 'rejected'
//             ? result.reason?.message || 'Unknown error'
//             : result.value.error || 'Unknown error';

//           // Log failure
//           await supabase.from('notification_logs').insert({
//             campaign_id: campaignId || null,
//             subscriber_id: subscriber.id,
//             website_id: websiteId,
//             status: 'failed',
//             platform: result.status === 'fulfilled' ? result.value.platform : subscriber.platform,
//             error_message: error,
//             sent_at: new Date().toISOString(),
//           });

//           // Mark expired subscriptions
//           if (error.includes('SUBSCRIPTION_EXPIRED') || error.includes('410')) {
//             expiredSubscriberIds.push(subscriber.id);
//           }

//           results.push({
//             subscriberId: subscriber.id,
//             error,
//           });
//         }
//       }
//     }

//     console.log('[Send Notification] Delivery complete:', {
//       total: subscribers.length,
//       delivered: deliveredCount,
//       failed: failedCount,
//     });

//     // Mark expired subscriptions as inactive
//     if (expiredSubscriberIds.length > 0) {
//       console.log('[Send Notification] Marking', expiredSubscriberIds.length, 'subscriptions as inactive');
//       await supabase
//         .from('subscribers')
//         .update({
//           status: 'inactive',
//           updated_at: new Date().toISOString(),
//         })
//         .in('id', expiredSubscriberIds);
//     }

//     // Update website stats
//     await supabase
//       .from('websites')
//       .update({
//         notifications_sent: (website.notifications_sent || 0) + deliveredCount,
//         updated_at: new Date().toISOString(),
//       })
//       .eq('id', websiteId);

//     return NextResponse.json({
//       success: true,
//       sent: subscribers.length,
//       delivered: deliveredCount,
//       failed: failedCount,
//       total: subscribers.length,
//       expiredSubscriptions: expiredSubscriberIds.length,
//       errors: failedCount > 0 ? results.filter(r => r.error) : undefined,
//     });
//   } catch (error: any) {
//     console.error('[Send Notification] Error:', error);
//     console.error('[Send Notification] Error stack:', error.stack);
//     return NextResponse.json(
//       { error: 'Internal server error', details: error.message },
//       { status: 500 }
//     );
//   }
// }

// export const POST = withAuth(handler);

// app/api/notifications/send/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser, getAuthenticatedClient } from '@/lib/auth-middleware';
import { sendNotificationToSubscriber } from '@/lib/push/sender';
import { parseBranding } from '@/types/branding';

async function handler(req: NextRequest, user: AuthUser) {
  try {
    const supabase = await getAuthenticatedClient(req);
    const body = await req.json();
    const { websiteId, notification, targetSubscriberIds, campaignId } = body;

    console.log('[Send Notification] Request:', {
      websiteId,
      campaignId,
      targetSubscriberIds: targetSubscriberIds?.length || 'all',
      hasNotification: !!notification,
    });

    // Validate required fields
    if (!websiteId || !notification?.title || !notification?.body) {
      return NextResponse.json(
        { error: 'Required: websiteId, notification.title, notification.body' },
        { status: 400 }
      );
    }

    //  Fetch website with branding
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

    //  Extract and prepare branding data with type safety
    const branding = parseBranding(website.notification_branding);

    console.log('[Send Notification] Using branding:', {
      hasLogo: !!branding.logo_url,
      primaryColor: branding.primary_color,
      position: branding.notification_position,
    });

    // Get subscribers
    let query = supabase
      .from('subscribers')
      .select('*')
      .eq('website_id', websiteId)
      .eq('status', 'active');

    if (targetSubscriberIds && Array.isArray(targetSubscriberIds) && targetSubscriberIds.length > 0) {
      console.log('[Send Notification] Filtering to specific subscribers:', targetSubscriberIds.length);
      query = query.in('id', targetSubscriberIds);
    }

    const { data: subscribers, error: subsError } = await query;

    console.log('[Send Notification] Subscribers found:', subscribers?.length || 0);

    if (subsError) {
      console.error('[Send Notification] Subscribers query error:', subsError);
      return NextResponse.json(
        { error: 'Failed to fetch subscribers', details: subsError.message },
        { status: 500 }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      console.log('[Send Notification] No subscribers to send to');
      return NextResponse.json({
        success: true,
        sent: 0,
        delivered: 0,
        failed: 0,
        message: 'No active subscribers found',
      });
    }

    //  Prepare notification payload WITH BRANDING
    const notificationPayload = {
      title: notification.title,
      body: notification.body,
      icon: branding.logo_url || notification.icon || '/icon-192.png',
      badge: notification.badge || '/badge-72.png',
      image: notification.image,
      url: notification.url || website.url || '/',
      tag: notification.tag || `campaign-${campaignId || Date.now()}`,
      requireInteraction: notification.requireInteraction || false,
      actions: notification.actions || [],
      //  Include branding data in the payload
      branding: {
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        logo_url: branding.logo_url,
        font_family: branding.font_family,
        button_style: branding.button_style,
        notification_position: branding.notification_position,
        animation_style: branding.animation_style,
        show_logo: branding.show_logo,
        show_branding: branding.show_branding,
      }
    };

    console.log('[Send Notification] Starting delivery to', subscribers.length, 'subscribers');

    // Send notifications
    let deliveredCount = 0;
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
          deliveredCount++;

          // Log success
          await supabase.from('notification_logs').insert({
            campaign_id: campaignId || null,
            subscriber_id: subscriber.id,
            website_id: websiteId,
            status: 'delivered',
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
            sent_at: new Date().toISOString(),
          });

          // Mark expired subscriptions
          if (error.includes('SUBSCRIPTION_EXPIRED') || error.includes('410')) {
            expiredSubscriberIds.push(subscriber.id);
          }

          results.push({
            subscriberId: subscriber.id,
            error,
          });
        }
      }
    }

    console.log('[Send Notification] Delivery complete:', {
      total: subscribers.length,
      delivered: deliveredCount,
      failed: failedCount,
    });

    // Mark expired subscriptions as inactive
    if (expiredSubscriberIds.length > 0) {
      console.log('[Send Notification] Marking', expiredSubscriberIds.length, 'subscriptions as inactive');
      await supabase
        .from('subscribers')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .in('id', expiredSubscriberIds);
    }

    // Update website stats
    await supabase
      .from('websites')
      .update({
        notifications_sent: (website.notifications_sent || 0) + deliveredCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', websiteId);

    return NextResponse.json({
      success: true,
      sent: subscribers.length,
      delivered: deliveredCount,
      failed: failedCount,
      total: subscribers.length,
      expiredSubscriptions: expiredSubscriberIds.length,
      errors: failedCount > 0 ? results.filter(r => r.error) : undefined,
    });
  } catch (error: any) {
    console.error('[Send Notification] Error:', error);
    console.error('[Send Notification] Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler);