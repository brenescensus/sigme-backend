
// // // app/api/campaigns/[id]/send/route.ts

// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@supabase/supabase-js';
// // import webpush from 'web-push';
// // import { parseBranding } from '@/types/branding';

// // const supabase = createClient(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // webpush.setVapidDetails(
// //   process.env.VAPID_SUBJECT || 'mailto:mushiele02@gmail.com',
// //   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
// //   process.env.VAPID_PRIVATE_KEY!
// // );

// // export async function POST(
// //   request: NextRequest,
// //   context: { params: Promise<{ id: string }> }
// // ) {
// //   try {
// //     const { id: campaignId } = await context.params;
    
// //     console.log(' [Campaign Send] Starting send for campaign:', campaignId);

// //     // 1. Get campaign details
// //     const { data: campaign, error: campaignError } = await supabase
// //       .from('campaigns')
// //       .select('*')
// //       .eq('id', campaignId)
// //       .single();

// //     if (campaignError || !campaign) {
// //       console.error(' [Campaign Send] Campaign not found');
// //       return NextResponse.json(
// //         { success: false, error: 'Campaign not found' },
// //         { status: 404 }
// //       );
// //     }

// //     // 2. Get website with branding
// //     const { data: website, error: websiteError } = await supabase
// //       .from('websites')
// //       .select('*')
// //       .eq('id', campaign.website_id)
// //       .single();

// //     if (websiteError || !website) {
// //       console.error(' [Campaign Send] Website not found');
// //       return NextResponse.json(
// //         { success: false, error: 'Website not found' },
// //         { status: 404 }
// //       );
// //     }

// //     const branding = parseBranding(website.notification_branding);

// //     // 3. Get subscribers
// //     let query = supabase
// //       .from('subscribers')
// //       .select('*')
// //       .eq('website_id', campaign.website_id)
// //       .eq('status', 'active')
// //       .not('endpoint', 'is', null);

// //     if (campaign.segment === 'active') {
// //       const thirtyDaysAgo = new Date();
// //       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
// //       query = query.gte('last_seen_at', thirtyDaysAgo.toISOString());
// //     } else if (campaign.segment === 'inactive') {
// //       const thirtyDaysAgo = new Date();
// //       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
// //       query = query.lt('last_seen_at', thirtyDaysAgo.toISOString());
// //     }

// //     const { data: subscribers, error: subscribersError } = await query;

// //     if (subscribersError) {
// //       console.error(' [Campaign Send] Error fetching subscribers');
// //       return NextResponse.json(
// //         { success: false, error: 'Failed to fetch subscribers' },
// //         { status: 500 }
// //       );
// //     }

// //     if (!subscribers || subscribers.length === 0) {
// //       console.log('[Campaign Send] No subscribers found');
      
// //       await supabase
// //         .from('campaigns')
// //         .update({
// //           status: 'completed',
// //           sent_count: 0,
// //           delivered_count: 0,
// //           failed_count: 0,
// //           sent_at: new Date().toISOString()
// //         })
// //         .eq('id', campaignId);

// //       return NextResponse.json({
// //         success: true,
// //         sent: 0,
// //         delivered: 0,
// //         failed: 0,
// //         message: 'No active subscribers found'
// //       });
// //     }

// //     console.log(` [Campaign Send] Sending to ${subscribers.length} subscribers`);

// //     let sentCount = 0;
// //     let deliveredCount = 0;
// //     let failedCount = 0;

// //     // 4. Send notifications
// //     for (const subscriber of subscribers) {
// //       try {
// //         // Validate subscription
// //         if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
// //           console.error(` Invalid subscription: ${subscriber.id}`);
// //           failedCount++;
          
// //           await supabase.from('notification_logs').insert({
// //             campaign_id: campaign.id,
// //             subscriber_id: subscriber.id,
// //             website_id: campaign.website_id,
// //             status: 'failed',
// //             platform: subscriber.platform || 'web',
// //             error_message: 'Invalid subscription keys',
// //             sent_at: new Date().toISOString()
// //           });
          
// //           continue;
// //         }

// //         // Create notification log
// //         const { data: notificationLog, error: logError } = await supabase
// //           .from('notification_logs')
// //           .insert({
// //             campaign_id: campaign.id,
// //             subscriber_id: subscriber.id,
// //             website_id: campaign.website_id,
// //             status: 'pending',
// //             platform: subscriber.platform || 'web',
// //           })
// //           .select()
// //           .single();

// //         if (logError || !notificationLog) {
// //           console.error(` Failed to create log for ${subscriber.id}`);
// //           failedCount++;
// //           continue;
// //         }

// //         // Prepare payload
// //         const payload = {
// //           title: campaign.title,
// //           body: campaign.body,
// //           icon: branding.logo_url || campaign.icon_url || '/icon.png',
// //           badge: '/badge.png',
// //           image: campaign.image_url || undefined,
// //           tag: notificationLog.id,
// //           data: {
// //             url: campaign.click_url || website.url || '/',
// //             subscriber_id: subscriber.id,
// //             campaign_id: campaign.id,
// //             notification_id: notificationLog.id,
// //             website_id: website.id,
// //             journey_id: null,
// //             timestamp: new Date().toISOString()
// //           },
// //           branding: {
// //             primary_color: branding.primary_color,
// //             secondary_color: branding.secondary_color,
// //             logo_url: branding.logo_url,
// //             font_family: branding.font_family,
// //             button_style: branding.button_style,
// //             notification_position: branding.notification_position,
// //             animation_style: branding.animation_style,
// //             show_logo: branding.show_logo,
// //             show_branding: branding.show_branding,
// //           }
// //         };

// //         console.log(` Sending to ${subscriber.id}`);

// //         // Send push notification
// //         await webpush.sendNotification(
// //           {
// //             endpoint: subscriber.endpoint,
// //             keys: {
// //               p256dh: subscriber.p256dh_key,
// //               auth: subscriber.auth_key
// //             }
// //           },
// //           JSON.stringify(payload)
// //         );

// //         sentCount++;

// //         // CRITICAL FIX: Mark as delivered IMMEDIATELY after successful send
// //         // This is the server-side tracking - service worker tracking is bonus
// //         await supabase
// //           .from('notification_logs')
// //           .update({
// //             status: 'delivered',
// //             sent_at: new Date().toISOString(),
// //             delivered_at: new Date().toISOString()
// //           })
// //           .eq('id', notificationLog.id);

// //         deliveredCount++;

// //         console.log(`Sent & marked delivered: ${subscriber.id}`);

// //       } catch (error: any) {
// //         console.error(` Failed to send to ${subscriber.id}:`, error.message);
        
// //         sentCount++;
// //         failedCount++;

// //         await supabase
// //           .from('notification_logs')
// //           .update({
// //             status: 'failed',
// //             error_message: error.message,
// //             sent_at: new Date().toISOString()
// //           })
// //           .eq('subscriber_id', subscriber.id)
// //           .eq('campaign_id', campaign.id)
// //           .eq('status', 'pending');
// //       }
// //     }

// //     // 5. Update campaign with final counts
// //     await supabase
// //       .from('campaigns')
// //       .update({
// //         status: 'completed',
// //         sent_count: sentCount,
// //         delivered_count: deliveredCount,
// //         failed_count: failedCount,
// //         sent_at: new Date().toISOString()
// //       })
// //       .eq('id', campaignId);

// //     console.log(`Campaign complete:`);
// //     console.log(`   - Sent: ${sentCount}`);
// //     console.log(`   - Delivered: ${deliveredCount}`);
// //     console.log(`   - Failed: ${failedCount}`);

// //     return NextResponse.json({
// //       success: true,
// //       sent: sentCount,
// //       delivered: deliveredCount,
// //       failed: failedCount,
// //       message: `Campaign sent to ${sentCount} subscribers, ${deliveredCount} delivered`
// //     });

// //   } catch (error: any) {
// //     console.error(' Fatal error:', error);
    
// //     return NextResponse.json(
// //       {
// //         success: false,
// //         error: error.message || 'Failed to send campaign',
// //       },
// //       { status: 500 }
// //     );
// //   }
// // }








// // app/api/campaigns/[id]/send/route.ts 

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import webpush from 'web-push';
// import { parseBranding } from '@/types/branding';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// webpush.setVapidDetails(
//   process.env.VAPID_SUBJECT || 'mailto:mushiele02@gmail.com',
//   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
//   process.env.VAPID_PRIVATE_KEY!
// );

// //  HELPER: Better error classification
// function classifyPushError(error: any): {
//   shouldDeactivate: boolean;
//   errorMessage: string;
//   statusCode: number;
// } {
//   const errorMessage = error.message || String(error);
//   const statusCode = error.statusCode || 0;

//   console.log(`[Error Analysis] Status: ${statusCode}, Message: ${errorMessage}`);

//   //  PERMANENT FAILURES - Deactivate subscription
//   if (
//     statusCode === 410 || // Gone - subscription expired
//     statusCode === 404 || // Not Found - subscription doesn't exist
//     errorMessage.includes('expired') ||
//     errorMessage.includes('unsubscribed') ||
//     errorMessage.includes('invalid subscription') ||
//     errorMessage.includes('SUBSCRIPTION_EXPIRED')
//   ) {
//     return {
//       shouldDeactivate: true,
//       errorMessage: 'Subscription expired or invalid',
//       statusCode
//     };
//   }

//   //  VAPID KEY MISMATCH
//   if (
//     statusCode === 401 ||
//     statusCode === 403 ||
//     errorMessage.includes('Unauthorized') ||
//     errorMessage.includes('UnauthorizedRegistration') ||
//     errorMessage.includes('vapid')
//   ) {
//     return {
//       shouldDeactivate: false,
//       errorMessage: 'VAPID key mismatch - check your VAPID configuration',
//       statusCode
//     };
//   }

//   //  RATE LIMITING
//   if (statusCode === 429) {
//     return {
//       shouldDeactivate: false,
//       errorMessage: 'Rate limited by push service',
//       statusCode
//     };
//   }

//   //  NETWORK/TEMPORARY ERRORS
//   if (
//     statusCode >= 500 ||
//     errorMessage.includes('timeout') ||
//     errorMessage.includes('ETIMEDOUT') ||
//     errorMessage.includes('ECONNREFUSED')
//   ) {
//     return {
//       shouldDeactivate: false,
//       errorMessage: 'Temporary network error',
//       statusCode
//     };
//   }

//   //  UNEXPECTED RESPONSE CODE (your current error)
//   if (errorMessage.includes('unexpected response code')) {
//     return {
//       shouldDeactivate: true, // Likely invalid subscription
//       errorMessage: `Unexpected response (${statusCode}) - subscription may be invalid`,
//       statusCode
//     };
//   }

//   //  DEFAULT
//   return {
//     shouldDeactivate: false,
//     errorMessage: errorMessage,
//     statusCode
//   };
// }

// export async function POST(
//   request: NextRequest,
//   context: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id: campaignId } = await context.params;
    
//     console.log('[Campaign Send] ▶ Starting send for campaign:', campaignId);

//     // 1. Get campaign details
//     const { data: campaign, error: campaignError } = await supabase
//       .from('campaigns')
//       .select('*')
//       .eq('id', campaignId)
//       .single();

//     if (campaignError || !campaign) {
//       console.error('[Campaign Send] ✗ Campaign not found');
//       return NextResponse.json(
//         { success: false, error: 'Campaign not found' },
//         { status: 404 }
//       );
//     }

//     console.log('[Campaign Send] ✓ Campaign loaded:', campaign.name);

//     // 2. Get website with branding
//     const { data: website, error: websiteError } = await supabase
//       .from('websites')
//       .select('*')
//       .eq('id', campaign.website_id)
//       .single();

//     if (websiteError || !website) {
//       console.error('[Campaign Send] ✗ Website not found');
//       return NextResponse.json(
//         { success: false, error: 'Website not found' },
//         { status: 404 }
//       );
//     }

//     console.log('[Campaign Send] ✓ Website loaded:', website.name);

//     const branding = parseBranding(website.notification_branding);

//     //  3. IMPROVED: Get VALID subscribers with better filtering
//     let query = supabase
//       .from('subscribers')
//       .select('*')
//       .eq('website_id', campaign.website_id)
//       .eq('status', 'active')
//       .not('endpoint', 'is', null)
//       .not('p256dh_key', 'is', null)
//       .not('auth_key', 'is', null);

//     if (campaign.segment === 'active') {
//       const thirtyDaysAgo = new Date();
//       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//       query = query.gte('last_seen_at', thirtyDaysAgo.toISOString());
//     } else if (campaign.segment === 'inactive') {
//       const thirtyDaysAgo = new Date();
//       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//       query = query.lt('last_seen_at', thirtyDaysAgo.toISOString());
//     }

//     const { data: subscribers, error: subscribersError } = await query;

//     if (subscribersError) {
//       console.error('[Campaign Send] ✗ Error fetching subscribers:', subscribersError);
//       return NextResponse.json(
//         { success: false, error: 'Failed to fetch subscribers' },
//         { status: 500 }
//       );
//     }

//     if (!subscribers || subscribers.length === 0) {
//       console.log('[Campaign Send] ⚠ No subscribers found');
      
//       await supabase
//         .from('campaigns')
//         .update({
//           status: 'completed',
//           sent_count: 0,
//           delivered_count: 0,
//           failed_count: 0,
//           sent_at: new Date().toISOString()
//         })
//         .eq('id', campaignId);

//       return NextResponse.json({
//         success: true,
//         sent: 0,
//         delivered: 0,
//         failed: 0,
//         message: 'No active subscribers found'
//       });
//     }

//     console.log(`[Campaign Send] ℹ Attempting to send to ${subscribers.length} subscribers`);

//     let sentCount = 0;
//     let deliveredCount = 0;
//     let failedCount = 0;
//     let deactivatedCount = 0;

//     //  4. IMPROVED: Send notifications with better error handling
//     for (const subscriber of subscribers) {
//       try {
//         // Double-check subscription validity
//         if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
//           console.error(`[Campaign Send] ✗ Invalid subscription keys for ${subscriber.id}`);
//           failedCount++;
          
//           await supabase.from('notification_logs').insert({
//             campaign_id: campaign.id,
//             subscriber_id: subscriber.id,
//             website_id: campaign.website_id,
//             status: 'failed',
//             platform: subscriber.platform || 'web',
//             error_message: 'Invalid subscription keys',
//             sent_at: new Date().toISOString()
//           });
          
//           // Mark subscriber as inactive
//           await supabase
//             .from('subscribers')
//             .update({ status: 'inactive',
//               endpoint: null,
//               p256dh_key: null,
//               auth_key: null,
//               updated_at: new Date().toISOString()
//              })
//             .eq('id', subscriber.id);
          
//           deactivatedCount++;
//           continue;
//         }

//         // Create notification log
//         const { data: notificationLog, error: logError } = await supabase
//           .from('notification_logs')
//           .insert({
//             campaign_id: campaign.id,
//             subscriber_id: subscriber.id,
//             website_id: campaign.website_id,
//             status: 'pending',
//             platform: subscriber.platform || 'web',
//           })
//           .select()
//           .single();

//         if (logError || !notificationLog) {
//           console.error(`[Campaign Send] ✗ Failed to create log for ${subscriber.id}`);
//           failedCount++;
//           continue;
//         }

//         //  IMPROVED: Better payload structure
//         const payload = {
//           title: campaign.title,
//           body: campaign.body,
//           icon: branding.logo_url || campaign.icon_url || '/icon-192x192.png',
//           badge: '/badge-96x96.png',
//           image: campaign.image_url || undefined,
//           tag: notificationLog.id,
//           requireInteraction: false,
//           data: {
//             url: campaign.click_url || website.url || '/',
//             subscriber_id: subscriber.id,
//             campaign_id: campaign.id,
//             notification_id: notificationLog.id,
//             website_id: website.id,
//             journey_id: null,
//             timestamp: new Date().toISOString()
//           },
//           branding: {
//             primary_color: branding.primary_color,
//             secondary_color: branding.secondary_color,
//             logo_url: branding.logo_url,
//             font_family: branding.font_family,
//             button_style: branding.button_style,
//             notification_position: branding.notification_position,
//             animation_style: branding.animation_style,
//             show_logo: branding.show_logo,
//             show_branding: branding.show_branding,
//           }
//         };

//         console.log(`[Campaign Send] → Sending to ${subscriber.id.substring(0, 8)}...`);

//         //  IMPROVED: Send with timeout
//         const sendPromise = webpush.sendNotification(
//           {
//             endpoint: subscriber.endpoint,
//             keys: {
//               p256dh: subscriber.p256dh_key,
//               auth: subscriber.auth_key
//             }
//           },
//           JSON.stringify(payload)
//         );

//         // Add 10 second timeout
//         const timeoutPromise = new Promise((_, reject) => {
//           setTimeout(() => reject(new Error('Notification send timeout')), 10000);
//         });

//         await Promise.race([sendPromise, timeoutPromise]);

//         sentCount++;
//         deliveredCount++;

//         // Mark as delivered
//         await supabase
//           .from('notification_logs')
//           .update({
//             status: 'delivered',
//             sent_at: new Date().toISOString(),
//             delivered_at: new Date().toISOString()
//           })
//           .eq('id', notificationLog.id);

//         console.log(`[Campaign Send] ✓ Delivered to ${subscriber.id.substring(0, 8)}...`);

//       } catch (error: any) {
//         const errorInfo = classifyPushError(error);
        
//         console.error(`[Campaign Send] ✗ Failed to send to ${subscriber.id.substring(0, 8)}...`);
//         console.error(`[Campaign Send]   Status: ${errorInfo.statusCode}`);
//         console.error(`[Campaign Send]   Error: ${errorInfo.errorMessage}`);
        
//         sentCount++;
//         failedCount++;

//         // Update notification log
//         await supabase
//           .from('notification_logs')
//           .update({
//             status: 'failed',
//             error_message: errorInfo.errorMessage,
//             sent_at: new Date().toISOString()
//           })
//           .eq('subscriber_id', subscriber.id)
//           .eq('campaign_id', campaign.id)
//           .eq('status', 'pending');

//         //  IMPROVED: Deactivate subscription if permanent failure
//         if (errorInfo.shouldDeactivate) {
//           console.log(`[Campaign Send] ⚠ Deactivating subscriber ${subscriber.id.substring(0, 8)}...`);
          
//           await supabase
//             .from('subscribers')
//             .update({
//               status: 'inactive',
//               endpoint: null,        // 🔥 ADD THIS!
//               p256dh_key: null,      // 🔥 ADD THIS!
//               auth_key: null,
//               updated_at: new Date().toISOString()
//             })
//             .eq('id', subscriber.id);
          
//           deactivatedCount++;
//         }
//       }

//       //  Add small delay to avoid rate limiting
//       await new Promise(resolve => setTimeout(resolve, 100));
//     }

//     // 5. Update campaign with final counts
//     await supabase
//       .from('campaigns')
//       .update({
//         status: 'completed',
//         sent_count: sentCount,
//         delivered_count: deliveredCount,
//         failed_count: failedCount,
//         sent_at: new Date().toISOString()
//       })
//       .eq('id', campaignId);

//     console.log(`\n[Campaign Send] ✓ Campaign complete:`);
//     console.log(`   Sent: ${sentCount}`);
//     console.log(`   Delivered: ${deliveredCount}`);
//     console.log(`   Failed: ${failedCount}`);
//     console.log(`   Deactivated: ${deactivatedCount}`);

//     return NextResponse.json({
//       success: true,
//       sent: sentCount,
//       delivered: deliveredCount,
//       failed: failedCount,
//       deactivated: deactivatedCount,
//       message: `Campaign sent to ${sentCount} subscribers, ${deliveredCount} delivered, ${deactivatedCount} subscriptions deactivated`
//     });

//   } catch (error: any) {
//     console.error('[Campaign Send] ✗ Fatal error:', error);
    
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message || 'Failed to send campaign',
//       },
//       { status: 500 }
//     );
//   }
// }










// app/api/campaigns/[id]/send/route.ts - FIXED VERSION

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { parseBranding } from '@/types/branding';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:mushiele02@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function classifyPushError(error: any): {
  shouldDeactivate: boolean;
  errorMessage: string;
  statusCode: number;
} {
  const errorMessage = error.message || String(error);
  const statusCode = error.statusCode || 0;

  console.log(`[Error Analysis] Status: ${statusCode}, Message: ${errorMessage}`);

  if (
    statusCode === 410 ||
    statusCode === 404 ||
    errorMessage.includes('expired') ||
    errorMessage.includes('unsubscribed') ||
    errorMessage.includes('invalid subscription') ||
    errorMessage.includes('SUBSCRIPTION_EXPIRED')
  ) {
    return {
      shouldDeactivate: true,
      errorMessage: 'Subscription expired or invalid',
      statusCode
    };
  }

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('UnauthorizedRegistration') ||
    errorMessage.includes('vapid')
  ) {
    return {
      shouldDeactivate: false,
      errorMessage: 'VAPID key mismatch - check your VAPID configuration',
      statusCode
    };
  }

  if (statusCode === 429) {
    return {
      shouldDeactivate: false,
      errorMessage: 'Rate limited by push service',
      statusCode
    };
  }

  if (
    statusCode >= 500 ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('ECONNREFUSED')
  ) {
    return {
      shouldDeactivate: false,
      errorMessage: 'Temporary network error',
      statusCode
    };
  }

  if (errorMessage.includes('unexpected response code')) {
    return {
      shouldDeactivate: true,
      errorMessage: `Unexpected response (${statusCode}) - subscription may be invalid`,
      statusCode
    };
  }

  return {
    shouldDeactivate: false,
    errorMessage: errorMessage,
    statusCode
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await context.params;
    
    console.log('[Campaign Send] ▶ Starting send for campaign:', campaignId);

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('[Campaign Send] ✗ Campaign not found');
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    console.log('[Campaign Send] ✓ Campaign loaded:', campaign.name);

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', campaign.website_id)
      .single();

    if (websiteError || !website) {
      console.error('[Campaign Send] ✗ Website not found');
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    console.log('[Campaign Send] ✓ Website loaded:', website.name);

    const branding = parseBranding(website.notification_branding);

    let query = supabase
      .from('subscribers')
      .select('*')
      .eq('website_id', campaign.website_id)
      .eq('status', 'active')
      .not('endpoint', 'is', null)
      .not('p256dh_key', 'is', null)
      .not('auth_key', 'is', null);

    if (campaign.segment === 'active') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte('last_seen_at', thirtyDaysAgo.toISOString());
    } else if (campaign.segment === 'inactive') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.lt('last_seen_at', thirtyDaysAgo.toISOString());
    }

    const { data: subscribers, error: subscribersError } = await query;

    if (subscribersError) {
      console.error('[Campaign Send] ✗ Error fetching subscribers:', subscribersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch subscribers' },
        { status: 500 }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      console.log('[Campaign Send] ⚠ No subscribers found');
      
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
        message: 'No active subscribers found'
      });
    }

    console.log(`[Campaign Send] ℹ Attempting to send to ${subscribers.length} subscribers`);

    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;
    let deactivatedCount = 0;

    for (const subscriber of subscribers) {
      try {
        if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
          console.error(`[Campaign Send] ✗ Invalid subscription keys for ${subscriber.id}`);
          failedCount++;
          
          await supabase.from('notification_logs').insert({
            campaign_id: campaign.id,
            subscriber_id: subscriber.id,
            website_id: campaign.website_id,
            status: 'failed',
            platform: subscriber.platform || 'web',
            error_message: 'Invalid subscription keys',
            sent_at: new Date().toISOString()
          });
          
          await supabase
            .from('subscribers')
            .update({ 
              status: 'inactive',
              endpoint: null,
              p256dh_key: null,
              auth_key: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', subscriber.id);
          
          deactivatedCount++;
          continue;
        }

        const { data: notificationLog, error: logError } = await supabase
          .from('notification_logs')
          .insert({
            campaign_id: campaign.id,
            subscriber_id: subscriber.id,
            website_id: campaign.website_id,
            status: 'pending',
            platform: subscriber.platform || 'web',
          })
          .select()
          .single();

        if (logError || !notificationLog) {
          console.error(`[Campaign Send] ✗ Failed to create log for ${subscriber.id}`);
          failedCount++;
          continue;
        }

        // ✅ FIX: Ensure URL is set at multiple levels for reliability
        const targetUrl = campaign.click_url || website.url || '/';
        
        console.log(`[Campaign Send] 🎯 Target URL for notification:`, targetUrl);

        const payload = {
          title: campaign.title,
          body: campaign.body,
          icon: branding.logo_url || campaign.icon_url || '/icon-192x192.png',
          badge: '/badge-96x96.png',
          image: campaign.image_url || undefined,
          tag: notificationLog.id,
          requireInteraction: false,
          // ✅ FIX: Add URL at top level (most reliable)
          url: targetUrl,
          click_url: targetUrl,
          // ✅ FIX: Also include in data object for compatibility
          data: {
            url: targetUrl,
            click_url: targetUrl,
            subscriber_id: subscriber.id,
            campaign_id: campaign.id,
            notification_id: notificationLog.id,
            website_id: website.id,
            journey_id: null,
            timestamp: new Date().toISOString()
          },
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

        console.log(`[Campaign Send] → Sending to ${subscriber.id.substring(0, 8)}...`);

        const sendPromise = webpush.sendNotification(
          {
            endpoint: subscriber.endpoint,
            keys: {
              p256dh: subscriber.p256dh_key,
              auth: subscriber.auth_key
            }
          },
          JSON.stringify(payload)
        );

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Notification send timeout')), 10000);
        });

        await Promise.race([sendPromise, timeoutPromise]);

        sentCount++;
        deliveredCount++;

        await supabase
          .from('notification_logs')
          .update({
            status: 'delivered',
            sent_at: new Date().toISOString(),
            delivered_at: new Date().toISOString()
          })
          .eq('id', notificationLog.id);

        console.log(`[Campaign Send] ✓ Delivered to ${subscriber.id.substring(0, 8)}...`);

      } catch (error: any) {
        const errorInfo = classifyPushError(error);
        
        console.error(`[Campaign Send] ✗ Failed to send to ${subscriber.id.substring(0, 8)}...`);
        console.error(`[Campaign Send]   Status: ${errorInfo.statusCode}`);
        console.error(`[Campaign Send]   Error: ${errorInfo.errorMessage}`);
        
        sentCount++;
        failedCount++;

        await supabase
          .from('notification_logs')
          .update({
            status: 'failed',
            error_message: errorInfo.errorMessage,
            sent_at: new Date().toISOString()
          })
          .eq('subscriber_id', subscriber.id)
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending');

        if (errorInfo.shouldDeactivate) {
          console.log(`[Campaign Send] ⚠ Deactivating subscriber ${subscriber.id.substring(0, 8)}...`);
          
          await supabase
            .from('subscribers')
            .update({
              status: 'inactive',
              endpoint: null,
              p256dh_key: null,
              auth_key: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', subscriber.id);
          
          deactivatedCount++;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await supabase
      .from('campaigns')
      .update({
        status: 'completed',
        sent_count: sentCount,
        delivered_count: deliveredCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    console.log(`\n[Campaign Send] ✓ Campaign complete:`);
    console.log(`   Sent: ${sentCount}`);
    console.log(`   Delivered: ${deliveredCount}`);
    console.log(`   Failed: ${failedCount}`);
    console.log(`   Deactivated: ${deactivatedCount}`);

    return NextResponse.json({
      success: true,
      sent: sentCount,
      delivered: deliveredCount,
      failed: failedCount,
      deactivated: deactivatedCount,
      message: `Campaign sent to ${sentCount} subscribers, ${deliveredCount} delivered, ${deactivatedCount} subscriptions deactivated`
    });

  } catch (error: any) {
    console.error('[Campaign Send] ✗ Fatal error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send campaign',
      },
      { status: 500 }
    );
  }
}