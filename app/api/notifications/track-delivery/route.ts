// // // // backend/app/api/notifications/track-delivery/route.ts

// // // import { NextRequest, NextResponse } from 'next/server';
// // // import { createClient } from '@supabase/supabase-js';

// // // const supabase = createClient(
// // //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // // );

// // // export async function POST(request: NextRequest) {
// // //   console.log(' [Track Delivery] Notification delivery received');

// // //   try {
// // //     const body = await request.json();
// // //     const { notification_id, subscriber_id, journey_id, delivered_at } = body;

// // //     console.log(' [Track Delivery] Notification ID:', notification_id);
// // //     console.log(' [Track Delivery] Subscriber ID:', subscriber_id);
// // //     console.log(' [Track Delivery] Journey ID:', journey_id);

// // //     if (!notification_id) {
// // //       return NextResponse.json(
// // //         { success: false, error: 'notification_id is required' },
// // //         { status: 400 }
// // //       );
// // //     }

// // //     //  UPDATE NOTIFICATION LOG WITH DELIVERED TIMESTAMP
// // //     const { error: updateError } = await supabase
// // //       .from('notification_logs')
// // //       .update({
// // //         delivered_at: delivered_at || new Date().toISOString(),
// // //         status: 'delivered',
// // //       })
// // //       .eq('id', notification_id);

// // //     if (updateError) {
// // //       console.error(' [Track Delivery] Database error:', updateError);
// // //       return NextResponse.json(
// // //         { success: false, error: updateError.message },
// // //         { status: 500 }
// // //       );
// // //     }

// // //     console.log(' [Track Delivery] Delivery tracked successfully');

// // //     //  LOG JOURNEY EVENT IF THIS IS A JOURNEY NOTIFICATION
// // //     if (journey_id && subscriber_id) {
// // //       console.log(' [Track Delivery] Logging journey event...');

// // //       // Get the user_journey_state_id from notification_logs
// // //       const { data: notificationLog } = await supabase
// // //         .from('notification_logs')
// // //         .select('user_journey_state_id')
// // //         .eq('id', notification_id)
// // //         .single();

// // //       if (notificationLog?.user_journey_state_id) {
// // //         await supabase.from('journey_events').insert({
// // //           journey_id,
// // //           subscriber_id,
// // //           user_journey_state_id: notificationLog.user_journey_state_id,
// // //           event_type: 'notification_delivered',
// // //           step_id: null,
// // //           metadata: {
// // //             notification_id,
// // //             delivered_at,
// // //           },
// // //         });

// // //         console.log(' [Track Delivery] Journey event logged');
// // //       }
// // //     }

// // //     return NextResponse.json({
// // //       success: true,
// // //       notification_id,
// // //       delivered_at,
// // //     });

// // //   } catch (error: any) {
// // //     console.error(' [Track Delivery] Error:', error);
// // //     return NextResponse.json(
// // //       { success: false, error: error.message },
// // //       { status: 500 }
// // //     );
// // //   }
// // // }



// // // app/api/notifications/track-delivery/route.ts
// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@supabase/supabase-js';

// // const supabase = createClient(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // export async function POST(request: NextRequest) {
// //   console.log('[Track Delivery] Notification delivery received');
  
// //   try {
// //     const body = await request.json();
// //     const { notification_id, subscriber_id, journey_id, delivered_at } = body;

// //     console.log('[Track Delivery] Notification ID:', notification_id);
// //     console.log('[Track Delivery] Subscriber ID:', subscriber_id);
// //     console.log('[Track Delivery] Journey ID:', journey_id);

// //     if (!notification_id) {
// //       return NextResponse.json(
// //         { success: false, error: 'notification_id is required' },
// //         { status: 400 }
// //       );
// //     }

// //     // 1️⃣ Update notification log with delivered timestamp
// //     const { data: notificationLog, error: updateError } = await supabase
// //       .from('notification_logs')
// //       .update({
// //         delivered_at: delivered_at || new Date().toISOString(),
// //         status: 'delivered',
// //       })
// //       .eq('id', notification_id)
// //       .select('campaign_id, user_journey_state_id')  // ← Get campaign_id
// //       .single();

// //     if (updateError) {
// //       console.error('[Track Delivery] Database error:', updateError);
// //       return NextResponse.json(
// //         { success: false, error: updateError.message },
// //         { status: 500 }
// //       );
// //     }

// //     if (!notificationLog) {
// //       console.error('[Track Delivery] Notification log not found');
// //       return NextResponse.json(
// //         { success: false, error: 'Notification not found' },
// //         { status: 404 }
// //       );
// //     }

// //     console.log('[Track Delivery] ✓ Delivery tracked successfully');

// //     // 2️⃣ ✨ INCREMENT CAMPAIGN DELIVERED COUNT
// //     if (notificationLog.campaign_id) {
// //       console.log('[Track Delivery] Incrementing campaign delivered count...');
      
// //       const { error: campaignError } = await supabase.rpc('increment_campaign_delivered', {
// //         p_campaign_id: notificationLog.campaign_id
// //       });

// //       if (campaignError) {
// //         console.error('[Track Delivery] Failed to increment campaign:', campaignError);
// //         // Don't fail the request - delivery was tracked
// //       } else {
// //         console.log('[Track Delivery] ✓ Campaign delivered_count incremented');
// //       }
// //     }

// //     // 3️⃣ Log journey event if this is a journey notification
// //     if (journey_id && subscriber_id && notificationLog.user_journey_state_id) {
// //       console.log('[Track Delivery] Logging journey event...');
      
// //       await supabase.from('journey_events').insert({
// //         journey_id,
// //         subscriber_id,
// //         user_journey_state_id: notificationLog.user_journey_state_id,
// //         event_type: 'notification_delivered',
// //         step_id: null,
// //         metadata: {
// //           notification_id,
// //           delivered_at,
// //         },
// //       });
      
// //       console.log('[Track Delivery] ✓ Journey event logged');
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       notification_id,
// //       delivered_at,
// //     });

// //   } catch (error: any) {
// //     console.error('[Track Delivery] ✗ Error:', error);
// //     return NextResponse.json(
// //       { success: false, error: error.message },
// //       { status: 500 }
// //     );
// //   }
// // }





// // app/api/notifications/track-delivery/route.ts

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export async function POST(request: NextRequest) {
//   console.log('[Track Delivery] Notification delivery received');
  
//   try {
//     const body = await request.json();
//     const { notification_id, subscriber_id, journey_id, delivered_at } = body;

//     console.log('[Track Delivery]  Details:');
//     console.log('  - Notification ID:', notification_id);
//     console.log('  - Subscriber ID:', subscriber_id);
//     console.log('  - Journey ID:', journey_id);

//     if (!notification_id) {
//       return NextResponse.json(
//         { success: false, error: 'notification_id is required' },
//         { status: 400 }
//       );
//     }

//     // 1️⃣ Update notification log with delivered timestamp
//     const { data: notificationLog, error: updateError } = await supabase
//       .from('notification_logs')
//       .update({
//         delivered_at: delivered_at || new Date().toISOString(),
//         status: 'delivered',
//       })
//       .eq('id', notification_id)
//       .select('campaign_id, user_journey_state_id')
//       .single();

//     if (updateError) {
//       console.error('[Track Delivery]  Database error:', updateError);
//       return NextResponse.json(
//         { success: false, error: updateError.message },
//         { status: 500 }
//       );
//     }

//     if (!notificationLog) {
//       console.error('[Track Delivery]  Notification log not found');
//       return NextResponse.json(
//         { success: false, error: 'Notification not found' },
//         { status: 404 }
//       );
//     }

//     console.log('[Track Delivery] Delivery tracked');

//     // 2️⃣ ✨ INCREMENT CAMPAIGN DELIVERED COUNT
//     if (notificationLog.campaign_id) {
//       console.log('[Track Delivery]  Incrementing campaign:', notificationLog.campaign_id);
      
//       // METHOD 1: Try using the RPC function first
//       const { data: rpcResult, error: rpcError } = await supabase.rpc('increment_campaign_delivered', {
//         p_campaign_id: notificationLog.campaign_id
//       });

//       if (rpcError) {
//         console.error('[Track Delivery]  RPC failed, using direct UPDATE:', rpcError.message);
        
//         // METHOD 2: Fallback to direct UPDATE
//         const { data: campaign, error: directError } = await supabase
//           .from('campaigns')
//           .select('delivered_count')
//           .eq('id', notificationLog.campaign_id)
//           .single();

//         if (campaign) {
//           const newCount = (campaign.delivered_count || 0) + 1;
//           console.log('[Track Delivery] 📈 Current:', campaign.delivered_count, '→ New:', newCount);

//           const { error: updateCampaignError } = await supabase
//             .from('campaigns')
//             .update({
//               delivered_count: newCount,
//               updated_at: new Date().toISOString()
//             })
//             .eq('id', notificationLog.campaign_id);

//           if (updateCampaignError) {
//             console.error('[Track Delivery]  Direct update failed:', updateCampaignError);
//           } else {
//             console.log('[Track Delivery] Campaign delivered_count updated to:', newCount);
//           }
//         }
//       } else {
//         console.log('[Track Delivery] RPC function succeeded');
//       }
//     }

//     // 3️⃣ Log journey event if this is a journey notification
//     if (journey_id && subscriber_id && notificationLog.user_journey_state_id) {
//       console.log('[Track Delivery] 🛣️  Logging journey event...');
      
//       await supabase.from('journey_events').insert({
//         journey_id,
//         subscriber_id,
//         user_journey_state_id: notificationLog.user_journey_state_id,
//         event_type: 'notification_delivered',
//         step_id: null,
//         metadata: {
//           notification_id,
//           delivered_at,
//         },
//       });
      
//       console.log('[Track Delivery] Journey event logged');
//     }

//     return NextResponse.json({
//       success: true,
//       notification_id,
//       delivered_at,
//     });

//   } catch (error: any) {
//     console.error('[Track Delivery]  Fatal error:', error);
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// }


// ============================================
// app/api/notifications/track-delivery/route.ts
// OPTIONAL: This endpoint is kept for potential journey delivery tracking
// For campaigns, delivery is tracked server-side in the send route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  console.log('[Track Delivery] Notification delivery received (for journeys only)');
  
  try {
    const body = await request.json();
    const { notification_id, subscriber_id, journey_id, delivered_at } = body;

    console.log('[Track Delivery]  Details:');
    console.log('  - Notification ID:', notification_id);
    console.log('  - Subscriber ID:', subscriber_id);
    console.log('  - Journey ID:', journey_id);

    if (!notification_id) {
      return NextResponse.json(
        { success: false, error: 'notification_id is required' },
        { status: 400 }
      );
    }

    // 1️⃣ Update notification log with delivered timestamp
    const { data: notificationLog, error: updateError } = await supabase
      .from('notification_logs')
      .update({
        delivered_at: delivered_at || new Date().toISOString(),
        status: 'delivered',
      })
      .eq('id', notification_id)
      .select('campaign_id, user_journey_state_id, journey_id')
      .single();

    if (updateError) {
      console.error('[Track Delivery]  Database error:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    if (!notificationLog) {
      console.error('[Track Delivery]  Notification log not found');
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    console.log('[Track Delivery] Delivery tracked');

    // 2️⃣ ONLY increment campaign count if this is a JOURNEY notification
    // Campaign notifications are already tracked server-side
    if (notificationLog.journey_id && !notificationLog.campaign_id) {
      console.log('[Track Delivery] 🛣️ Journey notification - incrementing campaign count');
      
      // If there's an associated campaign, increment it
      if (notificationLog.campaign_id) {
        const { error: campaignError } = await supabase.rpc('increment_campaign_delivered', {
          p_campaign_id: notificationLog.campaign_id
        });

        if (campaignError) {
          console.error('[Track Delivery] Failed to increment campaign:', campaignError);
        } else {
          console.log('[Track Delivery] Campaign delivered_count incremented');
        }
      }
    } else if (notificationLog.campaign_id) {
      console.log('[Track Delivery]  Campaign notification - already tracked server-side, skipping increment');
    }

    // 3️⃣ Log journey event if this is a journey notification
    if (journey_id && subscriber_id && notificationLog.user_journey_state_id) {
      console.log('[Track Delivery] 🛣️ Logging journey event...');
      
      await supabase.from('journey_events').insert({
        journey_id,
        subscriber_id,
        user_journey_state_id: notificationLog.user_journey_state_id,
        event_type: 'notification_delivered',
        step_id: null,
        metadata: {
          notification_id,
          delivered_at,
        },
      });
      
      console.log('[Track Delivery] Journey event logged');
    }

    return NextResponse.json({
      success: true,
      notification_id,
      delivered_at,
    });

  } catch (error: any) {
    console.error('[Track Delivery]  Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}