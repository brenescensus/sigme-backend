// app/api/notifications/track-click/route.ts
// ✨ NEW UNIFIED CLICK TRACKING ENDPOINT

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  console.log('[Track Click] Notification click received');
  
  try {
    const body = await request.json();
    const { 
      notification_id,
      campaign_id, 
      subscriber_id, 
      journey_id,
      url,
      title 
    } = body;

    console.log('[Track Click] Campaign ID:', campaign_id);
    console.log('[Track Click] Subscriber ID:', subscriber_id);
    console.log('[Track Click] Notification ID:', notification_id);

    if (!subscriber_id) {
      return NextResponse.json(
        { success: false, error: 'subscriber_id is required' },
        { status: 400 }
      );
    }

    let logId = notification_id;
    let actualCampaignId = campaign_id;
    let actualJourneyId = journey_id;

    // If notification_id provided, update that specific log
    if (notification_id) {
      const { data: log, error: logError } = await supabase
        .from('notification_logs')
        .update({
          clicked_at: new Date().toISOString(),
        })
        .eq('id', notification_id)
        .eq('subscriber_id', subscriber_id)
        .is('clicked_at', null)  // ← Only update if not already clicked
        .select('id, campaign_id, journey_id')
        .single();

      if (log) {
        actualCampaignId = log.campaign_id || actualCampaignId;
        actualJourneyId = log.journey_id || actualJourneyId;
        console.log('[Track Click]  Notification log updated');
      } else if (logError) {
        console.warn('[Track Click] Could not update log:', logError.message);
      }
    } 
    // Otherwise, find the most recent log for this campaign/subscriber
    else if (campaign_id && subscriber_id) {
      const { data: log, error: findError } = await supabase
        .from('notification_logs')
        .update({
          clicked_at: new Date().toISOString(),
        })
        .eq('campaign_id', campaign_id)
        .eq('subscriber_id', subscriber_id)
        .is('clicked_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .select('id, journey_id')
        .single();

      if (log) {
        logId = log.id;
        actualJourneyId = log.journey_id || actualJourneyId;
        console.log('[Track Click]  Found and updated log:', logId);
      } else if (findError) {
        console.warn('[Track Click] No log found or already clicked');
      }
    }

    // INCREMENT CAMPAIGN CLICKED COUNT (ATOMIC)
    if (actualCampaignId) {
      console.log('[Track Click] Incrementing campaign clicked count...');
      
      const { error: campaignError } = await supabase.rpc('increment_campaign_clicked', {
        p_campaign_id: actualCampaignId
      });

      if (campaignError) {
        console.error('[Track Click] Failed to increment campaign:', campaignError);
      } else {
        console.log('[Track Click]  Campaign clicked_count incremented');
      }
    }

    // Log journey event if applicable
    if (actualJourneyId && subscriber_id) {
      console.log('[Track Click] Logging journey click event...');
      
      const { data: log } = await supabase
        .from('notification_logs')
        .select('user_journey_state_id')
        .eq('id', logId || notification_id)
        .single();

      if (log?.user_journey_state_id) {
        await supabase.from('journey_events').insert({
          journey_id: actualJourneyId,
          subscriber_id,
          user_journey_state_id: log.user_journey_state_id,
          event_type: 'notification_clicked',
          step_id: null,
          metadata: {
            notification_id: logId || notification_id,
            url,
            title,
            clicked_at: new Date().toISOString(),
          },
        });
        
        console.log('[Track Click]  Journey click event logged');
      }
    }

    //  Track custom event
    if (subscriber_id) {
      await supabase.from('subscriber_events').insert({
        subscriber_id,
        event_name: 'notification_clicked',
        properties: {
          campaign_id: actualCampaignId,
          journey_id: actualJourneyId,
          url,
          title,
          clicked_at: new Date().toISOString(),
        },
      });
    }

    console.log('[Track Click]  Click tracked successfully');

    return NextResponse.json({
      success: true,
      clicked: true,
    });

  } catch (error: any) {
    console.error('[Track Click]  Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// CORS support for cross-origin requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}