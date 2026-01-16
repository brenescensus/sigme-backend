// FILE: app/api/subscribers/register/route.ts
// Register new push subscription (PUBLIC - no auth required)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient(); // Use service role for public access

    const body = await req.json();
    const { websiteId, subscription, platform, browser, os, deviceType, country, city } = body;

    if (!websiteId || !subscription) {
      return NextResponse.json(
        { error: 'websiteId and subscription are required' },
        { status: 400 }
      );
    }

    const endpoint = subscription.endpoint;
    const keys = subscription.keys || {};
    const p256dhKey = keys.p256dh;
    const authKey = keys.auth;

    if (!endpoint || !p256dhKey || !authKey) {
      return NextResponse.json(
        { error: 'Invalid subscription format. Required: endpoint, keys.p256dh, keys.auth' },
        { status: 400 }
      );
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, status')
      .eq('endpoint', endpoint)
      .eq('website_id', websiteId)
      .maybeSingle();

    if (existing) {
      // Update existing subscription
      const { data, error } = await supabase
        .from('subscribers')
        .update({
          status: 'active',
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[Subscriber Register] Update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        subscriber: data,
        message: 'Subscription updated',
      });
    }

    // Create new subscription
    const { data, error } = await supabase
      .from('subscribers')
      .insert({
        website_id: websiteId,
        endpoint,
        p256dh_key: p256dhKey,
        auth_key: authKey,
        platform: platform || 'web',
        browser,
        os,
        device_type: deviceType,
        country,
        city,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
        status: 'active',
        subscribed_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Subscriber Register] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subscriber: data,
      message: 'Subscription created',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Subscriber Register] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
