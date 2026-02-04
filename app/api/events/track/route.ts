// app/api/events/track/route.ts 
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { trackEventWithJourneys } from '@/lib/journeys/entry-handler';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

//  FIXED: Public endpoint - allow ANY origin but WITHOUT credentials
function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin');
  
  // For public tracking endpoints, we MUST allow any origin
  // But we CANNOT use credentials with wildcard or arbitrary origins
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    // ❌ NO credentials - this is a public endpoint
    'Access-Control-Max-Age': '86400',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      subscriber_id,
      event_name,
      event_data,
      properties = {},
      website_id,
      current_url,
    } = body;

    console.log(`[Event Track]  ${event_name} from subscriber ${subscriber_id?.substring(0, 8)}...`);

    if (!subscriber_id || !event_name) {
      return NextResponse.json(
        { success: false, error: 'subscriber_id and event_name are required' },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', subscriber_id)
      .single();

    if (subError || !subscriber) {
      return NextResponse.json(
        { success: false, error: 'Subscriber not found' },
        { status: 404, headers: getCorsHeaders(request) }
      );
    }

    const finalWebsiteId = website_id || subscriber.website_id;

    if (!finalWebsiteId) {
      return NextResponse.json(
        { success: false, error: 'website_id is required' },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    const mergedProperties = {
      ...properties,
      ...event_data,
      current_url: current_url || properties.current_url || event_data?.current_url,
    };

    // Update subscriber activity
    await supabase
      .from('subscribers')
      .update({
        last_active_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      })
      .eq('id', subscriber_id);

    // Handle notification clicks (IDEMPOTENT)
    if (event_name === 'notification_clicked') {
      const campaignId = mergedProperties?.campaign_id;
      const journeyId = mergedProperties?.journey_id;

      console.log('[Event Track]   Notification click detected');
      console.log('[Event Track]   - Campaign ID:', campaignId);
      console.log('[Event Track]   - Journey ID:', journeyId);

      if (campaignId || journeyId) {
        const query = supabase
          .from('notification_logs')
          .select('id, clicked_at')
          .eq('subscriber_id', subscriber_id)
          .is('clicked_at', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (campaignId) {
          query.eq('campaign_id', campaignId);
        } else if (journeyId) {
          query.eq('journey_id', journeyId);
        }

        const { data: logs } = await query;

        if (logs && logs.length > 0) {
          console.log('[Event Track]  Marking notification as clicked:', logs[0].id);
          
          await supabase
            .from('notification_logs')
            .update({ clicked_at: new Date().toISOString() })
            .eq('id', logs[0].id);

          if (campaignId) {
            const { data: campaign } = await supabase
              .from('campaigns')
              .select('clicked_count')
              .eq('id', campaignId)
              .single();

            if (campaign) {
              const newCount = (campaign.clicked_count || 0) + 1;
              
              await supabase
                .from('campaigns')
                .update({ clicked_count: newCount })
                .eq('id', campaignId);

              console.log('[Event Track] Campaign clicks:', newCount);
            }
          }
        } else {
          // console.log('[Event Track]  Notification already clicked or not found');
        }
      }
    }

    // Log page_abandonment for debugging
    if (event_name === 'page_abandoned') {
      console.log('[Event Track]  Page abandonment event received');
      // console.log('[Event Track]   - Time on page:', mergedProperties.time_on_page);
      // console.log('[Event Track]   - Scroll depth:', mergedProperties.scroll_depth);
    }

    // Insert event
    const { data: event, error: insertError } = await supabase
      .from('subscriber_events')
      .insert({
        subscriber_id,
        website_id: finalWebsiteId,
        event_name,
        properties: mergedProperties
      })
      .select()
      .single();

    if (insertError) {
      // console.error('[Event Track]  Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to track event' },
        { status: 500, headers: getCorsHeaders(request) }
      );
    }

    // console.log(`[Event Track]  Event tracked: ${event.id}`);

    // Trigger journeys
    try {
      await trackEventWithJourneys({
        subscriber_id,
        website_id: finalWebsiteId,
        event_name,
        event_data: mergedProperties,
        timestamp: new Date().toISOString(),
      });
    } catch (journeyError: any) {
      console.error('[Event Track] Journey error:');
    }

    return NextResponse.json(
      {
        success: true,
        event_id: event.id,
        message: 'Event tracked successfully',
      },
      { headers: getCorsHeaders(request) }
    );

  } catch (error: any) {
    console.error('[Event Track] Fatal error:');
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriberId = searchParams.get('subscriber_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!subscriberId) {
      return NextResponse.json(
        { success: false, error: 'subscriber_id is required' },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    const { data: events, error } = await supabase
      .from('subscriber_events')
      .select('*')
      .eq('subscriber_id', subscriberId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: getCorsHeaders(request) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        events: events || [],
        count: events?.length || 0,
      },
      { headers: getCorsHeaders(request) }
    );

  } catch (error: any) {
    console.error('[Event Track] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}