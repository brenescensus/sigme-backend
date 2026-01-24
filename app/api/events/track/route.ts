// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@supabase/supabase-js';
// // import { journeyExecutor } from '@/lib/services/JourneyExecutor';

// // const supabase = createClient(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // /**
// //  * Track a subscriber event
// //  * POST /api/events/track
// //  * 
// //  * Body: {
// //  *   subscriber_id: string,
// //  *   event_name: string,
// //  *   properties?: object,
// //  *   website_id?: string
// //  * }
// //  */
// // export async function POST(request: NextRequest) {
// //   try {
// //     const body = await request.json();
    
// //     const { 
// //       subscriber_id, 
// //       event_name, 
// //       properties = {},
// //       website_id 
// //     } = body;

// //     // Validate required fields
// //     if (!subscriber_id || !event_name) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           error: 'subscriber_id and event_name are required'
// //         },
// //         { status: 400 }
// //       );
// //     }

// //     // Get website_id from subscriber if not provided
// //     let finalWebsiteId = website_id;
// //     if (!finalWebsiteId) {
// //       const { data: subscriber } = await supabase
// //         .from('subscribers')
// //         .select('website_id')
// //         .eq('id', subscriber_id)
// //         .single();
      
// //       if (subscriber) {
// //         finalWebsiteId = subscriber.website_id;
// //       }
// //     }

// //     // Insert event
// //     const { data: event, error: insertError } = await supabase
// //       .from('subscriber_events')
// //       .insert({
// //         subscriber_id,
// //         website_id: finalWebsiteId,
// //         event_name,
// //         properties
// //       })
// //       .select()
// //       .single();

// //     if (insertError) {
// //       console.error('[Events] Error inserting event:', insertError);
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           error: 'Failed to track event'
// //         },
// //         { status: 500 }
// //       );
// //     }

// //     // 🔥 If this is a notification click, update campaign clicked_count
// //     if (event_name === 'notification_clicked' && properties?.campaign_id) {
// //       const campaignId = properties.campaign_id;
      
// //       console.log('[Events] Processing click for campaign:', campaignId);
      
// //       try {
// //         // Use the existing database function
// //         const { error: rpcError } = await supabase
// //           .rpc('increment_campaign_clicks', { 
// //             campaign_uuid: campaignId 
// //           });

// //         if (rpcError) {
// //           console.error('[Events] RPC error:', rpcError);
          
// //           // Fallback: Fetch current count and increment manually
// //           const { data: campaign } = await supabase
// //             .from('campaigns')
// //             .select('clicked_count')
// //             .eq('id', campaignId)
// //             .single();
          
// //           if (campaign) {
// //             const newCount = (campaign.clicked_count || 0) + 1;
// //             await supabase
// //               .from('campaigns')
// //               .update({ clicked_count: newCount })
// //               .eq('id', campaignId);
            
// //             console.log('[Events] Campaign click count updated to:', newCount);
// //           }
// //         } else {
// //           console.log('[Events] Campaign click count incremented successfully');
// //         }

// //         // Update notification log
// //         await supabase
// //           .from('notification_logs')
// //           .update({ clicked_at: new Date().toISOString() })
// //           .eq('campaign_id', campaignId)
// //           .eq('subscriber_id', subscriber_id)
// //           .is('clicked_at', null)
// //           .order('created_at', { ascending: false })
// //           .limit(1);

// //       } catch (error) {
// //         console.error('[Events] Error updating campaign stats:', error);
// //         // Don't fail the event tracking if campaign update fails
// //       }
// //     }

// //     // If this is a journey trigger event, process journeys asynchronously
// //     if (event_name === 'user_subscribed' || event_name.startsWith('journey_')) {
// //       // Don't await - run in background
// //       journeyExecutor.processActiveJourneys().catch(err => {
// //         console.error('[Events] Error processing journeys:', err);
// //       });
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       event_id: event.id
// //     });
// //   } catch (error) {
// //     console.error('[Events] Error tracking event:', error);
// //     return NextResponse.json(
// //       {
// //         success: false,
// //         error: 'Internal server error'
// //       },
// //       { status: 500 }
// //     );
// //   }
// // }



// // app/api/events/track/route.ts

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';
// import { withPublicCors } from '@/lib/auth-middleware';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
//   {
//     auth: {
//       autoRefreshToken: false,
//       persistSession: false,
//     },
//   }
// );

// async function handleTrackEvent(request: NextRequest) {
//   try {
//     const body = await request.json();
    
//     const { 
//       subscriber_id, 
//       event_name, 
//       properties = {},
//       website_id 
//     } = body;

//     console.log(`[Event Track] 🎯 Received: ${event_name}`);
//     console.log(`[Event Track] Subscriber: ${subscriber_id}`);
//     console.log(`[Event Track] Properties:`, properties);

//     // Validate required fields
//     if (!subscriber_id || !event_name) {
//       console.error('[Event Track] ❌ Missing required fields');
//       return NextResponse.json(
//         {
//           success: false,
//           error: 'subscriber_id and event_name are required'
//         },
//         { status: 400 }
//       );
//     }

//     // Get website_id from subscriber if not provided
//     let finalWebsiteId = website_id;
//     if (!finalWebsiteId) {
//       const { data: subscriber } = await supabase
//         .from('subscribers')
//         .select('website_id')
//         .eq('id', subscriber_id)
//         .single();
      
//       if (subscriber) {
//         finalWebsiteId = subscriber.website_id;
//       }
//     }

//     // 🔥 Handle notification_clicked event FIRST
//     if (event_name === 'notification_clicked' && properties?.campaign_id) {
//       const campaignId = properties.campaign_id;
      
//       console.log(`[Event Track] 📊 Processing click for campaign: ${campaignId}`);
      
//       try {
//         // 1. Update notification log (mark as clicked)
//         const { data: updateData, error: updateError } = await supabase
//           .from('notification_logs')
//           .update({ clicked_at: new Date().toISOString() })
//           .eq('campaign_id', campaignId)
//           .eq('subscriber_id', subscriber_id)
//           .is('clicked_at', null)
//           .order('created_at', { ascending: false })
//           .limit(1)
//           .select();

//         if (updateError) {
//           console.error('[Event Track] ⚠️ Error updating notification log:', updateError);
//         } else if (updateData && updateData.length > 0) {
//           console.log(`[Event Track] ✅ Notification log updated:`, updateData[0].id);
//         } else {
//           console.log(`[Event Track] ℹ️ No notification log to update (already clicked or not found)`);
//         }

//         // 2. Increment campaign clicked_count using RPC function
//         console.log(`[Event Track] 📈 Incrementing campaign clicks via RPC...`);
        
//         const { data: rpcData, error: rpcError } = await supabase
//           .rpc('increment_campaign_clicks', { 
//             campaign_uuid: campaignId 
//           });

//         if (rpcError) {
//           console.error('[Event Track] ⚠️ RPC error:', rpcError);
          
//           // Fallback: Manual increment
//           console.log('[Event Track] 🔄 Falling back to manual increment...');
//           const { data: campaign } = await supabase
//             .from('campaigns')
//             .select('clicked_count')
//             .eq('id', campaignId)
//             .single();
          
//           if (campaign) {
//             const newCount = (campaign.clicked_count || 0) + 1;
//             const { error: manualError } = await supabase
//               .from('campaigns')
//               .update({ clicked_count: newCount })
//               .eq('id', campaignId);
            
//             if (manualError) {
//               console.error('[Event Track] ❌ Manual increment failed:', manualError);
//             } else {
//               console.log(`[Event Track] ✅ Campaign clicks manually updated: ${newCount}`);
//             }
//           } else {
//             console.error('[Event Track] ❌ Campaign not found:', campaignId);
//           }
//         } else {
//           console.log(`[Event Track] ✅ Campaign clicks incremented via RPC`);
//         }

//       } catch (error: any) {
//         console.error('[Event Track] ❌ Error updating campaign stats:', error);
//         // Don't fail the event tracking if campaign update fails
//       }
//     }

//     // 🔥 Insert subscriber event
//     console.log(`[Event Track] 💾 Inserting subscriber event...`);
//     const { data: event, error: insertError } = await supabase
//       .from('subscriber_events')
//       .insert({
//         subscriber_id,
//         website_id: finalWebsiteId,
//         event_name,
//         properties
//       })
//       .select()
//       .single();

//     if (insertError) {
//       console.error('[Event Track] ❌ Error inserting event:', insertError);
//       return NextResponse.json(
//         {
//           success: false,
//           error: 'Failed to track event',
//           details: insertError.message
//         },
//         { status: 500 }
//       );
//     }

//     console.log(`[Event Track] ✅ Event tracked successfully: ${event.id}`);

//     return NextResponse.json({
//       success: true,
//       event_id: event.id,
//       message: 'Event tracked successfully'
//     });

//   } catch (error: any) {
//     console.error('[Event Track] ❌ Fatal error:', error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: 'Internal server error',
//         details: error.message
//       },
//       { status: 500 }
//     );
//   }
// }

// // 🔥 CRITICAL: Export with withPublicCors
// export const POST = withPublicCors(handleTrackEvent);







// app/api/events/track/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { withPublicCors } from '@/lib/auth-middleware';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function handleTrackEvent(request: NextRequest) {
  try {
    console.log('[Event Track] 🎯 Request received');
    console.log('[Event Track] Headers:', Object.fromEntries(request.headers.entries()));
    
    const body = await request.json();
    console.log('[Event Track] 📦 Request body:', JSON.stringify(body, null, 2));
    
    const { 
      subscriber_id, 
      event_name, 
      properties = {},
      website_id 
    } = body;

    console.log(`[Event Track] 🎯 Event: ${event_name}`);
    console.log(`[Event Track] 👤 Subscriber: ${subscriber_id}`);
    console.log(`[Event Track] 🌐 Website: ${website_id}`);
    console.log(`[Event Track] 📋 Properties:`, properties);
    console.log(`[Event Track] 📋 Campaign ID from properties:`, properties?.campaign_id);

    // Validate required fields
    if (!subscriber_id || !event_name) {
      console.error('[Event Track] ❌ Missing required fields');
      return NextResponse.json(
        {
          success: false,
          error: 'subscriber_id and event_name are required'
        },
        { status: 400 }
      );
    }

    // Get website_id from subscriber if not provided
    let finalWebsiteId = website_id;
    if (!finalWebsiteId) {
      console.log('[Event Track] 🔍 Fetching website_id from subscriber...');
      const { data: subscriber, error: subError } = await supabase
        .from('subscribers')
        .select('website_id')
        .eq('id', subscriber_id)
        .single();
      
      if (subError) {
        console.error('[Event Track] ❌ Error fetching subscriber:', subError);
      } else if (subscriber) {
        finalWebsiteId = subscriber.website_id;
        console.log('[Event Track] ✅ Got website_id:', finalWebsiteId);
      }
    }

    // 🔥 Handle notification_clicked event
    if (event_name === 'notification_clicked') {
      const campaignId = properties?.campaign_id;
      
      if (!campaignId) {
        console.warn('[Event Track] ⚠️ notification_clicked event missing campaign_id');
      } else {
        console.log(`[Event Track] 🎯 Processing notification click for campaign: ${campaignId}`);
        
        try {
          // 1. Find and update the notification log
          console.log('[Event Track] 📝 Finding notification log...');
          const { data: logs, error: findError } = await supabase
            .from('notification_logs')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('subscriber_id', subscriber_id)
            .is('clicked_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (findError) {
            console.error('[Event Track] ❌ Error finding notification log:', findError);
          } else if (!logs || logs.length === 0) {
            console.warn('[Event Track] ⚠️ No notification log found (already clicked or not sent)');
          } else {
            console.log('[Event Track] 📝 Found log:', logs[0].id);
            
            // Update the log
            const { data: updateData, error: updateError } = await supabase
              .from('notification_logs')
              .update({ clicked_at: new Date().toISOString() })
              .eq('id', logs[0].id)
              .select();

            if (updateError) {
              console.error('[Event Track] ❌ Error updating notification log:', updateError);
            } else {
              console.log('[Event Track] ✅ Notification log updated:', updateData);
            }
          }

          // 2. Increment campaign clicked_count
          console.log('[Event Track] 📈 Incrementing campaign clicks...');
          
          // First, get current campaign data
          const { data: campaign, error: campaignError } = await supabase
            .from('campaigns')
            .select('clicked_count, sent_count')
            .eq('id', campaignId)
            .single();

          if (campaignError) {
            console.error('[Event Track] ❌ Error fetching campaign:', campaignError);
          } else if (campaign) {
            console.log('[Event Track] 📊 Current campaign stats:', campaign);
            
            const newClickedCount = (campaign.clicked_count || 0) + 1;
            
            const { data: updated, error: updateError } = await supabase
              .from('campaigns')
              .update({ clicked_count: newClickedCount })
              .eq('id', campaignId)
              .select();

            if (updateError) {
              console.error('[Event Track] ❌ Error updating campaign clicks:', updateError);
            } else {
              console.log('[Event Track] ✅ Campaign clicks updated to:', newClickedCount);
              console.log('[Event Track] 📊 Updated campaign:', updated);
            }
          } else {
            console.error('[Event Track] ❌ Campaign not found:', campaignId);
          }

        } catch (error: any) {
          console.error('[Event Track] ❌ Error in click tracking:', error);
          console.error('[Event Track] Stack:', error.stack);
        }
      }
    }

    // 🔥 Insert subscriber event
    console.log(`[Event Track] 💾 Inserting subscriber event...`);
    const { data: event, error: insertError } = await supabase
      .from('subscriber_events')
      .insert({
        subscriber_id,
        website_id: finalWebsiteId,
        event_name,
        properties
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Event Track] ❌ Error inserting event:', insertError);
      console.error('[Event Track] Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to track event',
          details: insertError.message
        },
        { status: 500 }
      );
    }

    console.log(`[Event Track] ✅ Event tracked successfully:`, event);

    return NextResponse.json({
      success: true,
      event_id: event.id,
      message: 'Event tracked successfully',
      debug: {
        event_name,
        subscriber_id,
        website_id: finalWebsiteId,
        campaign_id: properties?.campaign_id
      }
    });

  } catch (error: any) {
    console.error('[Event Track] ❌ Fatal error:', error);
    console.error('[Event Track] Error stack:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// 🔥 CRITICAL: Export with CORS
export const POST = withPublicCors(handleTrackEvent);

// Also handle OPTIONS for preflight
export const OPTIONS = async (request: NextRequest) => {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};