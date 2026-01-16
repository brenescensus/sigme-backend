// FILE: app/api/notifications/test/route.ts
// Send test notification to a single subscriber
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendNotificationToSubscriber } from '@/lib/push/sender';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();


    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subscriberId, title, body: notifBody, url, icon, image } = body;

    if (!subscriberId || !title || !notifBody) {
      return NextResponse.json(
        { error: 'Required: subscriberId, title, body' },
        { status: 400 }
      );
    }

    // Get subscriber and verify ownership
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select(`
        *,
        websites!inner(user_id)
      `)
      .eq('id', subscriberId)
      .single();

    if (subError || !subscriber || subscriber.websites.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Subscriber not found or access denied' },
        { status: 404 }
      );
    }

    const notification = {
      title,
      body: notifBody,
      icon: icon || '/icon-192.png',
      badge: '/badge-72.png',
      image,
      url: url || '/',
      tag: `test-${Date.now()}`,
    };

    const result = await sendNotificationToSubscriber(subscriber, notification);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
        platform: result.platform,
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
