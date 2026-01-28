// app/api/events/track/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { withPublicCors } from '@/lib/auth-middleware';
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

async function handleTrackEvent(request: NextRequest) {
  try {
    console.log('[Event Track] 🎯 Request received');
    
    const body = await request.json();
    console.log('[Event Track] 📦 Request body:', JSON.stringify(body, null, 2));
    
    const { 
      subscriber_id, 
      event_name,
      event_data,
      properties = {},
      website_id,
      // New fields for advanced targeting
      current_url,
      user_attributes,
      tags
    } = body;

    console.log(`[Event Track] 🎯 Event: ${event_name}`);
    console.log(`[Event Track] 👤 Subscriber: ${subscriber_id}`);
    console.log(`[Event Track] 🌐 Website: ${website_id}`);

    // Validate required fields
    if (!subscriber_id || !event_name) {
      console.error('[Event Track]  Missing required fields');
      return NextResponse.json(
        {
          success: false,
          error: 'subscriber_id and event_name are required'
        },
        { status: 400 }
      );
    }

    // Get subscriber and website_id if not provided
    let finalWebsiteId = website_id;
    let subscriber = null;
    
    const { data: subData, error: subError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', subscriber_id)
      .single();
    
    if (subError) {
      console.error('[Event Track]  Subscriber not found:', subError);
      return NextResponse.json(
        { success: false, error: 'Subscriber not found' },
        { status: 404 }
      );
    }
    
    subscriber = subData;
    finalWebsiteId = finalWebsiteId || subscriber.website_id;

    if (!finalWebsiteId) {
      console.error('[Event Track]  Could not determine website_id');
      return NextResponse.json(
        { success: false, error: 'website_id is required' },
        { status: 400 }
      );
    }

    // Merge properties and event_data
    const mergedProperties = {
      ...properties,
      ...event_data,
      current_url: current_url || properties.current_url || event_data?.current_url,
    };

    console.log('[Event Track] 📋 Merged properties:', mergedProperties);

    //  STEP 1: UPDATE SUBSCRIBER WITH URL-BASED SEGMENTATION
    await updateSubscriberSegmentation(
      subscriber_id,
      mergedProperties.current_url,
      user_attributes,
      tags
    );

    // Handle notification_clicked event for analytics
    if (event_name === 'notification_clicked') {
      const campaignId = mergedProperties?.campaign_id;
      
      if (campaignId) {
        console.log(`[Event Track] 🎯 Processing notification click for campaign: ${campaignId}`);
        
        try {
          const { data: logs } = await supabase
            .from('notification_logs')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('subscriber_id', subscriber_id)
            .is('clicked_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (logs && logs.length > 0) {
            await supabase
              .from('notification_logs')
              .update({ clicked_at: new Date().toISOString() })
              .eq('id', logs[0].id);
            
          }

          const { data: campaign } = await supabase
            .from('campaigns')
            .select('clicked_count')
            .eq('id', campaignId)
            .single();

          if (campaign) {
            const newClickedCount = (campaign.clicked_count || 0) + 1;
            await supabase
              .from('campaigns')
              .update({ clicked_count: newClickedCount })
              .eq('id', campaignId);
            
          }
        } catch (error: any) {
          console.error('[Event Track]  Error in click tracking:', error);
        }
      }
    }

    //STEP 2: UPDATE LAST ACTIVE TIME
    await supabase
      .from('subscribers')
      .update({ 
        last_active_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      })
      .eq('id', subscriber_id);

    // Insert subscriber event
    console.log(`[Event Track] 💾 Inserting subscriber event...`);
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
      console.error('[Event Track]  Error inserting event:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to track event',
          details: insertError.message
        },
        { status: 500 }
      );
    }


   
    
    try {
      await trackEventWithJourneys({
        subscriber_id,
        website_id: finalWebsiteId,
        event_name,
        event_data: mergedProperties,
        timestamp: new Date().toISOString(),
      });
    } catch (journeyError: any) {
     
    }

    return NextResponse.json({
      success: true,
      event_id: event.id,
      message: 'Event tracked successfully',
      debug: {
        event_name,
        subscriber_id,
        website_id: finalWebsiteId,
        properties: mergedProperties,
        journey_handler_called: true
      }
    });

  } catch (error: any) {
    console.error('[Event Track]  Fatal error:', error);
    console.error('[Event Track] Error stack:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}

async function updateSubscriberSegmentation(
  subscriberId: string,
  currentUrl?: string,
  userAttributes?: Record<string, any>,
  newTags?: string[]
) {
  try {
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('tags, custom_attributes, segment')
      .eq('id', subscriberId)
      .single();

    if (!subscriber) return;

    const updates: any = {};

    if (currentUrl) {
      console.log(`[Segmentation] Processing URL: ${currentUrl}`);
      
      const existingTags = (subscriber.tags as string[]) || [];
      const urlTags = extractTagsFromUrl(currentUrl);
      
      if (urlTags.length > 0) {
        const mergedTags = Array.from(new Set([...existingTags, ...urlTags]));
        updates.tags = mergedTags;
        console.log(`[Segmentation] Added URL tags:`, urlTags);
      }

      // Auto-set segment based on URL pattern
      const segment = detectSegmentFromUrl(currentUrl);
      if (segment && segment !== subscriber.segment) {
        updates.segment = segment;
        console.log(`[Segmentation] Set segment to: ${segment}`);
      }
    }

    if (userAttributes && Object.keys(userAttributes).length > 0) {
      const existingAttrs = (subscriber.custom_attributes as Record<string, any>) || {};
      updates.custom_attributes = {
        ...existingAttrs,
        ...userAttributes,
        last_updated: new Date().toISOString()
      };
      console.log(`[Segmentation] Updated attributes:`, userAttributes);
    }

    if (newTags && newTags.length > 0) {
      const existingTags = (subscriber.tags as string[]) || [];
      const mergedTags = Array.from(new Set([...existingTags, ...newTags]));
      updates.tags = mergedTags;
      console.log(`[Segmentation] Added manual tags:`, newTags);
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('subscribers')
        .update(updates)
        .eq('id', subscriberId);
      
    }

  } catch (error) {
    console.error('[Segmentation] Error updating subscriber:', error);
  }
}

function extractTagsFromUrl(url: string): string[] {
  const tags: string[] = [];
  const path = url.toLowerCase();

  // Common URL patterns → tags
  const patterns = [
    { pattern: /\/practitioner/i, tag: 'practitioner' },
    { pattern: /\/buyer/i, tag: 'buyer' },
    { pattern: /\/seller/i, tag: 'seller' },
    { pattern: /\/promoter/i, tag: 'promoter' },
    { pattern: /\/vendor/i, tag: 'vendor' },
    { pattern: /\/customer/i, tag: 'customer' },
    { pattern: /\/pricing/i, tag: 'interested_in_pricing' },
    { pattern: /\/signup/i, tag: 'signup_started' },
    { pattern: /\/checkout/i, tag: 'checkout_started' },
    { pattern: /\/cart/i, tag: 'has_cart' },
    { pattern: /\/dashboard/i, tag: 'active_user' },
    { pattern: /\/premium|\/pro/i, tag: 'premium_interested' },
  ];

  for (const { pattern, tag } of patterns) {
    if (pattern.test(path)) {
      tags.push(tag);
    }
  }

  return tags;
}

function detectSegmentFromUrl(url: string): string | null {
  const path = url.toLowerCase();

  if (/\/practitioner/i.test(path)) return 'practitioners';
  if (/\/buyer/i.test(path)) return 'buyers';
  if (/\/seller/i.test(path)) return 'sellers';
  if (/\/promoter/i.test(path)) return 'promoters';
  if (/\/vendor/i.test(path)) return 'vendors';
  if (/\/business|\/b2b/i.test(path)) return 'business';
  if (/\/consumer|\/b2c/i.test(path)) return 'consumer';

  return null;
}

// Export with CORS
export const POST = withPublicCors(handleTrackEvent);

// Handle OPTIONS for preflight
export const OPTIONS = async (request: NextRequest) => {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};