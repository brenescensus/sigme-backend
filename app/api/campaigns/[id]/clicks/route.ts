// app/api/campaigns/[id]/click/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { withPublicCors } from '@/lib/auth-middleware';

const supabase = createServiceClient();

async function handleTrackClick(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { subscriberId } = await request.json();
    
    if (!subscriberId) {
      return NextResponse.json(
        { error: 'Subscriber ID required' },
        { status: 400 }
      );
    }

    // Find the notification log
    const { data: log, error: logError } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('campaign_id', params.id)
      .eq('subscriber_id', subscriberId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (logError || !log) {
      return NextResponse.json(
        { error: 'Notification log not found' },
        { status: 404 }
      );
    }

    // Update the log with click timestamp (only if not already clicked)
    if (!log.clicked_at) {
      await supabase
        .from('notification_logs')
        .update({
          clicked_at: new Date().toISOString(),
        })
        .eq('id', log.id);

      // Increment campaign clicked_count
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('clicked_count')
        .eq('id', params.id)
        .single();

      if (campaign) {
        await supabase
          .from('campaigns')
          .update({
            clicked_count: (campaign.clicked_count || 0) + 1,
          })
          .eq('id', params.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Click Tracking] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track click' },
      { status: 500 }
    );
  }
}

export const POST = withPublicCors(handleTrackClick);