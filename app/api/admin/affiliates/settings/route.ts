// app/api/admin/affiliates/settings/route.ts
// Admin: Update affiliate program settings

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, logAdminActivity } from '@/lib/admin-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET = withAdmin(async (req: NextRequest, adminUser) => {
  try {
    const { data: settings, error } = await supabase
      .from('affiliate_settings')
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error: any) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});

export const PATCH = withAdmin(async (req: NextRequest, adminUser) => {
  try {
    const adminId = adminUser.id;
    const body = await req.json();
    const {
      program_enabled,
      auto_approve,
      min_payout_amount,
      default_commission_rate,
      recurring_commission,
      cookie_duration,
      terms_and_conditions,
      welcome_message,
      notify_on_signup,
      notify_on_conversion,
      admin_notification_email
    } = body;

    // Get current settings to find ID
    const { data: currentSettings } = await supabase
      .from('affiliate_settings')
      .select('id')
      .single();

    if (!currentSettings) {
      return NextResponse.json(
        { success: false, error: 'Settings not found' },
        { status: 404 }
      );
    }

    const { data: settings, error } = await supabase
      .from('affiliate_settings')
      .update({
        program_enabled,
        auto_approve,
        min_payout_amount,
        default_commission_rate,
        recurring_commission,
        cookie_duration,
        terms_and_conditions,
        welcome_message,
        notify_on_signup,
        notify_on_conversion,
        admin_notification_email,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentSettings.id)
      .select()
      .single();

    if (error) throw error;

    // Log admin activity
    await logAdminActivity(
      adminId,
      'affiliate_settings_updated',
      'affiliate_settings',
      currentSettings.id,
      body
    );

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });

  } catch (error: any) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});