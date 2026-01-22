// // // app/api/notifications/test/route.ts
// // // Send test notification to a single subscriber

// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@/lib/supabase/server';
// // import { sendNotificationToSubscriber } from '@/lib/push/sender';

// // export async function POST(req: NextRequest) {
// //   try {
// //     const supabase = await createClient();


// //     const { data: { user }, error: authError } = await supabase.auth.getUser();
// //     if (authError || !user) {
// //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// //     }

// //     const body = await req.json();
// //     const { subscriberId, title, body: notifBody, url, icon, image } = body;

// //     if (!subscriberId || !title || !notifBody) {
// //       return NextResponse.json(
// //         { error: 'Required: subscriberId, title, body' },
// //         { status: 400 }
// //       );
// //     }

// //     // Get subscriber and verify ownership
// //     const { data: subscriber, error: subError } = await supabase
// //       .from('subscribers')
// //       .select(`
// //         *,
// //         websites!inner(user_id)
// //       `)
// //       .eq('id', subscriberId)
// //       .single();

// //     if (subError || !subscriber || subscriber.websites.user_id !== user.id) {
// //       return NextResponse.json(
// //         { error: 'Subscriber not found or access denied' },
// //         { status: 404 }
// //       );
// //     }

// //     const notification = {
// //       title,
// //       body: notifBody,
// //       icon: icon || '/icon-192.png',
// //       badge: '/badge-72.png',
// //       image,
// //       url: url || '/',
// //       tag: `test-${Date.now()}`,
// //     };

// //     const result = await sendNotificationToSubscriber(subscriber, notification);

// //     if (result.success) {
// //       return NextResponse.json({
// //         success: true,
// //         message: 'Test notification sent successfully',
// //         platform: result.platform,
// //       });
// //     } else {
// //       return NextResponse.json({
// //         success: false,
// //         message: 'Failed to send test notification',
// //         error: result.error,
// //         platform: result.platform,
// //       }, { status: 500 });
// //     }
// //   } catch (error: any) {
// //     console.error('[Test Notification] Error:', error);
// //     return NextResponse.json(
// //       { error: 'Internal server error', details: error.message },
// //       { status: 500 }
// //     );
// //   }
// // }


// // app/api/notifications/test/route.ts
// // Send test notification with branding to a single subscriber

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';
// import { sendNotificationToSubscriber } from '@/lib/push/sender';

// export async function POST(req: NextRequest) {
//   try {
//     const supabase = await createClient();

//     // Verify authentication
//     const { data: { user }, error: authError } = await supabase.auth.getUser();
//     if (authError || !user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const body = await req.json();
//     const { websiteId, subscriberId, title, body: notifBody, url, icon, image } = body;

//     // Allow either websiteId (to send to all subscribers) or subscriberId (to send to one)
//     if (!title || !notifBody || (!websiteId && !subscriberId)) {
//       return NextResponse.json(
//         { error: 'Required: title, body, and either websiteId or subscriberId' },
//         { status: 400 }
//       );
//     }

//     // ✅ Fetch website with branding
//     let website: any;
//     let subscriber: any;

//     if (subscriberId) {
//       // Get subscriber and verify ownership through website
//       const { data: subData, error: subError } = await supabase
//         .from('subscribers')
//         .select(`
//           *,
//           websites!inner(
//             id,
//             name,
//             url,
//             user_id,
//             notification_branding
//           )
//         `)
//         .eq('id', subscriberId)
//         .single();

//       if (subError || !subData || subData.websites.user_id !== user.id) {
//         return NextResponse.json(
//           { error: 'Subscriber not found or access denied' },
//           { status: 404 }
//         );
//       }

//       subscriber = subData;
//       website = subData.websites;
//     } else if (websiteId) {
//       // Get website and verify ownership
//       const { data: websiteData, error: websiteError } = await supabase
//         .from('websites')
//         .select('*')
//         .eq('id', websiteId)
//         .eq('user_id', user.id)
//         .single();

//       if (websiteError || !websiteData) {
//         return NextResponse.json(
//           { error: 'Website not found or access denied' },
//           { status: 404 }
//         );
//       }

//       website = websiteData;

//       // Get all active subscribers for this website
//       const { data: subscribers, error: subsError } = await supabase
//         .from('subscribers')
//         .select('*')
//         .eq('website_id', websiteId)
//         .eq('status', 'active')
//         .limit(1);

//       if (subsError || !subscribers || subscribers.length === 0) {
//         return NextResponse.json(
//           { error: 'No active subscribers found for this website' },
//           { status: 404 }
//         );
//       }

//       subscriber = subscribers[0];
//     }

//     // ✅ Extract branding from website
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

//     console.log('[Test Notification] Using branding:', {
//       websiteName: website.name,
//       hasLogo: !!branding.logo_url,
//       primaryColor: branding.primary_color,
//       position: branding.notification_position,
//     });

//     // ✅ Build test notification with branding
//     const notification = {
//       title: title || '🎨 Test Notification',
//       body: notifBody || 'This is how your branded notifications will look! If you can see this, everything is working perfectly.',
//       icon: branding.logo_url || icon || '/icon-192.png',
//       badge: '/badge-72.png',
//       image: image,
//       url: url || website.url || '/',
//       tag: `test-${Date.now()}`,
//       // ✅ Include branding in the notification payload
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

//     // Send the notification
//     const result = await sendNotificationToSubscriber(subscriber, notification);

//     if (result.success) {
//       // Log the test notification
//       await supabase.from('notification_logs').insert({
//         subscriber_id: subscriber.id,
//         website_id: website.id,
//         status: 'delivered',
//         platform: result.platform,
//         sent_at: new Date().toISOString(),
//       });

//       return NextResponse.json({
//         success: true,
//         message: 'Test notification sent successfully with branding',
//         platform: result.platform,
//         branding: {
//           primary_color: branding.primary_color,
//           secondary_color: branding.secondary_color,
//           has_logo: !!branding.logo_url,
//         }
//       });
//     } else {
//       return NextResponse.json({
//         success: false,
//         message: 'Failed to send test notification',
//         error: result.error,
//         platform: result.platform,
//       }, { status: 500 });
//     }
//   } catch (error: any) {
//     console.error('[Test Notification] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error', details: error.message },
//       { status: 500 }
//     );
//   }
// }


// // ============================================================================
// // Send test to ALL subscribers of a website
// // ============================================================================

// export async function PUT(req: NextRequest) {
//   try {
//     const supabase = await createClient();

//     const { data: { user }, error: authError } = await supabase.auth.getUser();
//     if (authError || !user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const body = await req.json();
//     const { websiteId } = body;

//     if (!websiteId) {
//       return NextResponse.json(
//         { error: 'websiteId is required' },
//         { status: 400 }
//       );
//     }

//     // Get website with branding
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

//     // Get all active subscribers
//     const { data: subscribers, error: subsError } = await supabase
//       .from('subscribers')
//       .select('*')
//       .eq('website_id', websiteId)
//       .eq('status', 'active');

//     if (subsError || !subscribers || subscribers.length === 0) {
//       return NextResponse.json(
//         { error: 'No active subscribers found' },
//         { status: 404 }
//       );
//     }

//     const branding = website.notification_branding || {};

//     // Build test notification
//     const notification = {
//       title: '🎨 Test Notification',
//       body: `This is a test notification from ${website.name}. Your branding is working!`,
//       icon: branding.logo_url || '/icon-192.png',
//       badge: '/badge-72.png',
//       url: website.url || '/',
//       tag: `test-all-${Date.now()}`,
//       branding: branding,
//     };

//     // Send to all subscribers
//     let sent = 0;
//     let failed = 0;

//     for (const subscriber of subscribers) {
//       const result = await sendNotificationToSubscriber(subscriber, notification);
//       if (result.success) {
//         sent++;
//       } else {
//         failed++;
//       }
//     }

//     return NextResponse.json({
//       success: true,
//       message: `Test notification sent to ${sent} subscriber(s)`,
//       sent,
//       failed,
//       total: subscribers.length,
//     });

//   } catch (error: any) {
//     console.error('[Test All] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error', details: error.message },
//       { status: 500 }
//     );
//   }
// }

// app/api/notifications/test/route.ts
// Send test notification with branding to a single subscriber

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendNotificationToSubscriber } from '@/lib/push/sender';
import { parseBranding } from '@/types/branding';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { websiteId, subscriberId, title, body: notifBody, url, icon, image } = body;

    // Allow either websiteId (to send to all subscribers) or subscriberId (to send to one)
    if (!title || !notifBody || (!websiteId && !subscriberId)) {
      return NextResponse.json(
        { error: 'Required: title, body, and either websiteId or subscriberId' },
        { status: 400 }
      );
    }

    // ✅ Fetch website with branding
    let website: any;
    let subscriber: any;

    if (subscriberId) {
      // Get subscriber and verify ownership through website
      const { data: subData, error: subError } = await supabase
        .from('subscribers')
        .select(`
          *,
          websites!inner(
            id,
            name,
            url,
            user_id,
            notification_branding
          )
        `)
        .eq('id', subscriberId)
        .single();

      if (subError || !subData || subData.websites.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Subscriber not found or access denied' },
          { status: 404 }
        );
      }

      subscriber = subData;
      website = subData.websites;
    } else if (websiteId) {
      // Get website and verify ownership
      const { data: websiteData, error: websiteError } = await supabase
        .from('websites')
        .select('*')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .single();

      if (websiteError || !websiteData) {
        return NextResponse.json(
          { error: 'Website not found or access denied' },
          { status: 404 }
        );
      }

      website = websiteData;

      // Get all active subscribers for this website
      const { data: subscribers, error: subsError } = await supabase
        .from('subscribers')
        .select('*')
        .eq('website_id', websiteId)
        .eq('status', 'active')
        .limit(1);

      if (subsError || !subscribers || subscribers.length === 0) {
        return NextResponse.json(
          { error: 'No active subscribers found for this website' },
          { status: 404 }
        );
      }

      subscriber = subscribers[0];
    }

    // ✅ Extract branding from website with type safety
    const branding = parseBranding(website.notification_branding);

    console.log('[Test Notification] Using branding:', {
      websiteName: website.name,
      hasLogo: !!branding.logo_url,
      primaryColor: branding.primary_color,
      position: branding.notification_position,
    });

    // ✅ Build test notification with branding
    const notification = {
      title: title || '🎨 Test Notification',
      body: notifBody || 'This is how your branded notifications will look! If you can see this, everything is working perfectly.',
      icon: branding.logo_url || icon || '/icon-192.png',
      badge: '/badge-72.png',
      image: image,
      url: url || website.url || '/',
      tag: `test-${Date.now()}`,
      // ✅ Include branding in the notification payload
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

    // Send the notification
    const result = await sendNotificationToSubscriber(subscriber, notification);

    if (result.success) {
      // Log the test notification
      await supabase.from('notification_logs').insert({
        subscriber_id: subscriber.id,
        website_id: website.id,
        status: 'delivered',
        platform: result.platform,
        sent_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully with branding',
        platform: result.platform,
        branding: {
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          has_logo: !!branding.logo_url,
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send test notification',
        error: result.error,
        platform: result.platform,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Test Notification] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


// ============================================================================
// Send test to ALL subscribers of a website
// ============================================================================

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { websiteId } = body;

    if (!websiteId) {
      return NextResponse.json(
        { error: 'websiteId is required' },
        { status: 400 }
      );
    }

    // Get website with branding
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

    // Get all active subscribers
    const { data: subscribers, error: subsError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('website_id', websiteId)
      .eq('status', 'active');

    if (subsError || !subscribers || subscribers.length === 0) {
      return NextResponse.json(
        { error: 'No active subscribers found' },
        { status: 404 }
      );
    }

    const branding = parseBranding(website.notification_branding);

    // Build test notification
    const notification = {
      title: '🎨 Test Notification',
      body: `This is a test notification from ${website.name}. Your branding is working!`,
      icon: branding.logo_url || '/icon-192.png',
      badge: '/badge-72.png',
      url: website.url || '/',
      tag: `test-all-${Date.now()}`,
      branding: branding,
    };

    // Send to all subscribers
    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
      const result = await sendNotificationToSubscriber(subscriber, notification);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Test notification sent to ${sent} subscriber(s)`,
      sent,
      failed,
      total: subscribers.length,
    });

  } catch (error: any) {
    console.error('[Test All] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}