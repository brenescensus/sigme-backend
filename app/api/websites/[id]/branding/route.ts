import { NextRequest, NextResponse } from 'next/server';
import {
  withAuth,
  getAuthenticatedClient,
  verifyWebsiteOwnership,
} from '@/lib/auth-middleware';

interface NotificationBranding {
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

const DEFAULT_BRANDING: NotificationBranding = {
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
 * GET /api/websites/[websiteId]/branding
 */
export const GET = withAuth(
  async (req: NextRequest, user, { params }: { params: { websiteId: string } }) => {
    try {
      const supabase = await getAuthenticatedClient(req);

      // Verify ownership
      const ownership = await verifyWebsiteOwnership(
        req,
        params.websiteId,
        user.id
      );

      if (!ownership.success || !ownership.website) {
        return NextResponse.json(
          { success: false, error: ownership.error },
          { status: 403 }
        );
      }

      const branding =
        ownership.website.notification_branding || DEFAULT_BRANDING;

      return NextResponse.json({
        success: true,
        branding,
      });
    } catch (error: any) {
      console.error('[Branding GET] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

/**
 * PUT /api/websites/[websiteId]/branding
 */
export const PUT = withAuth(
  async (req: NextRequest, user, { params }: { params: { websiteId: string } }) => {
    try {
      const supabase = await getAuthenticatedClient(req);

      // Verify ownership
      const ownership = await verifyWebsiteOwnership(
        req,
        params.websiteId,
        user.id
      );

      if (!ownership.success || !ownership.website) {
        return NextResponse.json(
          { success: false, error: ownership.error },
          { status: 403 }
        );
      }

      const body = await req.json();
      const branding: Partial<NotificationBranding> = body.branding;

      if (!branding) {
        return NextResponse.json(
          { success: false, error: 'Branding data is required' },
          { status: 400 }
        );
      }

      // Validate colors
      if (
        branding.primary_color &&
        !isValidHexColor(branding.primary_color)
      ) {
        return NextResponse.json(
          { success: false, error: 'Invalid primary color format' },
          { status: 400 }
        );
      }

      if (
        branding.secondary_color &&
        !isValidHexColor(branding.secondary_color)
      ) {
        return NextResponse.json(
          { success: false, error: 'Invalid secondary color format' },
          { status: 400 }
        );
      }

      // Merge with existing branding
      const updatedBranding = {
        ...(ownership.website.notification_branding || DEFAULT_BRANDING),
        ...branding,
      };

      const { error: updateError } = await supabase
        .from('websites')
        .update({
          notification_branding: updatedBranding,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.websiteId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[Branding PUT] Update error:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update branding' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        branding: updatedBranding,
      });
    } catch (error: any) {
      console.error('[Branding PUT] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
}
