// backend/app/api/notifications/track-delivery/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  console.log('🔔 [Track Delivery] Notification delivery received');

  try {
    const body = await request.json();
    const { notification_id, subscriber_id, journey_id, delivered_at } = body;

    console.log('🔔 [Track Delivery] Notification ID:', notification_id);
    console.log('🔔 [Track Delivery] Subscriber ID:', subscriber_id);
    console.log('🔔 [Track Delivery] Journey ID:', journey_id);

    if (!notification_id) {
      return NextResponse.json(
        { success: false, error: 'notification_id is required' },
        { status: 400 }
      );
    }

    // ✅ UPDATE NOTIFICATION LOG WITH DELIVERED TIMESTAMP
    const { error: updateError } = await supabase
      .from('notification_logs')
      .update({
        delivered_at: delivered_at || new Date().toISOString(),
        status: 'delivered',
      })
      .eq('id', notification_id);

    if (updateError) {
      console.error('❌ [Track Delivery] Database error:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ [Track Delivery] Delivery tracked successfully');

    // ✅ LOG JOURNEY EVENT IF THIS IS A JOURNEY NOTIFICATION
    if (journey_id && subscriber_id) {
      console.log('📊 [Track Delivery] Logging journey event...');

      // Get the user_journey_state_id from notification_logs
      const { data: notificationLog } = await supabase
        .from('notification_logs')
        .select('user_journey_state_id')
        .eq('id', notification_id)
        .single();

      if (notificationLog?.user_journey_state_id) {
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

        console.log('✅ [Track Delivery] Journey event logged');
      }
    }

    return NextResponse.json({
      success: true,
      notification_id,
      delivered_at,
    });

  } catch (error: any) {
    console.error('❌ [Track Delivery] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}