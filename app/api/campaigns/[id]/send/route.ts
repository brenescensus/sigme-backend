// // // ============================================
// // // app/api/campaigns/[id]/send/route.ts
// // // Send campaign to subscribers
// // // ============================================

// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
// // import webpush from 'web-push';

// // // Configure web-push
// // if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
// //   webpush.setVapidDetails(
// //     process.env.VAPID_SUBJECT || 'mailto:support@example.com',
// //     process.env.VAPID_PUBLIC_KEY,
// //     process.env.VAPID_PRIVATE_KEY
// //   );
// // }

// // export const POST = withAuth(
// //   async (req: NextRequest, user: AuthUser, context: any) => {
// //     try {
// //       const params = await context.params;
// //       const campaignId = params.id;

// //       const supabase = await getAuthenticatedClient(req);

// //       console.log('[Campaign Send] Starting send for campaign:', campaignId);

// //       // Get campaign details and verify ownership
// //       const { data: campaign, error: campaignError } = await supabase
// //         .from('campaigns')
// //         .select(`
// //           *,
// //           website:websites!inner(id, user_id, domain, name)
// //         `)
// //         .eq('id', campaignId)
// //         .eq('website.user_id', user.id)
// //         .single();

// //       if (campaignError || !campaign) {
// //         console.error('[Campaign Send] Campaign not found:', campaignError);
// //         return NextResponse.json(
// //           { error: 'Campaign not found or access denied' },
// //           { status: 404 }
// //         );
// //       }

// //       // Get subscribers based on segment
// //       let subscribersQuery = supabase
// //         .from('subscribers')
// //         .select('*')
// //         .eq('website_id', campaign.website_id)
// //         .eq('status', 'active'); // Use status field instead of is_active

// //       // Apply segment filters
// //       if (campaign.segment && campaign.segment !== 'all_subscribers') {
// //         const now = new Date();
// //         const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

// //         switch (campaign.segment) {
// //           case 'new':
// //             subscribersQuery = subscribersQuery.gte('subscribed_at', sevenDaysAgo.toISOString());
// //             break;
// //           case 'active':
// //             subscribersQuery = subscribersQuery.gte('last_seen_at', sevenDaysAgo.toISOString());
// //             break;
// //           case 'inactive':
// //             subscribersQuery = subscribersQuery.lt('last_seen_at', sevenDaysAgo.toISOString());
// //             break;
// //         }
// //       }

// //       const { data: subscribers, error: subsError } = await subscribersQuery;

// //       if (subsError) {
// //         console.error('[Campaign Send] Subscribers error:', subsError);
// //         return NextResponse.json(
// //           { error: 'Failed to fetch subscribers', details: subsError.message },
// //           { status: 400 }
// //         );
// //       }

// //       if (!subscribers || subscribers.length === 0) {
// //         console.log('[Campaign Send] No subscribers found');
// //         return NextResponse.json({
// //           success: true,
// //           sent: 0,
// //           delivered: 0,
// //           failed: 0,
// //           message: 'No subscribers found for this segment',
// //         });
// //       }

// //       console.log('[Campaign Send] Found subscribers:', subscribers.length);

// //       // Prepare notification payload
// //       const notificationPayload = {
// //         title: campaign.title,
// //         body: campaign.body,
// //         icon: campaign.icon_url || undefined,
// //         image: campaign.image_url || undefined,
// //         data: {
// //           url: campaign.click_url || campaign.website.domain,
// //           campaignId: campaign.id,
// //         },
// //         actions: campaign.actions || undefined,
// //       };

// //       // Send to all subscribers
// //       let sentCount = 0;
// //       let deliveredCount = 0;
// //       let failedCount = 0;
// //       const logs: Array<{
// //         campaign_id: string;
// //         subscriber_id: string;
// //         website_id: string;
// //         status: string;
// //         sent_at: string;
// //         error_message?: string;
// //       }> = [];

// //       for (const subscriber of subscribers) {
// //         // Validate required subscription fields
// //         if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
// //           console.error(`[Campaign Send] Invalid subscription for ${subscriber.id}`);
// //           sentCount++;
// //           failedCount++;
// //           logs.push({
// //             campaign_id: campaign.id,
// //             subscriber_id: subscriber.id,
// //             website_id: campaign.website_id,
// //             status: 'failed',
// //             error_message: 'Invalid subscription data',
// //             sent_at: new Date().toISOString(),
// //           });
// //           continue;
// //         }

// //         try {
// //           const subscription = {
// //             endpoint: subscriber.endpoint,
// //             keys: {
// //               p256dh: subscriber.p256dh_key,
// //               auth: subscriber.auth_key,
// //             },
// //           };

// //           await webpush.sendNotification(
// //             subscription,
// //             JSON.stringify(notificationPayload)
// //           );

// //           sentCount++;
// //           deliveredCount++;

// //           // Log success
// //           logs.push({
// //             campaign_id: campaign.id,
// //             subscriber_id: subscriber.id,
// //             website_id: campaign.website_id,
// //             status: 'delivered',
// //             sent_at: new Date().toISOString(),
// //           });

// //           console.log(`[Campaign Send] ✓ Sent to subscriber ${subscriber.id}`);
// //         } catch (error: any) {
// //           sentCount++;
// //           failedCount++;

// //           // Log failure
// //           logs.push({
// //             campaign_id: campaign.id,
// //             subscriber_id: subscriber.id,
// //             website_id: campaign.website_id,
// //             status: 'failed',
// //             error_message: error.message,
// //             sent_at: new Date().toISOString(),
// //           });

// //           console.error(`[Campaign Send] ✗ Failed for subscriber ${subscriber.id}:`, error.message);

// //           // If subscriber is gone (410), mark as inactive
// //           if (error.statusCode === 410) {
// //             await supabase
// //               .from('subscribers')
// //               .update({ status: 'inactive' })
// //               .eq('id', subscriber.id);
// //           }
// //         }
// //       }

// //       // Save logs in batches
// //       if (logs.length > 0) {
// //         const { error: logsError } = await supabase
// //           .from('notification_logs')
// //           .insert(logs);

// //         if (logsError) {
// //           console.error('[Campaign Send] Logs error:', logsError);
// //         }
// //       }

// //       // Update campaign stats
// //       const { error: updateError } = await supabase
// //         .from('campaigns')
// //         .update({
// //           sent_count: (campaign.sent_count || 0) + sentCount,
// //           delivered_count: (campaign.delivered_count || 0) + deliveredCount,
// //           failed_count: (campaign.failed_count || 0) + failedCount,
// //           status: 'completed',
// //           updated_at: new Date().toISOString(),
// //         })
// //         .eq('id', campaign.id);

// //       if (updateError) {
// //         console.error('[Campaign Send] Update error:', updateError);
// //       }

// //       console.log('[Campaign Send] Complete:', {
// //         sent: sentCount,
// //         delivered: deliveredCount,
// //         failed: failedCount,
// //       });

// //       return NextResponse.json({
// //         success: true,
// //         sent: sentCount,
// //         delivered: deliveredCount,
// //         failed: failedCount,
// //       });
// //     } catch (error: any) {
// //       console.error('[Campaign Send] Error:', error);
// //       return NextResponse.json(
// //         { error: 'Internal server error', details: error.message },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );


// // ============================================
// // app/api/campaigns/[id]/send/route.ts
// // FIXED VERSION - Uses the same notification endpoint as test notifications
// // ============================================

// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// export const POST = withAuth(
//   async (req: NextRequest, user: AuthUser, context: any) => {
//     try {
//       const params = await context.params;
//       const campaignId = params.id;

//       const supabase = await getAuthenticatedClient(req);

//       console.log('[Campaign Send] Starting send for campaign:', campaignId);

//       // Get campaign details and verify ownership
//       const { data: campaign, error: campaignError } = await supabase
//         .from('campaigns')
//         .select(`
//           *,
//           website:websites!inner(id, user_id, domain, name)
//         `)
//         .eq('id', campaignId)
//         .eq('website.user_id', user.id)
//         .single();

//       if (campaignError || !campaign) {
//         console.error('[Campaign Send] Campaign not found:', campaignError);
//         return NextResponse.json(
//           { error: 'Campaign not found or access denied' },
//           { status: 404 }
//         );
//       }

//       console.log('[Campaign Send] Campaign found:', campaign.name);
//       console.log('[Campaign Send] Website:', campaign.website.name);

//       // Update campaign status to 'sending'
//       await supabase
//         .from('campaigns')
//         .update({
//           status: 'sending',
//           updated_at: new Date().toISOString(),
//         })
//         .eq('id', campaignId);

//       // Get subscribers based on segment
//       let subscribersQuery = supabase
//         .from('subscribers')
//         .select('*')
//         .eq('website_id', campaign.website_id)
//         .eq('status', 'active');

//       // Apply segment filters
//       if (campaign.segment && campaign.segment !== 'all_subscribers') {
//         const now = new Date();
//         const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

//         switch (campaign.segment) {
//           case 'new':
//             subscribersQuery = subscribersQuery.gte('subscribed_at', sevenDaysAgo.toISOString());
//             break;
//           case 'active':
//             subscribersQuery = subscribersQuery.gte('last_seen_at', sevenDaysAgo.toISOString());
//             break;
//           case 'inactive':
//             subscribersQuery = subscribersQuery.lt('last_seen_at', sevenDaysAgo.toISOString());
//             break;
//         }
//       }

//       const { data: subscribers, error: subsError } = await subscribersQuery;

//       if (subsError) {
//         console.error('[Campaign Send] Subscribers error:', subsError);
        
//         // Update campaign status to failed
//         await supabase
//           .from('campaigns')
//           .update({ status: 'failed' })
//           .eq('id', campaignId);

//         return NextResponse.json(
//           { error: 'Failed to fetch subscribers', details: subsError.message },
//           { status: 400 }
//         );
//       }

//       if (!subscribers || subscribers.length === 0) {
//         console.log('[Campaign Send] No subscribers found');
        
//         // Update campaign to completed with zero sends
//         await supabase
//           .from('campaigns')
//           .update({ 
//             status: 'completed',
//             sent_count: 0,
//             delivered_count: 0,
//             failed_count: 0,
//           })
//           .eq('id', campaignId);

//         return NextResponse.json({
//           success: true,
//           sent: 0,
//           delivered: 0,
//           failed: 0,
//           message: 'No subscribers found for this segment',
//         });
//       }

//       console.log('[Campaign Send] Found subscribers:', subscribers.length);

//       // ⚠️ IMPORTANT: Use the SAME notification sending logic as test notifications
//       // Call the /notifications/send endpoint internally

//       const notificationPayload = {
//         websiteId: campaign.website_id,
//         campaignId: campaign.id, // ← Link to campaign
//         notification: {
//           title: campaign.title,
//           body: campaign.body,
//           icon: campaign.icon_url || undefined,
//           image: campaign.image_url || undefined,
//           url: campaign.click_url || campaign.website.domain,
//           actions: campaign.actions || undefined,
//         },
//         // Send to all subscribers (don't specify targetSubscriberIds to send to all)
//       };

//       console.log('[Campaign Send] Calling notifications/send endpoint...');
//       console.log('[Campaign Send] Payload:', {
//         websiteId: notificationPayload.websiteId,
//         campaignId: notificationPayload.campaignId,
//         subscribersCount: subscribers.length,
//       });

//       // Make internal API call to notifications/send
//       const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
//       const token = req.headers.get('authorization')?.replace('Bearer ', '');

//       const sendResponse = await fetch(`${apiBaseUrl}/api/notifications/send`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${token}`,
//         },
//         body: JSON.stringify(notificationPayload),
//       });

//       const sendResult = await sendResponse.json();

//       console.log('[Campaign Send] Send result:', sendResult);

//       if (!sendResult.success) {
//         throw new Error(sendResult.error || 'Failed to send notifications');
//       }

//       // Update campaign with final stats
//       const { error: updateError } = await supabase
//         .from('campaigns')
//         .update({
//           sent_count: sendResult.sent || 0,
//           delivered_count: sendResult.delivered || 0,
//           failed_count: sendResult.failed || 0,
//           status: 'sent', // ← Mark as sent/completed
//           sent_at: new Date().toISOString(),
//           updated_at: new Date().toISOString(),
//         })
//         .eq('id', campaignId);

//       if (updateError) {
//         console.error('[Campaign Send] Update error:', updateError);
//       }

//       console.log('[Campaign Send] ✅ Complete:', {
//         sent: sendResult.sent,
//         delivered: sendResult.delivered,
//         failed: sendResult.failed,
//       });

//       return NextResponse.json({
//         success: true,
//         sent: sendResult.sent || 0,
//         delivered: sendResult.delivered || 0,
//         failed: sendResult.failed || 0,
//       });

//     } catch (error: any) {
//       console.error('[Campaign Send] ❌ Error:', error);

//       // Try to update campaign status to failed
//       try {
//         const params = await context.params;
//         const supabase = await getAuthenticatedClient(req);
//         await supabase
//           .from('campaigns')
//           .update({ status: 'failed' })
//           .eq('id', params.id);
//       } catch (e) {
//         console.error('[Campaign Send] Failed to update campaign status:', e);
//       }

//       return NextResponse.json(
//         { error: 'Internal server error', details: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );

// ============================================
// app/api/campaigns/[id]/send/route.ts
// FIXED - Proper URL resolution for Vercel
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

export const POST = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const campaignId = params.id;

      const supabase = await getAuthenticatedClient(req);

      console.log('[Campaign Send] Starting send for campaign:', campaignId);

      // Get campaign details and verify ownership
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          *,
          website:websites!inner(id, user_id, domain, name)
        `)
        .eq('id', campaignId)
        .eq('website.user_id', user.id)
        .single();

      if (campaignError || !campaign) {
        console.error('[Campaign Send] Campaign not found:', campaignError);
        return NextResponse.json(
          { error: 'Campaign not found or access denied' },
          { status: 404 }
        );
      }

      console.log('[Campaign Send] Campaign found:', campaign.name);
      console.log('[Campaign Send] Website:', campaign.website.name);

      // Update campaign status to 'sending'
      await supabase
        .from('campaigns')
        .update({
          status: 'sending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      // Get subscribers based on segment
      let subscribersQuery = supabase
        .from('subscribers')
        .select('*')
        .eq('website_id', campaign.website_id)
        .eq('status', 'active');

      // Apply segment filters
      if (campaign.segment && campaign.segment !== 'all_subscribers') {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        switch (campaign.segment) {
          case 'new':
            subscribersQuery = subscribersQuery.gte('subscribed_at', sevenDaysAgo.toISOString());
            break;
          case 'active':
            subscribersQuery = subscribersQuery.gte('last_seen_at', sevenDaysAgo.toISOString());
            break;
          case 'inactive':
            subscribersQuery = subscribersQuery.lt('last_seen_at', sevenDaysAgo.toISOString());
            break;
        }
      }

      const { data: subscribers, error: subsError } = await subscribersQuery;

      if (subsError) {
        console.error('[Campaign Send] Subscribers error:', subsError);
        
        // Update campaign status to failed
        await supabase
          .from('campaigns')
          .update({ status: 'failed' })
          .eq('id', campaignId);

        return NextResponse.json(
          { error: 'Failed to fetch subscribers', details: subsError.message },
          { status: 400 }
        );
      }

      if (!subscribers || subscribers.length === 0) {
        console.log('[Campaign Send] No subscribers found');
        
        // Update campaign to completed with zero sends
        await supabase
          .from('campaigns')
          .update({ 
            status: 'completed',
            sent_count: 0,
            delivered_count: 0,
            failed_count: 0,
          })
          .eq('id', campaignId);

        return NextResponse.json({
          success: true,
          sent: 0,
          delivered: 0,
          failed: 0,
          message: 'No subscribers found for this segment',
        });
      }

      console.log('[Campaign Send] Found subscribers:', subscribers.length);

      // Prepare notification payload
      const notificationPayload = {
        websiteId: campaign.website_id,
        campaignId: campaign.id,
        notification: {
          title: campaign.title,
          body: campaign.body,
          icon: campaign.icon_url || undefined,
          image: campaign.image_url || undefined,
          url: campaign.click_url || campaign.website.domain,
          actions: campaign.actions || undefined,
        },
      };

      console.log('[Campaign Send] Calling notifications/send endpoint...');

      // ✅ FIX: Get the correct base URL for internal API calls
      // Use the host from the incoming request, or fallback to env variable
      const protocol = req.headers.get('x-forwarded-proto') || 'https';
      const host = req.headers.get('host') || req.headers.get('x-forwarded-host');
      
      // Construct the full API URL
      let apiBaseUrl: string;
      if (host) {
        apiBaseUrl = `${protocol}://${host}`;
      } else if (process.env.VERCEL_URL) {
        apiBaseUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      }

      console.log('[Campaign Send] Using API base URL:', apiBaseUrl);

      const token = req.headers.get('authorization')?.replace('Bearer ', '');

      const sendResponse = await fetch(`${apiBaseUrl}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(notificationPayload),
      });

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error('[Campaign Send] Notification send failed:', {
          status: sendResponse.status,
          error: errorText,
        });
        throw new Error(`Failed to send notifications: ${sendResponse.status} - ${errorText}`);
      }

      const sendResult = await sendResponse.json();

      console.log('[Campaign Send] Send result:', sendResult);

      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Failed to send notifications');
      }

      // Update campaign with final stats
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          sent_count: sendResult.sent || 0,
          delivered_count: sendResult.delivered || 0,
          failed_count: sendResult.failed || 0,
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (updateError) {
        console.error('[Campaign Send] Update error:', updateError);
      }

      console.log('[Campaign Send] ✅ Complete:', {
        sent: sendResult.sent,
        delivered: sendResult.delivered,
        failed: sendResult.failed,
      });

      return NextResponse.json({
        success: true,
        sent: sendResult.sent || 0,
        delivered: sendResult.delivered || 0,
        failed: sendResult.failed || 0,
      });

    } catch (error: any) {
      console.error('[Campaign Send] ❌ Error:', error);
      console.error('[Campaign Send] Error stack:', error.stack);

      // Try to update campaign status to failed
      try {
        const params = await context.params;
        const supabase = await getAuthenticatedClient(req);
        await supabase
          .from('campaigns')
          .update({ status: 'failed' })
          .eq('id', params.id);
      } catch (e) {
        console.error('[Campaign Send] Failed to update campaign status:', e);
      }

      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  }
);