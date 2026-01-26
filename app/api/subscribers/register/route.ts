// // app/api/subscribers/register/route.ts
// // PUBLIC endpoint - called by sigme.js on client websites

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import { withPublicCors } from '@/lib/auth-middleware';
// import type { Database } from '@/types/database';

// async function handler(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { websiteId, endpoint, p256dh, auth, platform, browser, os } = body;

//     console.log('📝 [Register Subscriber] Request for website:', websiteId);

//     // Validate required fields
//     if (!websiteId || !endpoint || !p256dh || !auth) {
//       console.log(' [Register Subscriber] Missing required fields');
//       return NextResponse.json(
//         { 
//           success: false, 
//           error: 'Missing required fields: websiteId, endpoint, p256dh, auth' 
//         },
//         { status: 400 }
//       );
//     }

//     // Use service role key for public registration
//     const supabase = createClient<Database>(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.SUPABASE_SERVICE_ROLE_KEY!
//     );

//     // Verify website exists and is active
//     const { data: website, error: websiteError } = await supabase
//       .from('websites')
//       .select('id, name, status')
//       .eq('id', websiteId)
//       .eq('status', 'active')
//       .single();

//     if (websiteError || !website) {
//       console.error(' [Register Subscriber] Website not found:', websiteId);
//       return NextResponse.json(
//         { success: false, error: 'Website not found or inactive' },
//         { status: 404 }
//       );
//     }

//     console.log(' [Register Subscriber] Website verified:', website.name);

//     // Check if subscriber already exists
//     const { data: existing } = await supabase
//       .from('subscribers')
//       .select('id, status')
//       .eq('endpoint', endpoint)
//       .eq('website_id', websiteId)
//       .maybeSingle();

//     if (existing) {
//       if (existing.status === 'active') {
//         console.log('ℹ️ [Register Subscriber] Already subscribed:', existing.id);
//         return NextResponse.json({
//           success: true,
//           subscriber: existing,
//           message: 'Already subscribed',
//         });
//       }

//       // Reactivate if previously unsubscribed
//       const { data: reactivated, error: reactivateError } = await supabase
//         .from('subscribers')
//         .update({
//           status: 'active',
//           p256dh_key: p256dh,
//           auth_key: auth,
//           platform: platform || 'web',
//           browser: browser || 'Unknown',
//           os: os || 'Unknown',
//           last_seen_at: new Date().toISOString(),
//         })
//         .eq('id', existing.id)
//         .select()
//         .single();

//       if (reactivateError) {
//         console.error(' [Register Subscriber] Reactivation error:', reactivateError);
//         return NextResponse.json(
//           { success: false, error: reactivateError.message },
//           { status: 500 }
//         );
//       }

//       console.log(' [Register Subscriber] Reactivated:', reactivated.id);
//       return NextResponse.json({
//         success: true,
//         subscriber: reactivated,
//         message: 'Subscriber reactivated',
//       });
//     }

//     // Create new subscriber
//     const { data: newSubscriber, error: insertError } = await supabase
//       .from('subscribers')
//       .insert({
//         website_id: websiteId,
//         endpoint,
//         p256dh_key: p256dh,
//         auth_key: auth,
//         platform: platform || 'web',
//         browser: browser || 'Unknown',
//         os: os || 'Unknown',
//         device_type: 'desktop',
//         status: 'active',
//         subscribed_at: new Date().toISOString(),
//         last_seen_at: new Date().toISOString(),
//       })
//       .select()
//       .single();

//     if (insertError) {
//       console.error(' [Register Subscriber] Insert error:', insertError);
//       return NextResponse.json(
//         { success: false, error: insertError.message },
//         { status: 500 }
//       );
//     }

//     console.log(' [Register Subscriber] New subscriber created:', newSubscriber.id);

//     return NextResponse.json(
//       {
//         success: true,
//         subscriber: newSubscriber,
//         message: 'Subscriber registered successfully',
//       },
//       { status: 201 }
//     );

//   } catch (error: any) {
//     console.error(' [Register Subscriber] Error:', error);
//     return NextResponse.json(
//       { success: false, error: error.message || 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// // Export with public CORS (allows ANY origin)
// export const POST = withPublicCors(handler);


// app/api/subscribers/register/route.ts
// SIMPLIFIED VERSION - Using geolocation service utility

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withPublicCors } from '@/lib/auth-middleware';
import { getClientIP, getSubscriberMetadata } from '@/lib/geolocation-service';
import type { Database } from '@/types/database';

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { websiteId, endpoint, p256dh, auth, platform, browser, os } = body;

    console.log('📝 [Register Subscriber] Request for website:', websiteId);

    // Validate required fields
    if (!websiteId || !endpoint || !p256dh || !auth) {
      console.log('❌ [Register Subscriber] Missing required fields');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: websiteId, endpoint, p256dh, auth' 
        },
        { status: 400 }
      );
    }

    // Initialize Supabase
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
      console.error('❌ [Register Subscriber] Website not found:', websiteId);
      return NextResponse.json(
        { success: false, error: 'Website not found or inactive' },
        { status: 404 }
      );
    }

    console.log('✅ [Register Subscriber] Website verified:', website.name);

    // Get IP and user agent
    const ipAddress = getClientIP(req.headers);
    const userAgent = req.headers.get('user-agent') || '';

    console.log('🌐 [Register Subscriber] Client IP:', ipAddress);

    // Fetch geolocation and device metadata
    const metadata = await getSubscriberMetadata(ipAddress, userAgent);

    console.log('📍 [Register Subscriber] Metadata:', {
      city: metadata.city,
      country: metadata.country,
      device: metadata.device_type,
      browser: metadata.browser
    });

    // Check if subscriber already exists
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, status')
      .eq('endpoint', endpoint)
      .eq('website_id', websiteId)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'active') {
        console.log('ℹ️ [Register Subscriber] Already subscribed:', existing.id);
        
        // Update geo data even for existing subscribers
        await supabase
          .from('subscribers')
          .update({
            country: metadata.country,
            city: metadata.city,
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

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
          browser: browser || metadata.browser,
          os: os || metadata.os,
          device_type: metadata.device_type,
          user_agent: userAgent,
          country: metadata.country,
          city: metadata.city,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (reactivateError) {
        console.error('❌ [Register Subscriber] Reactivation error:', reactivateError);
        return NextResponse.json(
          { success: false, error: reactivateError.message },
          { status: 500 }
        );
      }

      console.log('♻️ [Register Subscriber] Reactivated:', reactivated.id);
      return NextResponse.json({
        success: true,
        subscriber: reactivated,
        message: 'Subscriber reactivated',
      });
    }

    // Create new subscriber with all metadata
    const { data: newSubscriber, error: insertError } = await supabase
      .from('subscribers')
      .insert({
        website_id: websiteId,
        endpoint,
        p256dh_key: p256dh,
        auth_key: auth,
        platform: platform || 'web',
        browser: browser || metadata.browser,
        os: os || metadata.os,
        device_type: metadata.device_type,
        user_agent: userAgent,
        country: metadata.country,      // ✅ Geo data from IP
        city: metadata.city,            // ✅ Geo data from IP
        status: 'active',
        subscribed_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ [Register Subscriber] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    console.log('✅ [Register Subscriber] New subscriber created:', newSubscriber.id);
    console.log('📍 [Register Subscriber] Location:', newSubscriber.city, newSubscriber.country);

    return NextResponse.json(
      {
        success: true,
        subscriber: {
          id: newSubscriber.id,
          country: newSubscriber.country,
          city: newSubscriber.city,
          browser: newSubscriber.browser,
          device_type: newSubscriber.device_type,
          status: newSubscriber.status,
          created_at: newSubscriber.created_at
        },
        message: 'Subscriber registered successfully',
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('❌ [Register Subscriber] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export with public CORS (allows ANY origin)
export const POST = withPublicCors(handler);