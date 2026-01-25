// // app/api/events/track/route.ts

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';
// import { withPublicCors } from '@/lib/auth-middleware';
// import { trackEventWithJourneys } from '@/lib/journeys/entry-handler';

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

// export async function POST_TRACK_EVENT(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { subscriber_id, event_name, event_data, website_id } = body;

//     if (!subscriber_id || !event_name || !website_id) {
//       return NextResponse.json(
//         { error: 'Missing required fields' },
//         { status: 400 }
//       );
//     }

//     // Track event in database
//     const { error: eventError } = await supabase
//       .from('subscriber_events')
//       .insert({
//         subscriber_id,
//         website_id,
//         event_name,
//         properties: event_data || {},
//       });

//     if (eventError) throw eventError;

//     // Handle journey processing (entry + advancement)
//     await trackEventWithJourneys({
//       subscriber_id,
//       website_id,
//       event_name,
//       event_data,
//       timestamp: new Date().toISOString(),
//     });

//     return NextResponse.json({
//       success: true,
//       message: 'Event tracked',
//     });
//   } catch (error: any) {
//     console.error('Error tracking event:', error);
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// }
// async function handleTrackEvent(request: NextRequest) {
//   try {
//     console.log('[Event Track] 🎯 Request received');
//     console.log('[Event Track] Headers:', Object.fromEntries(request.headers.entries()));
    
//     const body = await request.json();
//     console.log('[Event Track] 📦 Request body:', JSON.stringify(body, null, 2));
    
//     const { 
//       subscriber_id, 
//       event_name, 
//       properties = {},
//       website_id 
//     } = body;

//     console.log(`[Event Track] 🎯 Event: ${event_name}`);
//     console.log(`[Event Track] 👤 Subscriber: ${subscriber_id}`);
//     console.log(`[Event Track] 🌐 Website: ${website_id}`);
//     console.log(`[Event Track] 📋 Properties:`, properties);
//     console.log(`[Event Track] 📋 Campaign ID from properties:`, properties?.campaign_id);

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
//       console.log('[Event Track] 🔍 Fetching website_id from subscriber...');
//       const { data: subscriber, error: subError } = await supabase
//         .from('subscribers')
//         .select('website_id')
//         .eq('id', subscriber_id)
//         .single();
      
//       if (subError) {
//         console.error('[Event Track] ❌ Error fetching subscriber:', subError);
//       } else if (subscriber) {
//         finalWebsiteId = subscriber.website_id;
//         console.log('[Event Track] ✅ Got website_id:', finalWebsiteId);
//       }
//     }

//     // 🔥 Handle notification_clicked event
//     if (event_name === 'notification_clicked') {
//       const campaignId = properties?.campaign_id;
      
//       if (!campaignId) {
//         console.warn('[Event Track] ⚠️ notification_clicked event missing campaign_id');
//       } else {
//         console.log(`[Event Track] 🎯 Processing notification click for campaign: ${campaignId}`);
        
//         try {
//           // 1. Find and update the notification log
//           console.log('[Event Track] 📝 Finding notification log...');
//           const { data: logs, error: findError } = await supabase
//             .from('notification_logs')
//             .select('*')
//             .eq('campaign_id', campaignId)
//             .eq('subscriber_id', subscriber_id)
//             .is('clicked_at', null)
//             .order('created_at', { ascending: false })
//             .limit(1);

//           if (findError) {
//             console.error('[Event Track] ❌ Error finding notification log:', findError);
//           } else if (!logs || logs.length === 0) {
//             console.warn('[Event Track] ⚠️ No notification log found (already clicked or not sent)');
//           } else {
//             console.log('[Event Track] 📝 Found log:', logs[0].id);
            
//             // Update the log
//             const { data: updateData, error: updateError } = await supabase
//               .from('notification_logs')
//               .update({ clicked_at: new Date().toISOString() })
//               .eq('id', logs[0].id)
//               .select();

//             if (updateError) {
//               console.error('[Event Track] ❌ Error updating notification log:', updateError);
//             } else {
//               console.log('[Event Track] ✅ Notification log updated:', updateData);
//             }
//           }

//           // 2. Increment campaign clicked_count
//           console.log('[Event Track] 📈 Incrementing campaign clicks...');
          
//           // First, get current campaign data
//           const { data: campaign, error: campaignError } = await supabase
//             .from('campaigns')
//             .select('clicked_count, sent_count')
//             .eq('id', campaignId)
//             .single();

//           if (campaignError) {
//             console.error('[Event Track] ❌ Error fetching campaign:', campaignError);
//           } else if (campaign) {
//             console.log('[Event Track] 📊 Current campaign stats:', campaign);
            
//             const newClickedCount = (campaign.clicked_count || 0) + 1;
            
//             const { data: updated, error: updateError } = await supabase
//               .from('campaigns')
//               .update({ clicked_count: newClickedCount })
//               .eq('id', campaignId)
//               .select();

//             if (updateError) {
//               console.error('[Event Track] ❌ Error updating campaign clicks:', updateError);
//             } else {
//               console.log('[Event Track] ✅ Campaign clicks updated to:', newClickedCount);
//               console.log('[Event Track] 📊 Updated campaign:', updated);
//             }
//           } else {
//             console.error('[Event Track] ❌ Campaign not found:', campaignId);
//           }

//         } catch (error: any) {
//           console.error('[Event Track] ❌ Error in click tracking:', error);
//           console.error('[Event Track] Stack:', error.stack);
//         }
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
//       console.error('[Event Track] Insert error details:', {
//         code: insertError.code,
//         message: insertError.message,
//         details: insertError.details,
//         hint: insertError.hint
//       });
//       return NextResponse.json(
//         {
//           success: false,
//           error: 'Failed to track event',
//           details: insertError.message
//         },
//         { status: 500 }
//       );
//     }

//     console.log(`[Event Track] ✅ Event tracked successfully:`, event);
// async function handleTrackEvent(request: NextRequest) {
//   try {
//     console.log('[Event Track] 🎯 Request received');
    
//     const body = await request.json();
//     console.log('[Event Track] 📦 Request body:', JSON.stringify(body, null, 2));
    
//     const { 
//       subscriber_id, 
//       event_name,
//       event_data,  // ← Important: this is from your test page
//       properties = {},
//       website_id 
//     } = body;

//     console.log(`[Event Track] 🎯 Event: ${event_name}`);
//     console.log(`[Event Track] 👤 Subscriber: ${subscriber_id}`);
//     console.log(`[Event Track] 🌐 Website: ${website_id}`);

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
//       console.log('[Event Track] 🔍 Fetching website_id from subscriber...');
//       const { data: subscriber, error: subError } = await supabase
//         .from('subscribers')
//         .select('website_id')
//         .eq('id', subscriber_id)
//         .single();
      
//       if (subError) {
//         console.error('[Event Track] ❌ Error fetching subscriber:', subError);
//       } else if (subscriber) {
//         finalWebsiteId = subscriber.website_id;
//         console.log('[Event Track] ✅ Got website_id:', finalWebsiteId);
//       }
//     }

//     if (!finalWebsiteId) {
//       console.error('[Event Track] ❌ Could not determine website_id');
//       return NextResponse.json(
//         {
//           success: false,
//           error: 'website_id is required'
//         },
//         { status: 400 }
//       );
//     }

//     // Merge properties and event_data (your test page sends event_data)
//     const mergedProperties = {
//       ...properties,
//       ...event_data,
//     };

//     console.log('[Event Track] 📋 Merged properties:', mergedProperties);

//     // Handle notification_clicked event for analytics
//     if (event_name === 'notification_clicked') {
//       const campaignId = mergedProperties?.campaign_id;
      
//       if (!campaignId) {
//         console.warn('[Event Track] ⚠️ notification_clicked event missing campaign_id');
//       } else {
//         console.log(`[Event Track] 🎯 Processing notification click for campaign: ${campaignId}`);
        
//         try {
//           // Find and update the notification log
//           const { data: logs } = await supabase
//             .from('notification_logs')
//             .select('*')
//             .eq('campaign_id', campaignId)
//             .eq('subscriber_id', subscriber_id)
//             .is('clicked_at', null)
//             .order('created_at', { ascending: false })
//             .limit(1);

//           if (logs && logs.length > 0) {
//             await supabase
//               .from('notification_logs')
//               .update({ clicked_at: new Date().toISOString() })
//               .eq('id', logs[0].id);
            
//             console.log('[Event Track] ✅ Notification log updated');
//           }

//           // Increment campaign clicked_count
//           const { data: campaign } = await supabase
//             .from('campaigns')
//             .select('clicked_count')
//             .eq('id', campaignId)
//             .single();

//           if (campaign) {
//             const newClickedCount = (campaign.clicked_count || 0) + 1;
//             await supabase
//               .from('campaigns')
//               .update({ clicked_count: newClickedCount })
//               .eq('id', campaignId);
            
//             console.log('[Event Track] ✅ Campaign clicks updated to:', newClickedCount);
//           }
//         } catch (error: any) {
//           console.error('[Event Track] ❌ Error in click tracking:', error);
//         }
//       }
//     }

//     // Insert subscriber event
//     console.log(`[Event Track] 💾 Inserting subscriber event...`);
//     const { data: event, error: insertError } = await supabase
//       .from('subscriber_events')
//       .insert({
//         subscriber_id,
//         website_id: finalWebsiteId,
//         event_name,
//         properties: mergedProperties
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

//     console.log(`[Event Track] ✅ Event tracked successfully:`, event);

//     // 🔥 THIS IS THE CRITICAL PART YOU'RE MISSING 🔥
//     console.log('[Event Track] 🚀 Processing journeys for event...');
//     console.log('[Event Track] 📋 Journey params:', {
//       subscriber_id,
//       website_id: finalWebsiteId,
//       event_name,
//       has_event_data: !!mergedProperties
//     });

//     try {
//       await trackEventWithJourneys({
//         subscriber_id,
//         website_id: finalWebsiteId,
//         event_name,
//         event_data: mergedProperties,
//         timestamp: new Date().toISOString(),
//       });
//       console.log('[Event Track] ✅ Journey processing completed');
//     } catch (journeyError: any) {
//       console.error('[Event Track] ❌ Journey processing error:', journeyError);
//       console.error('[Event Track] Journey error stack:', journeyError.stack);
//       // Don't fail the request if journey processing fails
//     }

//     return NextResponse.json({
//       success: true,
//       event_id: event.id,
//       message: 'Event tracked successfully',
//       debug: {
//         event_name,
//         subscriber_id,
//         website_id: finalWebsiteId,
//         properties: mergedProperties,
//         journey_handler_called: true
//       }
//     });

//   } catch (error: any) {
//     console.error('[Event Track] ❌ Fatal error:', error);
//     console.error('[Event Track] Error stack:', error.stack);
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
//     return NextResponse.json({
//       success: true,
//       event_id: event.id,
//       message: 'Event tracked successfully',
//       debug: {
//         event_name,
//         subscriber_id,
//         website_id: finalWebsiteId,
//         campaign_id: properties?.campaign_id
//       }
//     });

//   } catch (error: any) {
//     console.error('[Event Track] ❌ Fatal error:', error);
//     console.error('[Event Track] Error stack:', error.stack);
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

// // 🔥 CRITICAL: Export with CORS
// export const POST = withPublicCors(handleTrackEvent);

// // Also handle OPTIONS for preflight
// export const OPTIONS = async (request: NextRequest) => {
//   return new NextResponse(null, {
//     status: 200,
//     headers: {
//       'Access-Control-Allow-Origin': '*',
//       'Access-Control-Allow-Methods': 'POST, OPTIONS',
//       'Access-Control-Allow-Headers': 'Content-Type',
//     },
//   });
// };






















// app/api/events/track/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { withPublicCors } from '@/lib/auth-middleware';
import { trackEventWithJourneys } from '@/lib/journeys/entry-handler';

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
    
    const body = await request.json();
    console.log('[Event Track] 📦 Request body:', JSON.stringify(body, null, 2));
    
    const { 
      subscriber_id, 
      event_name,
      event_data,
      properties = {},
      website_id 
    } = body;

    console.log(`[Event Track] 🎯 Event: ${event_name}`);
    console.log(`[Event Track] 👤 Subscriber: ${subscriber_id}`);
    console.log(`[Event Track] 🌐 Website: ${website_id}`);

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

    if (!finalWebsiteId) {
      console.error('[Event Track] ❌ Could not determine website_id');
      return NextResponse.json(
        {
          success: false,
          error: 'website_id is required'
        },
        { status: 400 }
      );
    }

    // Merge properties and event_data
    const mergedProperties = {
      ...properties,
      ...event_data,
    };

    console.log('[Event Track] 📋 Merged properties:', mergedProperties);

    // Handle notification_clicked event for analytics
    if (event_name === 'notification_clicked') {
      const campaignId = mergedProperties?.campaign_id;
      
      if (!campaignId) {
        console.warn('[Event Track] ⚠️ notification_clicked event missing campaign_id');
      } else {
        console.log(`[Event Track] 🎯 Processing notification click for campaign: ${campaignId}`);
        
        try {
          // Find and update the notification log
          const { data: logs } = await supabase
            .from('notification_logs')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('subscriber_id', subscriber_id)
            .is('clicked_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (logs && logs.length > 0) {
            await supabase
              .from('notification_logs')
              .update({ clicked_at: new Date().toISOString() })
              .eq('id', logs[0].id);
            
            console.log('[Event Track] ✅ Notification log updated');
          }

          // Increment campaign clicked_count
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('clicked_count')
            .eq('id', campaignId)
            .single();

          if (campaign) {
            const newClickedCount = (campaign.clicked_count || 0) + 1;
            await supabase
              .from('campaigns')
              .update({ clicked_count: newClickedCount })
              .eq('id', campaignId);
            
            console.log('[Event Track] ✅ Campaign clicks updated to:', newClickedCount);
          }
        } catch (error: any) {
          console.error('[Event Track] ❌ Error in click tracking:', error);
        }
      }
    }

    // Insert subscriber event
    console.log(`[Event Track] 💾 Inserting subscriber event...`);
    const { data: event, error: insertError } = await supabase
      .from('subscriber_events')
      .insert({
        subscriber_id,
        website_id: finalWebsiteId,
        event_name,
        properties: mergedProperties
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Event Track] ❌ Error inserting event:', insertError);
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

    // 🔥 JOURNEY PROCESSING - THIS IS THE CRITICAL PART 🔥
    console.log('[Event Track] 🚀 Processing journeys for event...');
    console.log('[Event Track] 📋 Journey params:', {
      subscriber_id,
      website_id: finalWebsiteId,
      event_name,
      has_event_data: !!mergedProperties
    });

    try {
      await trackEventWithJourneys({
        subscriber_id,
        website_id: finalWebsiteId,
        event_name,
        event_data: mergedProperties,
        timestamp: new Date().toISOString(),
      });
      console.log('[Event Track] ✅ Journey processing completed');
    } catch (journeyError: any) {
      console.error('[Event Track] ❌ Journey processing error:', journeyError);
      console.error('[Event Track] Journey error stack:', journeyError.stack);
      // Don't fail the request if journey processing fails
    }

    return NextResponse.json({
      success: true,
      event_id: event.id,
      message: 'Event tracked successfully',
      debug: {
        event_name,
        subscriber_id,
        website_id: finalWebsiteId,
        properties: mergedProperties,
        journey_handler_called: true
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

// Export with CORS
export const POST = withPublicCors(handleTrackEvent);

// Handle OPTIONS for preflight
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