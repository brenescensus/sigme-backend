// // // // // app/api/campaigns/[id]/send/route.ts

// // // // import { NextRequest, NextResponse } from 'next/server';
// // // // import { createClient } from '@supabase/supabase-js';
// // // // import webpush from 'web-push';
// // // // import { parseBranding } from '@/types/branding';

// // // // const supabase = createClient(
// // // //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // // //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // // // );

// // // // // Configure web-push with VAPID keys
// // // // webpush.setVapidDetails(
// // // //   process.env.VAPID_SUBJECT || 'mailto:notifications@yourdomain.com',
// // // //   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
// // // //   process.env.VAPID_PRIVATE_KEY!
// // // // );

// // // // //  Send a campaign to subscribers
 
// // // // export async function POST(
// // // //   request: NextRequest,
// // // //   context: { params: Promise<{ id: string }> }  //  FIXED: params is a Promise
// // // // ) {
// // // //   try {
// // // //     //  FIXED: Await the params
// // // //     const { id: campaignId } = await context.params;
    
// // // //     console.log('[Campaign Send] Starting send for campaign:', campaignId);

// // // //     // 1. Get campaign details
// // // //     const { data: campaign, error: campaignError } = await supabase
// // // //       .from('campaigns')
// // // //       .select('*')
// // // //       .eq('id', campaignId)
// // // //       .single();

// // // //     if (campaignError) {
// // // //       console.error('[Campaign Send] Error fetching campaign:', campaignError);
// // // //       return NextResponse.json(
// // // //         { success: false, error: 'Campaign not found', details: campaignError.message },
// // // //         { status: 404 }
// // // //       );
// // // //     }

// // // //     if (!campaign) {
// // // //       return NextResponse.json(
// // // //         { success: false, error: 'Campaign not found' },
// // // //         { status: 404 }
// // // //       );
// // // //     }

// // // //     console.log('[Campaign Send] Campaign found:', campaign.name);
// // // //     console.log('[Campaign Send] Website ID:', campaign.website_id);
// // // //     console.log('[Campaign Send] Segment:', campaign.segment);

// // // //     // 2. Get subscribers based on segment
// // // //     let query = supabase
// // // //       .from('subscribers')
// // // //       .select('*')
// // // //       .eq('website_id', campaign.website_id)
// // // //       .eq('status', 'active')
// // // //       .not('endpoint', 'is', null);

// // // //     // Apply segment filters
// // // //     if (campaign.segment === 'active') {
// // // //       const thirtyDaysAgo = new Date();
// // // //       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
// // // //       query = query.gte('last_seen_at', thirtyDaysAgo.toISOString());
// // // //       console.log('[Campaign Send] Filtering for active users (last seen >= 30 days ago)');
// // // //     } else if (campaign.segment === 'inactive') {
// // // //       const thirtyDaysAgo = new Date();
// // // //       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
// // // //       query = query.lt('last_seen_at', thirtyDaysAgo.toISOString());
// // // //       console.log('[Campaign Send] Filtering for inactive users (last seen < 30 days ago)');
// // // //     } else {
// // // //       console.log('[Campaign Send] Sending to all active subscribers');
// // // //     }

// // // //     const { data: subscribers, error: subscribersError } = await query;

// // // //     if (subscribersError) {
// // // //       console.error('[Campaign Send] Error fetching subscribers:', subscribersError);
// // // //       return NextResponse.json(
// // // //         { success: false, error: 'Failed to fetch subscribers', details: subscribersError.message },
// // // //         { status: 500 }
// // // //       );
// // // //     }

// // // //     if (!subscribers || subscribers.length === 0) {
// // // //       console.log('[Campaign Send] No subscribers found');
      
// // // //       // Still update campaign status
// // // //       await supabase
// // // //         .from('campaigns')
// // // //         .update({
// // // //           status: 'completed',
// // // //           sent_count: 0,
// // // //           delivered_count: 0,
// // // //           failed_count: 0,
// // // //           sent_at: new Date().toISOString()
// // // //         })
// // // //         .eq('id', campaignId);

// // // //       return NextResponse.json({
// // // //         success: true,
// // // //         sent: 0,
// // // //         delivered: 0,
// // // //         failed: 0,
// // // //         message: 'No active subscribers found for this segment'
// // // //       });
// // // //     }

// // // //     console.log(`[Campaign Send] Found ${subscribers.length} subscribers to send to`);

// // // //     let sent = 0;
// // // //     let delivered = 0;
// // // //     let failed = 0;

// // // //     // 3. Send notifications to each subscriber
// // // //     for (const subscriber of subscribers) {
// // // //       try {
// // // //         // Validate subscription keys
// // // //         if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
// // // //           console.error(`[Campaign Send] Invalid subscription for ${subscriber.id}`);
// // // //           failed++;
          
// // // //           // Log invalid subscription
// // // //           await supabase.from('notification_logs').insert({
// // // //             campaign_id: campaign.id,
// // // //             subscriber_id: subscriber.id,
// // // //             website_id: campaign.website_id,
// // // //             status: 'failed',
// // // //             platform: subscriber.platform || 'web',
// // // //             error_message: 'Invalid subscription keys',
// // // //             sent_at: new Date().toISOString()
// // // //           });
          
// // // //           continue;
// // // //         }

// // // //         //  CRITICAL: Include subscriber_id and campaign_id in notification data
// // // //         const payload = {
// // // //           title: campaign.title,
// // // //           body: campaign.body,
// // // //           icon: campaign.icon_url || '/icon.png',
// // // //           badge: '/badge.png',
// // // //           image: campaign.image_url || undefined,
// // // //           data: {
// // // //             url: campaign.click_url || '/',
// // // //             subscriber_id: subscriber.id,    // ← Required for click tracking
// // // //             campaign_id: campaign.id,        // ← Required for click tracking
// // // //             journey_id: null,
// // // //             timestamp: new Date().toISOString()
// // // //           }
// // // //         };

// // // //         console.log(`[Campaign Send] Sending to subscriber: ${subscriber.id}`);

// // // //         // Send push notification
// // // //         await webpush.sendNotification(
// // // //           {
// // // //             endpoint: subscriber.endpoint,
// // // //             keys: {
// // // //               p256dh: subscriber.p256dh_key,
// // // //               auth: subscriber.auth_key
// // // //             }
// // // //           },
// // // //           JSON.stringify(payload)
// // // //         );

// // // //         sent++;
// // // //         delivered++;

// // // //         // Log successful delivery
// // // //         await supabase.from('notification_logs').insert({
// // // //           campaign_id: campaign.id,
// // // //           subscriber_id: subscriber.id,
// // // //           website_id: campaign.website_id,
// // // //           status: 'delivered',
// // // //           platform: subscriber.platform || 'web',
// // // //           sent_at: new Date().toISOString(),
// // // //           delivered_at: new Date().toISOString()
// // // //         });

// // // //         console.log(`[Campaign Send]  Successfully sent to ${subscriber.id}`);

// // // //       } catch (error: any) {
// // // //         console.error(`[Campaign Send]  Failed to send to ${subscriber.id}:`, error.message);
// // // //         failed++;

// // // //         // Log failure
// // // //         await supabase.from('notification_logs').insert({
// // // //           campaign_id: campaign.id,
// // // //           subscriber_id: subscriber.id,
// // // //           website_id: campaign.website_id,
// // // //           status: 'failed',
// // // //           platform: subscriber.platform || 'web',
// // // //           error_message: error.message,
// // // //           sent_at: new Date().toISOString()
// // // //         });
// // // //       }
// // // //     }

// // // //     // 4. Update campaign with results
// // // //     const { error: updateError } = await supabase
// // // //       .from('campaigns')
// // // //       .update({
// // // //         status: 'completed',
// // // //         sent_count: sent,
// // // //         delivered_count: delivered,
// // // //         failed_count: failed,
// // // //         sent_at: new Date().toISOString()
// // // //       })
// // // //       .eq('id', campaignId);

// // // //     if (updateError) {
// // // //       console.error('[Campaign Send] Error updating campaign:', updateError);
// // // //     }

// // // //     console.log(`[Campaign Send]  Complete - Sent: ${sent}, Delivered: ${delivered}, Failed: ${failed}`);

// // // //     return NextResponse.json({
// // // //       success: true,
// // // //       sent,
// // // //       delivered,
// // // //       failed,
// // // //       message: `Campaign sent successfully to ${delivered} subscribers`
// // // //     });

// // // //   } catch (error: any) {
// // // //     console.error('[Campaign Send]  Fatal error:', error);
// // // //     console.error('[Campaign Send] Error stack:', error.stack);
    
// // // //     return NextResponse.json(
// // // //       {
// // // //         success: false,
// // // //         error: error.message || 'Failed to send campaign',
// // // //         details: error.stack
// // // //       },
// // // //       { status: 500 }
// // // //     );
// // // //   }
// // // // }



// // // // app/api/campaigns/[id]/send/route.ts

// // // import { NextRequest, NextResponse } from 'next/server';
// // // import { createClient } from '@supabase/supabase-js';
// // // import webpush from 'web-push';
// // // import { parseBranding } from '@/types/branding';

// // // const supabase = createClient(
// // //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // // );

// // // // Configure web-push with VAPID keys
// // // webpush.setVapidDetails(
// // //   process.env.VAPID_SUBJECT || 'mailto:notifications@yourdomain.com',
// // //   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
// // //   process.env.VAPID_PRIVATE_KEY!
// // // );

// // // //  Send a campaign to subscribers
 
// // // export async function POST(
// // //   request: NextRequest,
// // //   context: { params: Promise<{ id: string }> }  //  FIXED: params is a Promise
// // // ) {
// // //   try {
// // //     //  FIXED: Await the params
// // //     const { id: campaignId } = await context.params;
    
// // //     console.log('[Campaign Send] Starting send for campaign:', campaignId);

// // //     // 1. Get campaign details
// // //     const { data: campaign, error: campaignError } = await supabase
// // //       .from('campaigns')
// // //       .select('*')
// // //       .eq('id', campaignId)
// // //       .single();

// // //     if (campaignError) {
// // //       console.error('[Campaign Send] Error fetching campaign:', campaignError);
// // //       return NextResponse.json(
// // //         { success: false, error: 'Campaign not found', details: campaignError.message },
// // //         { status: 404 }
// // //       );
// // //     }

// // //     if (!campaign) {
// // //       return NextResponse.json(
// // //         { success: false, error: 'Campaign not found' },
// // //         { status: 404 }
// // //       );
// // //     }

// // //     console.log('[Campaign Send] Campaign found:', campaign.name);
// // //     console.log('[Campaign Send] Website ID:', campaign.website_id);
// // //     console.log('[Campaign Send] Segment:', campaign.segment);

// // //     // 1.5 Fetch website with branding information
// // //     const { data: website, error: websiteError } = await supabase
// // //       .from('websites')
// // //       .select('*')
// // //       .eq('id', campaign.website_id)
// // //       .single();

// // //     if (websiteError || !website) {
// // //       console.error('[Campaign Send] Error fetching website:', websiteError);
// // //       return NextResponse.json(
// // //         { success: false, error: 'Website not found', details: websiteError?.message },
// // //         { status: 404 }
// // //       );
// // //     }

// // //     // Parse and prepare branding data
// // //     const branding = parseBranding(website.notification_branding);

// // //     console.log('[Campaign Send] Using branding:', {
// // //       hasLogo: !!branding.logo_url,
// // //       primaryColor: branding.primary_color,
// // //       position: branding.notification_position,
// // //     });

// // //     // 2. Get subscribers based on segment
// // //     let query = supabase
// // //       .from('subscribers')
// // //       .select('*')
// // //       .eq('website_id', campaign.website_id)
// // //       .eq('status', 'active')
// // //       .not('endpoint', 'is', null);

// // //     // Apply segment filters
// // //     if (campaign.segment === 'active') {
// // //       const thirtyDaysAgo = new Date();
// // //       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
// // //       query = query.gte('last_seen_at', thirtyDaysAgo.toISOString());
// // //       console.log('[Campaign Send] Filtering for active users (last seen >= 30 days ago)');
// // //     } else if (campaign.segment === 'inactive') {
// // //       const thirtyDaysAgo = new Date();
// // //       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
// // //       query = query.lt('last_seen_at', thirtyDaysAgo.toISOString());
// // //       console.log('[Campaign Send] Filtering for inactive users (last seen < 30 days ago)');
// // //     } else {
// // //       console.log('[Campaign Send] Sending to all active subscribers');
// // //     }

// // //     const { data: subscribers, error: subscribersError } = await query;

// // //     if (subscribersError) {
// // //       console.error('[Campaign Send] Error fetching subscribers:', subscribersError);
// // //       return NextResponse.json(
// // //         { success: false, error: 'Failed to fetch subscribers', details: subscribersError.message },
// // //         { status: 500 }
// // //       );
// // //     }

// // //     if (!subscribers || subscribers.length === 0) {
// // //       console.log('[Campaign Send] No subscribers found');
      
// // //       // Still update campaign status
// // //       await supabase
// // //         .from('campaigns')
// // //         .update({
// // //           status: 'completed',
// // //           sent_count: 0,
// // //           delivered_count: 0,
// // //           failed_count: 0,
// // //           sent_at: new Date().toISOString()
// // //         })
// // //         .eq('id', campaignId);

// // //       return NextResponse.json({
// // //         success: true,
// // //         sent: 0,
// // //         delivered: 0,
// // //         failed: 0,
// // //         message: 'No active subscribers found for this segment'
// // //       });
// // //     }

// // //     console.log(`[Campaign Send] Found ${subscribers.length} subscribers to send to`);

// // //     let sent = 0;
// // //     let delivered = 0;
// // //     let failed = 0;

// // //     // 3. Send notifications to each subscriber
// // //     for (const subscriber of subscribers) {
// // //       try {
// // //         // Validate subscription keys
// // //         if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
// // //           console.error(`[Campaign Send] Invalid subscription for ${subscriber.id}`);
// // //           failed++;
          
// // //           // Log invalid subscription
// // //           await supabase.from('notification_logs').insert({
// // //             campaign_id: campaign.id,
// // //             subscriber_id: subscriber.id,
// // //             website_id: campaign.website_id,
// // //             status: 'failed',
// // //             platform: subscriber.platform || 'web',
// // //             error_message: 'Invalid subscription keys',
// // //             sent_at: new Date().toISOString()
// // //           });
          
// // //           continue;
// // //         }

// // //         //  CRITICAL: Include subscriber_id, campaign_id, AND BRANDING in notification data
// // //         const payload = {
// // //           title: campaign.title,
// // //           body: campaign.body,
// // //           icon: branding.logo_url || campaign.icon_url || '/icon.png',
// // //           badge: '/badge.png',
// // //           image: campaign.image_url || undefined,
// // //           data: {
// // //             url: campaign.click_url || website.url || '/',
// // //             subscriber_id: subscriber.id,    // ← Required for click tracking
// // //             campaign_id: campaign.id,        // ← Required for click tracking
// // //             journey_id: null,
// // //             timestamp: new Date().toISOString()
// // //           },
// // //           // ✨ NEW: Include branding data in the payload
// // //           branding: {
// // //             primary_color: branding.primary_color,
// // //             secondary_color: branding.secondary_color,
// // //             logo_url: branding.logo_url,
// // //             font_family: branding.font_family,
// // //             button_style: branding.button_style,
// // //             notification_position: branding.notification_position,
// // //             animation_style: branding.animation_style,
// // //             show_logo: branding.show_logo,
// // //             show_branding: branding.show_branding,
// // //           }
// // //         };

// // //         console.log(`[Campaign Send] Sending to subscriber: ${subscriber.id}`);

// // //         // Send push notification
// // //         await webpush.sendNotification(
// // //           {
// // //             endpoint: subscriber.endpoint,
// // //             keys: {
// // //               p256dh: subscriber.p256dh_key,
// // //               auth: subscriber.auth_key
// // //             }
// // //           },
// // //           JSON.stringify(payload)
// // //         );

// // //         sent++;
// // //         delivered++;

// // //         // Log successful delivery
// // //         await supabase.from('notification_logs').insert({
// // //           campaign_id: campaign.id,
// // //           subscriber_id: subscriber.id,
// // //           website_id: campaign.website_id,
// // //           status: 'delivered',
// // //           platform: subscriber.platform || 'web',
// // //           sent_at: new Date().toISOString(),
// // //           delivered_at: new Date().toISOString()
// // //         });

// // //         console.log(`[Campaign Send]  Successfully sent to ${subscriber.id}`);

// // //       } catch (error: any) {
// // //         console.error(`[Campaign Send]  Failed to send to ${subscriber.id}:`, error.message);
// // //         failed++;

// // //         // Log failure
// // //         await supabase.from('notification_logs').insert({
// // //           campaign_id: campaign.id,
// // //           subscriber_id: subscriber.id,
// // //           website_id: campaign.website_id,
// // //           status: 'failed',
// // //           platform: subscriber.platform || 'web',
// // //           error_message: error.message,
// // //           sent_at: new Date().toISOString()
// // //         });
// // //       }
// // //     }

// // //     // 4. Update campaign with results
// // //     const { error: updateError } = await supabase
// // //       .from('campaigns')
// // //       .update({
// // //         status: 'completed',
// // //         sent_count: sent,
// // //         delivered_count: delivered,
// // //         failed_count: failed,
// // //         sent_at: new Date().toISOString()
// // //       })
// // //       .eq('id', campaignId);

// // //     if (updateError) {
// // //       console.error('[Campaign Send] Error updating campaign:', updateError);
// // //     }

// // //     console.log(`[Campaign Send]  Complete - Sent: ${sent}, Delivered: ${delivered}, Failed: ${failed}`);

// // //     return NextResponse.json({
// // //       success: true,
// // //       sent,
// // //       delivered,
// // //       failed,
// // //       message: `Campaign sent successfully to ${delivered} subscribers`
// // //     });

// // //   } catch (error: any) {
// // //     console.error('[Campaign Send]  Fatal error:', error);
// // //     console.error('[Campaign Send] Error stack:', error.stack);
    
// // //     return NextResponse.json(
// // //       {
// // //         success: false,
// // //         error: error.message || 'Failed to send campaign',
// // //         details: error.stack
// // //       },
// // //       { status: 500 }
// // //     );
// // //   }
// // // }




























// // // app/api/campaigns/[id]/send/route.ts

// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@supabase/supabase-js';
// // import webpush from 'web-push';
// // import { parseBranding } from '@/types/branding';

// // const supabase = createClient(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // // Configure web-push with VAPID keys
// // webpush.setVapidDetails(
// //   process.env.VAPID_SUBJECT || 'mailto:notifications@yourdomain.com',
// //   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
// //   process.env.VAPID_PRIVATE_KEY!
// // );

// // export async function POST(
// //   request: NextRequest,
// //   context: { params: Promise<{ id: string }> }
// // ) {
// //   try {
// //     const { id: campaignId } = await context.params;
    
// //     console.log('[Campaign Send] Starting send for campaign:', campaignId);

// //     // 1. Get campaign details
// //     const { data: campaign, error: campaignError } = await supabase
// //       .from('campaigns')
// //       .select('*')
// //       .eq('id', campaignId)
// //       .single();

// //     if (campaignError || !campaign) {
// //       console.error('[Campaign Send] Error fetching campaign:', campaignError);
// //       return NextResponse.json(
// //         { success: false, error: 'Campaign not found', details: campaignError?.message },
// //         { status: 404 }
// //       );
// //     }

// //     console.log('[Campaign Send] Campaign found:', campaign.name);

// //     // 1.5 Fetch website with branding information
// //     const { data: website, error: websiteError } = await supabase
// //       .from('websites')
// //       .select('*')
// //       .eq('id', campaign.website_id)
// //       .single();

// //     if (websiteError || !website) {
// //       console.error('[Campaign Send] Error fetching website:', websiteError);
// //       return NextResponse.json(
// //         { success: false, error: 'Website not found', details: websiteError?.message },
// //         { status: 404 }
// //       );
// //     }

// //     const branding = parseBranding(website.notification_branding);

// //     // 2. Get subscribers based on segment
// //     let query = supabase
// //       .from('subscribers')
// //       .select('*')
// //       .eq('website_id', campaign.website_id)
// //       .eq('status', 'active')
// //       .not('endpoint', 'is', null);

// //     // Apply segment filters
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
// //       console.error('[Campaign Send] Error fetching subscribers:', subscribersError);
// //       return NextResponse.json(
// //         { success: false, error: 'Failed to fetch subscribers', details: subscribersError.message },
// //         { status: 500 }
// //       );
// //     }

// //     if (!subscribers || subscribers.length === 0) {
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
// //         message: 'No active subscribers found for this segment'
// //       });
// //     }

// //     console.log(`[Campaign Send] Found ${subscribers.length} subscribers to send to`);

// //     let sent = 0;
// //     let delivered = 0;
// //     let failed = 0;

// //     // 3. Send notifications to each subscriber
// //     for (const subscriber of subscribers) {
// //       try {
// //         // Validate subscription keys
// //         if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
// //           console.error(`[Campaign Send] Invalid subscription for ${subscriber.id}`);
// //           failed++;
          
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

// //         const payload = {
// //           title: campaign.title,
// //           body: campaign.body,
// //           icon: branding.logo_url || campaign.icon_url || '/icon.png',
// //           badge: '/badge.png',
// //           image: campaign.image_url || undefined,
// //           data: {
// //             url: campaign.click_url || website.url || '/',
// //             subscriber_id: subscriber.id,
// //             campaign_id: campaign.id,
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

// //         console.log(`[Campaign Send] Sending to subscriber: ${subscriber.id}`);

// //         //  FIXED: Send push notification and wait for response
// //         const pushResponse = await webpush.sendNotification(
// //           {
// //             endpoint: subscriber.endpoint,
// //             keys: {
// //               p256dh: subscriber.p256dh_key,
// //               auth: subscriber.auth_key
// //             }
// //           },
// //           JSON.stringify(payload)
// //         );

// //         //  FIXED: Only increment counters based on actual response
// //         sent++;
        
// //         // Check if push was actually delivered (status 201 means success)
// //         if (pushResponse.statusCode === 201) {
// //           delivered++;  // ← Only increment delivered on SUCCESS
          
// //           // Log successful delivery
// //           await supabase.from('notification_logs').insert({
// //             campaign_id: campaign.id,
// //             subscriber_id: subscriber.id,
// //             website_id: campaign.website_id,
// //             status: 'delivered',
// //             platform: subscriber.platform || 'web',
// //             sent_at: new Date().toISOString(),
// //             delivered_at: new Date().toISOString()
// //           });

// //           console.log(`[Campaign Send] ✓ Successfully delivered to ${subscriber.id}`);
// //         } else {
// //           // Unexpected response - count as failed
// //           failed++;
          
// //           await supabase.from('notification_logs').insert({
// //             campaign_id: campaign.id,
// //             subscriber_id: subscriber.id,
// //             website_id: campaign.website_id,
// //             status: 'failed',
// //             platform: subscriber.platform || 'web',
// //             error_message: `Unexpected status code: ${pushResponse.statusCode}`,
// //             sent_at: new Date().toISOString()
// //           });
// //         }

// //       } catch (error: any) {
// //         console.error(`[Campaign Send] ✗ Failed to send to ${subscriber.id}:`, error.message);
        
// //         sent++;  // ← Still count as sent attempt
// //         failed++;  // ← But mark as failed

// //         // Log failure
// //         await supabase.from('notification_logs').insert({
// //           campaign_id: campaign.id,
// //           subscriber_id: subscriber.id,
// //           website_id: campaign.website_id,
// //           status: 'failed',
// //           platform: subscriber.platform || 'web',
// //           error_message: error.message,
// //           sent_at: new Date().toISOString()
// //         });
// //       }
// //     }

// //     // 4. Update campaign with results
// //     const { error: updateError } = await supabase
// //       .from('campaigns')
// //       .update({
// //         status: 'completed',
// //         sent_count: sent,
// //         delivered_count: delivered,
// //         failed_count: failed,
// //         sent_at: new Date().toISOString()
// //       })
// //       .eq('id', campaignId);

// //     if (updateError) {
// //       console.error('[Campaign Send] Error updating campaign:', updateError);
// //     }

// //     console.log(`[Campaign Send] ✓ Complete - Sent: ${sent}, Delivered: ${delivered}, Failed: ${failed}`);

// //     return NextResponse.json({
// //       success: true,
// //       sent,
// //       delivered,
// //       failed,
// //       message: `Campaign sent successfully to ${delivered} subscribers`
// //     });

// //   } catch (error: any) {
// //     console.error('[Campaign Send] ✗ Fatal error:', error);
// //     console.error('[Campaign Send] Error stack:', error.stack);
    
// //     return NextResponse.json(
// //       {
// //         success: false,
// //         error: error.message || 'Failed to send campaign',
// //         details: error.stack
// //       },
// //       { status: 500 }
// //     );
// //   }
// // }

// // app/api/campaigns/[id]/send/route.ts - FIXED VERSION

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import webpush from 'web-push';
// import { parseBranding } from '@/types/branding';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// // Configure web-push with VAPID keys
// webpush.setVapidDetails(
//   process.env.VAPID_SUBJECT || 'mailto:notifications@yourdomain.com',
//   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
//   process.env.VAPID_PRIVATE_KEY!
// );

// export async function POST(
//   request: NextRequest,
//   context: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id: campaignId } = await context.params;
    
//     console.log(' [Campaign Send] Starting send for campaign:', campaignId);

//     // 1. Get campaign details
//     const { data: campaign, error: campaignError } = await supabase
//       .from('campaigns')
//       .select('*')
//       .eq('id', campaignId)
//       .single();

//     if (campaignError || !campaign) {
//       console.error(' [Campaign Send] Error fetching campaign:', campaignError);
//       return NextResponse.json(
//         { success: false, error: 'Campaign not found', details: campaignError?.message },
//         { status: 404 }
//       );
//     }

//     console.log(' [Campaign Send] Campaign found:', campaign.name);

//     // 2. Fetch website with branding information
//     const { data: website, error: websiteError } = await supabase
//       .from('websites')
//       .select('*')
//       .eq('id', campaign.website_id)
//       .single();

//     if (websiteError || !website) {
//       console.error(' [Campaign Send] Error fetching website:', websiteError);
//       return NextResponse.json(
//         { success: false, error: 'Website not found', details: websiteError?.message },
//         { status: 404 }
//       );
//     }

//     const branding = parseBranding(website.notification_branding);

//     // 3. Get subscribers based on segment
//     let query = supabase
//       .from('subscribers')
//       .select('*')
//       .eq('website_id', campaign.website_id)
//       .eq('status', 'active')
//       .not('endpoint', 'is', null);

//     // Apply segment filters
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
//       console.error(' [Campaign Send] Error fetching subscribers:', subscribersError);
//       return NextResponse.json(
//         { success: false, error: 'Failed to fetch subscribers', details: subscribersError.message },
//         { status: 500 }
//       );
//     }

//     if (!subscribers || subscribers.length === 0) {
//       console.log(' [Campaign Send] No subscribers found');
      
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
//         message: 'No active subscribers found for this segment'
//       });
//     }

//     console.log(` [Campaign Send] Found ${subscribers.length} subscribers to send to`);

//     let sentCount = 0;
//     let deliveredCount = 0; //  Will be incremented by delivery tracking, NOT here
//     let failedCount = 0;

//     // 4. Send notifications to each subscriber
//     for (const subscriber of subscribers) {
//       try {
//         // Validate subscription keys
//         if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
//           console.error(` [Campaign Send] Invalid subscription for ${subscriber.id}`);
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
          
//           continue;
//         }

//         //  CREATE NOTIFICATION LOG FIRST (with status 'pending')
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
//           console.error(` [Campaign Send] Failed to create log for ${subscriber.id}:`, logError);
//           failedCount++;
//           continue;
//         }

//         // Prepare payload
//         const payload = {
//           title: campaign.title,
//           body: campaign.body,
//           icon: branding.logo_url || campaign.icon_url || '/icon.png',
//           badge: '/badge.png',
//           image: campaign.image_url || undefined,
//           data: {
//             url: campaign.click_url || website.url || '/',
//             subscriber_id: subscriber.id,
//             campaign_id: campaign.id,
//             notification_id: notificationLog.id, 
//             journey_id: null,
//             timestamp: new Date().toISOString()
//           },
//           tag: notificationLog.id, //  Use notification ID as tag
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

//         console.log(` [Campaign Send] Sending to subscriber: ${subscriber.id}`);

//         //  Send push notification
//         await webpush.sendNotification(
//           {
//             endpoint: subscriber.endpoint,
//             keys: {
//               p256dh: subscriber.p256dh_key,
//               auth: subscriber.auth_key
//             }
//           },
//           JSON.stringify(payload)
//         );

//         //  Update log to 'sent' (NOT 'delivered' - that happens via service worker)
//         await supabase
//           .from('notification_logs')
//           .update({
//             status: 'sent',
//             sent_at: new Date().toISOString()
//           })
//           .eq('id', notificationLog.id);

//         sentCount++;
//         console.log(` [Campaign Send] Sent to ${subscriber.id}`);

//       } catch (error: any) {
//         console.error(` [Campaign Send] Failed to send to ${subscriber.id}:`, error.message);
        
//         failedCount++;

//         // Update log to 'failed'
//         await supabase
//           .from('notification_logs')
//           .update({
//             status: 'failed',
//             error_message: error.message,
//             sent_at: new Date().toISOString()
//           })
//           .eq('subscriber_id', subscriber.id)
//           .eq('campaign_id', campaign.id)
//           .eq('status', 'pending'); // Only update logs that are still pending
//       }
//     }

//     //  Update campaign with results
//     // NOTE: delivered_count starts at 0 and will be incremented by delivery tracking
//     const { error: updateError } = await supabase
//       .from('campaigns')
//       .update({
//         status: 'completed',
//         sent_count: sentCount,
//         delivered_count: 0, //  Start at 0 - will be incremented by /api/notifications/track-delivery
//         failed_count: failedCount,
//         sent_at: new Date().toISOString()
//       })
//       .eq('id', campaignId);

//     if (updateError) {
//       console.error(' [Campaign Send] Error updating campaign:', updateError);
//     }

//     console.log(` [Campaign Send] Complete - Sent: ${sentCount}, Failed: ${failedCount}`);
//     console.log(` [Campaign Send] Delivery count will be updated by service worker tracking`);

//     return NextResponse.json({
//       success: true,
//       sent: sentCount,
//       delivered: 0, // Will be updated by delivery tracking
//       failed: failedCount,
//       message: `Campaign sent to ${sentCount} subscribers. Delivery tracking in progress.`
//     });

//   } catch (error: any) {
//     console.error(' [Campaign Send] Fatal error:', error);
//     console.error('[Campaign Send] Error stack:', error.stack);
    
//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message || 'Failed to send campaign',
//         details: error.stack
//       },
//       { status: 500 }
//     );
//   }
// }



















// app/api/campaigns/[id]/send/route.ts - FIXED VERSION
// Marks notifications as delivered immediately after successful send
// Service worker tracking is now just for confirmation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { parseBranding } from '@/types/branding';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:notifications@yourdomain.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await context.params;
    
    console.log(' [Campaign Send] Starting send for campaign:', campaignId);

    // 1. Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error(' [Campaign Send] Campaign not found');
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // 2. Get website with branding
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', campaign.website_id)
      .single();

    if (websiteError || !website) {
      console.error(' [Campaign Send] Website not found');
      return NextResponse.json(
        { success: false, error: 'Website not found' },
        { status: 404 }
      );
    }

    const branding = parseBranding(website.notification_branding);

    // 3. Get subscribers
    let query = supabase
      .from('subscribers')
      .select('*')
      .eq('website_id', campaign.website_id)
      .eq('status', 'active')
      .not('endpoint', 'is', null);

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
      console.error(' [Campaign Send] Error fetching subscribers');
      return NextResponse.json(
        { success: false, error: 'Failed to fetch subscribers' },
        { status: 500 }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      console.log('[Campaign Send] No subscribers found');
      
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

    console.log(` [Campaign Send] Sending to ${subscribers.length} subscribers`);

    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;

    // 4. Send notifications
    for (const subscriber of subscribers) {
      try {
        // Validate subscription
        if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
          console.error(` Invalid subscription: ${subscriber.id}`);
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
          
          continue;
        }

        // Create notification log
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
          console.error(` Failed to create log for ${subscriber.id}`);
          failedCount++;
          continue;
        }

        // Prepare payload
        const payload = {
          title: campaign.title,
          body: campaign.body,
          icon: branding.logo_url || campaign.icon_url || '/icon.png',
          badge: '/badge.png',
          image: campaign.image_url || undefined,
          tag: notificationLog.id,
          data: {
            url: campaign.click_url || website.url || '/',
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

        console.log(` Sending to ${subscriber.id}`);

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

        sentCount++;

        // CRITICAL FIX: Mark as delivered IMMEDIATELY after successful send
        // This is the server-side tracking - service worker tracking is bonus
        await supabase
          .from('notification_logs')
          .update({
            status: 'delivered',
            sent_at: new Date().toISOString(),
            delivered_at: new Date().toISOString()
          })
          .eq('id', notificationLog.id);

        deliveredCount++;

        console.log(`Sent & marked delivered: ${subscriber.id}`);

      } catch (error: any) {
        console.error(` Failed to send to ${subscriber.id}:`, error.message);
        
        sentCount++;
        failedCount++;

        await supabase
          .from('notification_logs')
          .update({
            status: 'failed',
            error_message: error.message,
            sent_at: new Date().toISOString()
          })
          .eq('subscriber_id', subscriber.id)
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending');
      }
    }

    // 5. Update campaign with final counts
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

    console.log(`Campaign complete:`);
    console.log(`   - Sent: ${sentCount}`);
    console.log(`   - Delivered: ${deliveredCount}`);
    console.log(`   - Failed: ${failedCount}`);

    return NextResponse.json({
      success: true,
      sent: sentCount,
      delivered: deliveredCount,
      failed: failedCount,
      message: `Campaign sent to ${sentCount} subscribers, ${deliveredCount} delivered`
    });

  } catch (error: any) {
    console.error(' Fatal error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send campaign',
      },
      { status: 500 }
    );
  }
}