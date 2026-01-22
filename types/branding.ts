// types/branding.ts
// Type definitions for notification branding

export interface NotificationBranding {
  primary_color: string;
  secondary_color: string;
  logo_url?: string | null;
  font_family: string;
  button_style: 'rounded' | 'square' | 'pill';
  notification_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  animation_style: 'slide' | 'fade' | 'bounce';
  show_logo: boolean;
  show_branding: boolean;
}

export const DEFAULT_BRANDING: NotificationBranding = {
  primary_color: '#667eea',
  secondary_color: '#764ba2',
  logo_url: null,
  font_family: 'Inter',
  button_style: 'rounded',
  notification_position: 'top-right',
  animation_style: 'slide',
  show_logo: true,
  show_branding: true,
};

/**
 * Safely parse and validate notification branding from JSON
 */
export function parseBranding(json: any): NotificationBranding {
  if (!json || typeof json !== 'object') {
    return DEFAULT_BRANDING;
  }

  return {
    primary_color: json.primary_color || DEFAULT_BRANDING.primary_color,
    secondary_color: json.secondary_color || DEFAULT_BRANDING.secondary_color,
    logo_url: json.logo_url ?? DEFAULT_BRANDING.logo_url,
    font_family: json.font_family || DEFAULT_BRANDING.font_family,
    button_style: ['rounded', 'square', 'pill'].includes(json.button_style)
      ? json.button_style
      : DEFAULT_BRANDING.button_style,
    notification_position: ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(json.notification_position)
      ? json.notification_position
      : DEFAULT_BRANDING.notification_position,
    animation_style: ['slide', 'fade', 'bounce'].includes(json.animation_style)
      ? json.animation_style
      : DEFAULT_BRANDING.animation_style,
    show_logo: typeof json.show_logo === 'boolean' ? json.show_logo : DEFAULT_BRANDING.show_logo,
    show_branding: typeof json.show_branding === 'boolean' ? json.show_branding : DEFAULT_BRANDING.show_branding,
  };
}