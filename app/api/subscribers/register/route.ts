

// // app/api/subscribers/register/route.ts
// // Register new push subscription )


// import { NextRequest, NextResponse } from 'next/server';
// import { createServiceClient } from '@/lib/supabase/server';

// export async function POST(req: NextRequest) {
//   try {
//     const supabase = createServiceClient(); // Use service role for public access

//     const body = await req.json();
//     const { 
//       websiteId, 
//       subscription, 
//       platform, 
//       browser, 
//       os, 
//       deviceType, 
//       country, 
//       city 
//     } = body;

//     // Validation
//     if (!websiteId || !subscription) {
//       return NextResponse.json(
//         { error: 'websiteId and subscription are required' },
//         { status: 400 }
//       );
//     }

//     // Verify website exists and is active
//     const { data: website, error: websiteError } = await supabase
//       .from('websites')
//       .select('id, status')
//       .eq('id', websiteId)
//       .maybeSingle();

//     if (websiteError || !website) {
//       return NextResponse.json(
//         { error: 'Invalid website ID' },
//         { status: 400 }
//       );
//     }

//     if (website.status !== 'active') {
//       return NextResponse.json(
//         { error: 'Website is not active' },
//         { status: 403 }
//       );
//     }

//     // Extract subscription details
//     const endpoint = subscription.endpoint;
//     const keys = subscription.keys || {};
//     const p256dhKey = keys.p256dh;
//     const authKey = keys.auth;

//     if (!endpoint || !p256dhKey || !authKey) {
//       return NextResponse.json(
//         { error: 'Invalid subscription format. Required: endpoint, keys.p256dh, keys.auth' },
//         { status: 400 }
//       );
//     }

//     // Get client info
//     const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
//                    || req.headers.get('x-real-ip') 
//                    || null;
//     const userAgent = req.headers.get('user-agent') || null;

//     // Check if subscription already exists
//     const { data: existing } = await supabase
//       .from('subscribers')
//       .select('id, status, platform, browser, os, device_type')
//       .eq('endpoint', endpoint)
//       .eq('website_id', websiteId)
//       .maybeSingle();

//     if (existing) {
//       // Update existing subscription
//       const { data, error } = await supabase
//         .from('subscribers')
//         .update({
//           status: 'active',
//           last_seen_at: new Date().toISOString(),
//           platform: platform || existing.platform || 'web',
//           browser: browser || existing.browser,
//           os: os || existing.os,
//           device_type: deviceType || existing.device_type,
//           user_agent: userAgent,
//           // Note: updated_at will be set automatically by your trigger
//         })
//         .eq('id', existing.id)
//         .select('id, status')
//         .single();

//       if (error) {
//         console.error('[Subscriber Register] Update error:', error);
//         return NextResponse.json({ error: error.message }, { status: 500 });
//       }

//       return NextResponse.json({
//         success: true,
//         subscriber: {
//           id: data.id,
//           status: data.status,
//         },
//         message: 'Subscription updated successfully',
//       });
//     }

//     // Create new subscription
//     const { data, error } = await supabase
//       .from('subscribers')
//       .insert({
//         website_id: websiteId,
//         endpoint,
//         p256dh_key: p256dhKey,
//         auth_key: authKey,
//         platform: platform || 'web',
//         browser,
//         os,
//         device_type: deviceType,
//         country,
//         city,
//         ip_address: ipAddress,
//         user_agent: userAgent,
//         status: 'active',
//         subscribed_at: new Date().toISOString(),
//         last_seen_at: new Date().toISOString(),
//         // Note: created_at and updated_at will be set automatically
//       })
//       .select('id, status')
//       .single();

//     if (error) {
//       console.error('[Subscriber Register] Insert error:', error);
      
//       // Handle specific errors
//       if (error.code === '23505') { // Unique constraint violation
//         return NextResponse.json(
//           { error: 'Subscription already exists' },
//           { status: 409 }
//         );
//       }

//       // Handle constraint violations
//       if (error.code === '23514') { // Check constraint violation
//         return NextResponse.json(
//           { error: 'Invalid platform or status value' },
//           { status: 400 }
//         );
//       }
      
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }

//     return NextResponse.json({
//       success: true,
//       subscriber: {
//         id: data.id,
//         status: data.status,
//       },
//       message: 'Subscription created successfully',
//     }, { status: 201 });

//   } catch (error: any) {
//     console.error('[Subscriber Register] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// /* ============================================================
//    DELETE - Unsubscribe (PUBLIC)
// ============================================================ */
// export async function DELETE(req: NextRequest) {
//   try {
//     const supabase = createServiceClient();

//     const body = await req.json();
//     const { websiteId, endpoint } = body;

//     if (!websiteId || !endpoint) {
//       return NextResponse.json(
//         { error: 'websiteId and endpoint are required' },
//         { status: 400 }
//       );
//     }

//     // Find and deactivate subscription
//     const { data, error } = await supabase
//       .from('subscribers')
//       .update({
//         status: 'inactive',
//         // Note: updated_at will be set automatically by your trigger
//       })
//       .eq('website_id', websiteId)
//       .eq('endpoint', endpoint)
//       .select('id')
//       .maybeSingle();

//     if (error) {
//       console.error('[Subscriber Unsubscribe] Error:', error);
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }

//     if (!data) {
//       return NextResponse.json(
//         { error: 'Subscription not found' },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       message: 'Unsubscribed successfully',
//     });

//   } catch (error: any) {
//     console.error('[Subscriber Unsubscribe] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// app/api/subscribers/register/route.ts
// PUBLIC endpoint - no authentication required
// Called by sigme.js on client websites

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * POST - Register a new subscriber (PUBLIC)
 * This endpoint is called by the public sigme.js script
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { websiteId, endpoint, p256dh, auth, platform, browser, os } = body;

    console.log('📝 [Register Subscriber] Request for website:', websiteId);

    // Validate required fields
    if (!websiteId || !endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { success: false, error: 'websiteId, endpoint, p256dh, and auth are required' },
        { status: 400 }
      );
    }

    // Use service role key for public registration
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify website exists and is active
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, name, status')
      .eq('id', websiteId)
      .eq('status', 'active')
      .single();

    if (websiteError || !website) {
      console.error('🔴 [Register Subscriber] Website not found:', websiteId);
      return NextResponse.json(
        { success: false, error: 'Website not found or inactive' },
        { status: 404 }
      );
    }

    // Check if subscriber already exists
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, status')
      .eq('endpoint', endpoint)
      .eq('website_id', websiteId)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'active') {
        console.log('ℹ️ [Register Subscriber] Subscriber already exists:', existing.id);
        return NextResponse.json({
          success: true,
          subscriber: existing,
          message: 'Already subscribed',
        });
      }

      // Reactivate if previously unsubscribed
      const { data: reactivated, error: reactivateError } = await supabase
        .from('subscribers')
        .update({
          status: 'active',
          p256dh_key: p256dh,
          auth_key: auth,
          platform: platform || 'web',
          browser,
          os,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (reactivateError) {
        console.error('🔴 [Register Subscriber] Reactivation error:', reactivateError);
        return NextResponse.json(
          { success: false, error: reactivateError.message },
          { status: 500 }
        );
      }

      console.log('✅ [Register Subscriber] Reactivated:', reactivated.id);
      return NextResponse.json({
        success: true,
        subscriber: reactivated,
        message: 'Subscriber reactivated',
      });
    }

    // Create new subscriber
    const { data: newSubscriber, error: insertError } = await supabase
      .from('subscribers')
      .insert({
        website_id: websiteId,
        endpoint,
        p256dh_key: p256dh,
        auth_key: auth,
        platform: platform || 'web',
        browser: browser || 'Unknown',
        os: os || 'Unknown',
        device_type: 'desktop', // Default, can be enhanced
        status: 'active',
        subscribed_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('🔴 [Register Subscriber] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    console.log('✅ [Register Subscriber] Created new subscriber:', newSubscriber.id);

    return NextResponse.json(
      {
        success: true,
        subscriber: newSubscriber,
        message: 'Subscriber registered successfully',
      },
      { 
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );

  } catch (error: any) {
    console.error('🔴 [Register Subscriber] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ✅ Enable CORS for public access
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}