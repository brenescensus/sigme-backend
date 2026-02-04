
// ============================================
// app/api/notifications/track-delivery/route.ts
// For campaigns, delivery is tracked server-side in the send route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // console.log('[Track Delivery] Notification delivery received (for journeys only)');
  
  try {
    const body = await request.json();
    const { notification_id, subscriber_id, journey_id, delivered_at } = body;

   
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
      // console.error('[Track Delivery]  Database error:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    if (!notificationLog) {
      // console.error('[Track Delivery]  Notification log not found');
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    console.log('[Track Delivery] Delivery tracked');

    // 2️ONLY increment campaign count if this is a JOURNEY notification
    // Campaign notifications are already tracked server-side
    if (notificationLog.journey_id && !notificationLog.campaign_id) {
      // console.log('[Track Delivery]  Journey notification - incrementing campaign count');
      
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
      // console.log('[Track Delivery]  Logging journey event...');
      
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