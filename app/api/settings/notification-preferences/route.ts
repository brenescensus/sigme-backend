// ============================================
// app/api/settings/notification-preferences/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

export const GET = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const supabase = await getAuthenticatedClient(req);

      const { data: prefs, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // If no preferences exist, create default ones
      if (!prefs) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('user_notification_preferences')
          .insert({
            user_id: user.id,
            weekly_report: true,
            push_failed: true,
            campaign_complete: false,
            new_subscriber: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return NextResponse.json({
          success: true,
          preferences: newPrefs,
        });
      }

      return NextResponse.json({
        success: true,
        preferences: prefs,
      });
    } catch (error: any) {
      console.error('[Notification Preferences] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences', details: error.message },
        { status: 500 }
      );
    }
  }
);

export const PATCH = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const body = await req.json();
      const supabase = await getAuthenticatedClient(req);

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .update(body)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        preferences: data,
      });
    } catch (error: any) {
      console.error('[Update Notification Preferences] Error:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences', details: error.message },
        { status: 500 }
      );
    }
  }
);
