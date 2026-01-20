// // app/api/campaigns/[id]/send/route.ts
// // SEND campaign immediately

// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// export const POST_SEND = withAuth(
//   async (req: NextRequest, user: AuthUser, context: any) => {
//     try {
//       const params = await context.params;
//       const campaignId = params.id;

//       const supabase = await getAuthenticatedClient(req);

//       // Fetch campaign with ownership verification
//       const { data: campaign, error: campaignError } = await supabase
//         .from('campaigns')
//         .select(`
//           *,
//           website:websites!inner(id, user_id, name)
//         `)
//         .eq('id', campaignId)
//         .eq('website.user_id', user.id)
//         .single();

//       if (campaignError || !campaign) {
//         return NextResponse.json(
//           { error: 'Campaign not found or access denied' },
//           { status: 404 }
//         );
//       }

//       // Get target subscribers based on campaign filters
//       let query = supabase
//         .from('subscribers')
//         .select('*')
//         .eq('website_id', campaign.website_id)
//         .eq('status', 'active');

//       // Apply targeting filters
//       if (campaign.target_browsers && campaign.target_browsers.length > 0) {
//         query = query.in('browser', campaign.target_browsers);
//       }

//       if (campaign.target_devices && campaign.target_devices.length > 0) {
//         query = query.in('device_type', campaign.target_devices);
//       }

//       if (campaign.target_countries && campaign.target_countries.length > 0) {
//         query = query.in('country', campaign.target_countries);
//       }

//       // Apply segment filters
//       if (campaign.segment === 'new') {
//         const sevenDaysAgo = new Date();
//         sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
//         query = query.gte('subscribed_at', sevenDaysAgo.toISOString());
//       } else if (campaign.segment === 'active') {
//         const thirtyDaysAgo = new Date();
//         thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//         query = query.gte('last_seen_at', thirtyDaysAgo.toISOString());
//       } else if (campaign.segment === 'inactive') {
//         const thirtyDaysAgo = new Date();
//         thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//         query = query.lt('last_seen_at', thirtyDaysAgo.toISOString());
//       }

//       const { data: subscribers, error: subsError } = await query;

//       if (subsError) {
//         console.error('[Campaign Send] Subscribers query error:', subsError);
//         return NextResponse.json(
//           { error: 'Failed to fetch subscribers' },
//           { status: 500 }
//         );
//       }

//       if (!subscribers || subscribers.length === 0) {
//         return NextResponse.json({
//           success: true,
//           sent: 0,
//           failed: 0,
//           message: 'No matching subscribers found',
//         });
//       }

//       // Import notification sender
//       const { sendBatchNotifications } = await import('@/lib/push/sender');

//       // Prepare notification payload
//       const notification = {
//         title: campaign.title,
//         body: campaign.body,
//         icon: campaign.icon_url || '/icon-192.png',
//         badge: '/badge-72.png',
//         image: campaign.image_url,
//         url: campaign.click_url || '/',
//         tag: `campaign-${campaignId}`,
//         actions: campaign.actions || [],
//       };

//       // Send notifications
//       const result = await sendBatchNotifications(subscribers, notification, 50);

//       // Update campaign stats
//       await supabase
//         .from('campaigns')
//         .update({
//           sent_count: (campaign.sent_count || 0) + result.sent,
//           failed_count: (campaign.failed_count || 0) + result.failed,
//           last_sent_at: new Date().toISOString(),
//           status: campaign.is_recurring ? 'recurring' : 'completed',
//         })
//         .eq('id', campaignId);

//       // Update next_send_at for recurring campaigns
//       if (campaign.is_recurring && campaign.recurrence_config) {
//         // Calculate next send time based on recurrence pattern
//         // This is simplified - you'd implement proper date calculation
//         const nextSend = new Date(campaign.next_send_at || new Date());
        
//         if (campaign.recurrence_pattern?.includes('daily')) {
//           nextSend.setDate(nextSend.getDate() + 1);
//         } else if (campaign.recurrence_pattern?.includes('weekly')) {
//           nextSend.setDate(nextSend.getDate() + 7);
//         } else if (campaign.recurrence_pattern?.includes('monthly')) {
//           nextSend.setMonth(nextSend.getMonth() + 1);
//         }

//         await supabase
//           .from('campaigns')
//           .update({ next_send_at: nextSend.toISOString() })
//           .eq('id', campaignId);
//       }

//       // Mark expired/invalid subscriptions
//       if (result.expiredSubscriptions.length > 0) {
//         await supabase
//           .from('subscribers')
//           .update({ status: 'inactive' })
//           .in('id', result.expiredSubscriptions);
//       }

//       if (result.vapidMismatches && result.vapidMismatches.length > 0) {
//         await supabase
//           .from('subscribers')
//           .update({ status: 'inactive' })
//           .in('id', result.vapidMismatches);
//       }

//       return NextResponse.json({
//         success: true,
//         sent: result.sent,
//         failed: result.failed,
//         total: result.total,
//         expiredSubscriptions: result.expiredSubscriptions.length,
//         vapidMismatches: result.vapidMismatches?.length || 0,
//         errors: result.errors,
//       });
//     } catch (error: any) {
//       console.error('[Campaign Send] Error:', error);
//       return NextResponse.json(
//         { error: 'Internal server error', details: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );


