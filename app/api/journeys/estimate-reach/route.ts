// app/api/journeys/estimate-reach/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { verifyToken } from '@/lib/auth-middleware';

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

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const user = await verifyToken(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { website_id, entry_trigger } = body;

        if (!website_id || !entry_trigger) {
            return NextResponse.json(
                { success: false, error: 'website_id and entry_trigger are required' },
                { status: 400 }
            );
        }

        console.log('[Journey Reach] Estimating reach for website:', website_id);
        console.log('[Journey Reach] Entry trigger:', entry_trigger);

        // Verify user owns this website
        const { data: website, error: websiteError } = await supabase
            .from('websites')
            .select('id, user_id')
            .eq('id', website_id)
            .single();

        if (websiteError || !website) {
            return NextResponse.json(
                { success: false, error: 'Website not found' },
                { status: 404 }
            );
        }

        if (website.user_id !== user.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Get all active subscribers for this website
        const { data: subscribers, error: subscribersError } = await supabase
            .from('subscribers')
            .select('id')
            .eq('website_id', website_id)
            .eq('status', 'active');

        if (subscribersError) {
            console.error('[Journey Reach] Error fetching subscribers:', subscribersError);
            return NextResponse.json(
                { success: false, error: subscribersError.message },
                { status: 500 }
            );
        }

        const totalActiveSubscribers = subscribers?.length || 0;
        let estimatedReach = totalActiveSubscribers;
        let breakdown: any = {
            total_active_subscribers: totalActiveSubscribers,
            matching_subscribers: 0,
            trigger_type: entry_trigger.type,
        };

        // Calculate reach based on trigger type
        if (entry_trigger.type === 'event') {
            // Event-based trigger
            const eventName = entry_trigger.event_name || entry_trigger.event?.name;

            if (eventName) {
                const subscriberIds = subscribers?.map(s => s.id) || [];

                if (subscriberIds.length > 0) {
                    const { data: events, error: eventsError } = await supabase
                        .from('subscriber_events')
                        .select('subscriber_id')
                        .eq('event_name', eventName)
                        .in('subscriber_id', subscriberIds);

                    if (!eventsError && events) {
                        // Get unique subscribers who triggered this event
                        const uniqueSubscribers = new Set(events.map(e => e.subscriber_id));
                        estimatedReach = uniqueSubscribers.size;
                        breakdown.matching_subscribers = estimatedReach;
                        breakdown.event_name = eventName;
                    }
                } else {
                    estimatedReach = 0;
                }
            }
        } else if (entry_trigger.type === 'segment') {
            // Segment-based trigger
            const segment = entry_trigger.segment;

            if (segment) {
                const { count, error: countError } = await supabase
                    .from('subscribers')
                    .select('id', { count: 'exact', head: true })
                    .eq('website_id', website_id)
                    .eq('status', 'active')
                    .eq('segment', segment);

                if (!countError) {
                    estimatedReach = count || 0;
                    breakdown.matching_subscribers = estimatedReach;
                    breakdown.segment = segment;
                }
            }
        } else if (entry_trigger.type === 'attribute') {
            // Custom attribute-based trigger
            const { attribute, operator, value } = entry_trigger;

            if (attribute && operator && value !== undefined) {
                // For custom attributes, we need to query the JSONB field
                // This is a simplified version - you may need more complex filtering
                const subscriberIds = subscribers?.map(s => s.id) || [];

                if (subscriberIds.length > 0) {
                    const { data: matchingSubscribers, error: attrError } = await supabase
                        .from('subscribers')
                        .select('id, custom_attributes')
                        .in('id', subscriberIds);

                    if (!attrError && matchingSubscribers) {
                        // Filter in memory based on custom attributes
                        const matches = matchingSubscribers.filter(sub => {
                            //   const attrValue = sub.custom_attributes?.[attribute];
                            const customAttrs = sub.custom_attributes as Record<string, any> | null;
                            if (!customAttrs || typeof customAttrs !== 'object') {
                                return false;
                            }
                            const attrValue = customAttrs[attribute];
                            switch (operator) {
                                case 'equals':
                                    return attrValue === value;
                                case 'not_equals':
                                    return attrValue !== value;
                                case 'contains':
                                    return typeof attrValue === 'string' && attrValue.includes(value);
                                case 'greater_than':
                                    return typeof attrValue === 'number' && attrValue > value;
                                case 'less_than':
                                    return typeof attrValue === 'number' && attrValue < value;
                                default:
                                    return false;
                            }
                        });

                        estimatedReach = matches.length;
                        breakdown.matching_subscribers = estimatedReach;
                        breakdown.attribute = attribute;
                        breakdown.operator = operator;
                    }
                } else {
                    estimatedReach = 0;
                }
            }
        } else if (entry_trigger.type === 'immediate' || entry_trigger.type === 'all') {
            // All subscribers qualify
            estimatedReach = totalActiveSubscribers;
            breakdown.matching_subscribers = estimatedReach;
        }

        // Calculate percentage
        const percentage = totalActiveSubscribers > 0
            ? Math.round((estimatedReach / totalActiveSubscribers) * 100)
            : 0;

        console.log('[Journey Reach]  Estimated reach:', estimatedReach);
        console.log('[Journey Reach]  Percentage:', percentage + '%');

        return NextResponse.json({
            success: true,
            estimated_reach: estimatedReach,
            total_active_subscribers: totalActiveSubscribers,
            percentage,
            breakdown,
        });

    } catch (error: any) {
        console.error('[Journey Reach] Fatal error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}