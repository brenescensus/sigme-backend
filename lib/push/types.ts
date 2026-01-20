// ============================================
// lib/push/types.ts
// Type definitions for push notification system
// ============================================

/**
 * Notification action button
 */
export interface NotificationAction {
  label: string;
  url: string;
  action?: string;
  icon?: string;
}

/**
 * Core notification payload
 */
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string; // Must be string | undefined (not null)
  url?: string;
  tag?: string;
  actions?: NotificationAction[];
  data?: Record<string, any>;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
}

/**
 * Subscriber record from database
 */
export interface Subscriber {
  id: string;
  website_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  browser?: string;
  device_type?: string;
  country?: string;
  status: 'active' | 'inactive' | 'bounced';
  subscribed_at: string;
  last_seen_at?: string;
  user_agent?: string;
}

/**
 * Result from sending batch notifications
 */
export interface BatchSendResult {
  sent: number;
  failed: number;
  total: number;
  errors: Array<{
    subscriberId: string;
    error: string;
    platform: string;
  }>;
  expiredSubscriptions: string[];
  vapidMismatches?: string[]; // Optional field
}

/**
 * Individual send result
 */
export interface SendResult {
  success: boolean;
  subscriberId: string;
  error?: string;
  statusCode?: number;
  expired?: boolean;
  vapidMismatch?: boolean;
}

/**
 * Campaign from database
 */
export interface Campaign {
  id: string;
  website_id: string;
  name: string;
  title: string;
  body: string;
  icon_url?: string | null;
  image_url?: string | null;
  click_url?: string | null;
  actions?: NotificationAction[] | null;
  segment?: string | null;
  target_browsers?: string[] | null;
  target_devices?: string[] | null;
  target_countries?: string[] | null;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'recurring';
  scheduled_at?: string | null;
  is_recurring?: boolean;
  recurrence_pattern?: string | null;
  recurrence_config?: any | null;
  next_send_at?: string | null;
  sent_count: number;
  delivered_count: number;
  clicked_count: number;
  failed_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Analytics data for a campaign
 */
export interface CampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  sent: number;
  delivered: number;
  clicked: number;
  failed: number;
  delivery_rate: number;
  click_through_rate: number;
}

/**
 * Notification log entry
 */
export interface NotificationLog {
  id: string;
  campaign_id?: string;
  subscriber_id: string;
  status: 'sent' | 'delivered' | 'clicked' | 'failed';
  error_message?: string;
  created_at: string;
}

/**
 * Helper to convert nullable image to undefined
 */
export function normalizeNotificationPayload(
  payload: Partial<NotificationPayload> & { image?: string | null }
): NotificationPayload {
  return {
    title: payload.title || 'Notification',
    body: payload.body || '',
    icon: payload.icon,
    badge: payload.badge,
    image: payload.image || undefined, // Convert null to undefined
    url: payload.url,
    tag: payload.tag,
    actions: payload.actions,
    data: payload.data,
    requireInteraction: payload.requireInteraction,
    silent: payload.silent,
    timestamp: payload.timestamp,
  };
}