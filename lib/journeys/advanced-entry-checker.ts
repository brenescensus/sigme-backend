// backend/lib/journeys/advanced-entry-checker.ts
// Enhanced journey entry logic for advanced triggers

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log('[AdvancedTrigger] Module loaded');

interface JourneyTrigger {
  type: string;
  event_name?: string;
  [key: string]: any;
}

interface EventData {
  event_name: string;
  properties: any;
  subscriber_id: string;
  website_id: string;
}

/**
 * Check if an event should trigger journey enrollment
 */
export async function checkAdvancedTriggers(
  eventData: EventData,
  subscriber: any
): Promise<string[]> {
  const matchingJourneys: string[] = [];

  // Get all active journeys for this website
  const { data: journeys } = await supabase
    .from('journeys')
    .select('id, name, entry_trigger, re_entry_settings')
    .eq('website_id', eventData.website_id)
    .eq('status', 'active');

  if (!journeys || journeys.length === 0) {
    return [];
  }

  for (const journey of journeys) {
    const trigger = journey.entry_trigger;

    // Check if this event matches the journey trigger
    const matches = await checkTriggerMatch(
      trigger,
      eventData,
      subscriber
    );

    if (matches) {
      // Check re-entry rules
      const canEnter = await checkReEntry(
        journey.id,
        subscriber.id,
        journey.re_entry_settings
      );

      if (canEnter) {
        matchingJourneys.push(journey.id);
        console.log(`[AdvancedTrigger]  Matched journey: ${journey.name}`);
      } else {
        console.log(`[AdvancedTrigger]  Re-entry blocked for: ${journey.name}`);
      }
    }
  }

  return matchingJourneys;
}

/**
 * Check if event matches journey trigger
 */
async function checkTriggerMatch(
  trigger: JourneyTrigger,
  eventData: EventData,
  subscriber: any
): Promise<boolean> {
  const { type } = trigger;
  const { event_name, properties } = eventData;

  // ==========================================
  // 1. BASIC EVENT TRIGGER
  // ==========================================
  if (type === 'event') {
    return event_name === trigger.event_name;
  }

  // ==========================================
  // 2. PAGE LANDING
  // ==========================================
  if (type === 'page_landing') {
    if (event_name !== 'page_landed' && event_name !== 'page_view') {
      return false;
    }

    const url = properties.path || properties.url || '';
    const pattern = trigger.url_pattern || '';
    const matchType = trigger.match_type || 'exact';
    const excludedUrls = trigger.excluded_urls || [];

    // Check exclusions first
    if (excludedUrls.some((excluded: string) => matchUrl(url, excluded, 'contains'))) {
      return false;
    }

    // Check if URL matches pattern
    return matchUrl(url, pattern, matchType);
  }

  // ==========================================
  // 3. SCROLL DEPTH
  // ==========================================
  if (type === 'scroll_depth') {
    if (event_name !== 'scroll_depth') {
      return false;
    }

    const percentage = properties.percentage || 0;
    const targetPercentage = trigger.percentage || 50;
    const url = properties.path || '';
    const pagePattern = trigger.page_pattern || '';
    const excludedUrls = trigger.excluded_urls || [];

    // Check scroll threshold
    if (percentage < targetPercentage) {
      return false;
    }

    // Check page pattern if specified
    if (pagePattern && !matchUrl(url, pagePattern, 'contains')) {
      return false;
    }

    // Check exclusions
    if (excludedUrls.some((excluded: string) => matchUrl(url, excluded, 'contains'))) {
      return false;
    }

    return true;
  }

  // ==========================================
  // 4. PAGE ABANDONMENT
  // ==========================================
  if (type === 'page_abandonment') {
    if (event_name !== 'page_abandoned') {
      return false;
    }

    const timeOnPage = properties.time_on_page_seconds || 0;
    const minTimeUnit = trigger.min_time_unit || 'seconds';
    const minTimeValue = trigger.min_time_value || 30;
    
    // Convert to seconds
    const minTimeSeconds = minTimeUnit === 'minutes' 
      ? minTimeValue * 60 
      : minTimeValue;

    // Check minimum time threshold
    if (timeOnPage < minTimeSeconds) {
      return false;
    }

    // Check page pattern
    const url = properties.path || '';
    const pagePattern = trigger.page_pattern || '';
    
    if (pagePattern && !matchUrl(url, pagePattern, 'contains')) {
      return false;
    }

    return true;
  }

  // ==========================================
  // 5. TIME ON PAGE
  // ==========================================
  if (type === 'time_on_page') {
    if (event_name !== 'time_on_page') {
      return false;
    }

    const seconds = properties.seconds || 0;
    const thresholdUnit = trigger.threshold_unit || 'seconds';
    const thresholdValue = trigger.threshold_value || 30;
    
    // Convert to seconds
    const thresholdSeconds = thresholdUnit === 'minutes' 
      ? thresholdValue * 60 
      : thresholdValue;

    // Check if time threshold met
    if (seconds < thresholdSeconds) {
      return false;
    }

    // Check page pattern
    const url = properties.path || '';
    const pagePattern = trigger.page_pattern || '';
    
    if (pagePattern && !matchUrl(url, pagePattern, 'contains')) {
      return false;
    }

    return true;
  }

  // ==========================================
  // 6. LINK INTERACTION
  // ==========================================
  if (type === 'link_interaction') {
    if (event_name !== 'link_clicked') {
      return false;
    }

    const clickedUrl = properties.url || '';
    const linkPattern = trigger.link_pattern || '';
    const externalOnly = trigger.external_only || false;

    if (externalOnly && !properties.is_external) {
      return false;
    }

    return matchUrl(clickedUrl, linkPattern, 'contains');
  }

  // ==========================================
  // 7. CART ABANDONED
  // ==========================================
  if (type === 'cart_abandoned') {
    if (event_name !== 'cart_abandoned') {
      return false;
    }

    const cartValue = properties.total_value || 0;
    const minValue = trigger.min_value || 0;

    return cartValue >= minValue;
  }

  // ==========================================
  // 8. PRODUCT PURCHASED
  // ==========================================
  if (type === 'product_purchased') {
    if (event_name !== 'product_purchased') {
      return false;
    }

    const category = trigger.category || '';
    const minValue = trigger.min_value || 0;
    const purchaseValue = properties.total_value || 0;

    // Check minimum value
    if (purchaseValue < minValue) {
      return false;
    }

    // Check category if specified
    if (category) {
      const items = properties.items || [];
      const hasMatchingCategory = items.some((item: any) => 
        item.category?.toLowerCase() === category.toLowerCase()
      );
      if (!hasMatchingCategory) {
        return false;
      }
    }

    return true;
  }

  // ==========================================
  // 9. DEVICE TYPE FILTER
  // ==========================================
  if (type === 'device_filter') {
    const allowedDevices = trigger.devices || [];
    const subscriberDevice = subscriber.device_type?.toLowerCase() || '';

    return allowedDevices.includes(subscriberDevice);
  }

  // ==========================================
  // 10. GEOGRAPHY FILTER
  // ==========================================
  if (type === 'geography_filter') {
    const allowedCountries = trigger.countries || [];
    const allowedCities = trigger.cities || [];
    
    const subscriberCountry = subscriber.country || '';
    const subscriberCity = subscriber.city || '';

    // Check country
    if (allowedCountries.length > 0 && !allowedCountries.includes(subscriberCountry)) {
      return false;
    }

    // Check city (if specified)
    if (allowedCities.length > 0 && !allowedCities.includes(subscriberCity)) {
      return false;
    }

    return true;
  }

  return false;
}

/**
 * Check re-entry rules
 */
async function checkReEntry(
  journeyId: string,
  subscriberId: string,
  reEntrySettings: any
): Promise<boolean> {
  if (!reEntrySettings || !reEntrySettings.allow_re_entry) {
    // Check if already in journey
    const { data: existing } = await supabase
      .from('user_journey_states')
      .select('id')
      .eq('journey_id', journeyId)
      .eq('subscriber_id', subscriberId)
      .single();

    return !existing;
  }

  // Check cooldown
  if (reEntrySettings.cooldown_days > 0) {
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - reEntrySettings.cooldown_days);

    const { data: recentEntry } = await supabase
      .from('user_journey_states')
      .select('id')
      .eq('journey_id', journeyId)
      .eq('subscriber_id', subscriberId)
      .gte('entered_at', cooldownDate.toISOString())
      .single();

    if (recentEntry) {
      return false;
    }
  }

  // Check max entries
  if (reEntrySettings.max_entries > 0) {
    const { data: entries, count } = await supabase
      .from('user_journey_states')
      .select('id', { count: 'exact' })
      .eq('journey_id', journeyId)
      .eq('subscriber_id', subscriberId);

    if (count && count >= reEntrySettings.max_entries) {
      return false;
    }
  }

  return true;
}

/**
 * URL matching utility
 */
function matchUrl(url: string, pattern: string, matchType: string): boolean {
  if (!pattern) return true;

  switch (matchType) {
    case 'exact':
      return url === pattern;
    
    case 'contains':
      return url.includes(pattern.replace('*', ''));
    
    case 'starts_with':
      return url.startsWith(pattern);
    
    case 'regex':
      try {
        return new RegExp(pattern).test(url);
      } catch {
        return false;
      }
    
    default:
      return url.includes(pattern);
  }
}