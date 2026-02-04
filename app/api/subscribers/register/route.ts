// app/api/subscribers/register/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withPublicCors } from '@/lib/auth-middleware';
import { getClientIP, getSubscriberMetadata } from '@/lib/geolocation-service';
import { trackEventWithJourneys } from '@/lib/journeys/entry-handler'; //  IMPORT
import type { Database } from '@/types/database';

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { websiteId, endpoint, p256dh, auth, platform, browser, os } = body;

    console.log(' [Register Subscriber] Request for website:', websiteId);

    if (!websiteId || !endpoint || !p256dh || !auth) {
      console.log(' [Register Subscriber] Missing required fields');
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: websiteId, endpoint, p256dh, auth'
        },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, name, status')
      .eq('id', websiteId)
      .eq('status', 'active')
      .single();

    if (websiteError || !website) {
      console.error(' [Register Subscriber] Website not found:', websiteId);
      return NextResponse.json(
        { success: false, error: 'Website not found or inactive' },
        { status: 404 }
      );
    }

    console.log(' [Register Subscriber] Website verified:', website.name);

    const ipAddress = getClientIP(req.headers);
    const userAgent = req.headers.get('user-agent') || '';

    console.log(' [Register Subscriber] Client IP:', ipAddress);

    const metadata = await getSubscriberMetadata(ipAddress, userAgent);

    console.log(' [Register Subscriber] Metadata:', {
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
        console.log(' [Register Subscriber] Already subscribed:', existing.id);

        // Update geo data
        await supabase
          .from('subscribers')
          .update({
            country: metadata.country,
            city: metadata.city,
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        //  CRITICAL: TRACK EVENT FOR EXISTING SUBSCRIBER TOO!
        console.log(' [Register Subscriber] Tracking user_subscribed event for existing subscriber...');
        try {
          await trackEventWithJourneys({
            subscriber_id: existing.id,
            website_id: websiteId,
            event_name: 'user_subscribed',
            event_data: {
              existing_subscriber: true,
              browser: metadata.browser,
              os: metadata.os,
              country: metadata.country,
              city: metadata.city,
              device_type: metadata.device_type,
            },
            timestamp: new Date().toISOString(),
          });
          console.log(' [Register Subscriber] Event tracked for existing subscriber');
        } catch (eventError: any) {
          console.error(' [Register Subscriber] Event tracking failed:', eventError.message);
        }

        return NextResponse.json({
          success: true,
          subscriber_id: existing.id,
          data: {
            id: existing.id,
            status: existing.status,
          },
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
        console.error(' [Register Subscriber] Reactivation error:', reactivateError);
        return NextResponse.json(
          { success: false, error: reactivateError.message },
          { status: 500 }
        );
      }

      console.log(' [Register Subscriber] Reactivated:', reactivated.id);

      // Track reactivation event
      console.log(' [Register Subscriber] Tracking user_subscribed event for reactivation...');
      try {
        await trackEventWithJourneys({
          subscriber_id: reactivated.id,
          website_id: websiteId,
          event_name: 'user_subscribed',
          event_data: {
            reactivation: true,
            browser: reactivated.browser,
            os: reactivated.os,
            country: reactivated.country,
            city: reactivated.city,
            device_type: reactivated.device_type,
          },
          timestamp: new Date().toISOString(),
        });
        console.log(' [Register Subscriber] Reactivation event tracked');
      } catch (eventError: any) {
        console.error(' [Register Subscriber] Event tracking failed:', eventError.message);
      }

      return NextResponse.json({
        success: true,
        subscriber_id: reactivated.id,
        data: reactivated,
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
        browser: browser || metadata.browser,
        os: os || metadata.os,
        device_type: metadata.device_type,
        user_agent: userAgent,
        country: metadata.country,
        city: metadata.city,
        status: 'active',
        subscribed_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error(' [Register Subscriber] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    console.log(' [Register Subscriber] New subscriber created:', newSubscriber.id);
    console.log(' [Register Subscriber] Location:', newSubscriber.city, newSubscriber.country);

    // Track subscription event for new subscriber
    console.log(' [Register Subscriber] Tracking user_subscribed event...');
    try {
      await trackEventWithJourneys({
        subscriber_id: newSubscriber.id,
        website_id: websiteId,
        event_name: 'user_subscribed',
        event_data: {
          browser: newSubscriber.browser,
          os: newSubscriber.os,
          country: newSubscriber.country,
          city: newSubscriber.city,
          device_type: newSubscriber.device_type,
          subscribed_at: newSubscriber.subscribed_at,
        },
        timestamp: new Date().toISOString(),
      });
      console.log(' [Register Subscriber] Event tracked successfully');
    } catch (eventError: any) {
      console.error(' [Register Subscriber] Event tracking failed:', eventError.message);
    }

    return NextResponse.json(
      {
        success: true,
        subscriber_id: newSubscriber.id,
        data: {
          id: newSubscriber.id,
          country: newSubscriber.country,
          city: newSubscriber.city,
          browser: newSubscriber.browser,
          device_type: newSubscriber.device_type,
          status: newSubscriber.status,
          created_at: newSubscriber.created_at
        },
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
    console.error(' [Register Subscriber] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withPublicCors(handler);