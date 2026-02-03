// -- app/api/admin/faqs/[id]/toggle/route.ts
// -- Toggle FAQ active status

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';

interface RouteParams {
  params: {
    id: string;
  };
}

export const PATCH = withAdmin(async (req: NextRequest, user, { params }: RouteParams) => {
  try {
    const supabase = getAdminClient();

    // Get current status
    const { data: current, error: fetchError } = await supabase
      .from('faqs')
      .select('is_active')
      .eq('id', params.id)
      .single();

    if (fetchError) throw fetchError;

    if (!current) {
      return NextResponse.json(
        { error: 'FAQ not found' },
        { status: 404 }
      );
    }

    // Toggle status
    const { data, error } = await supabase
      .from('faqs')
      .update({ is_active: !current.is_active })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await logAdminActivity(
      user.id,
      'toggle_faq',
      'faq',
      params.id,
      { is_active: !current.is_active },
      req.headers.get('x-forwarded-for') || undefined
    );

    return NextResponse.json({
      success: true,
      faq: data,
    });
  } catch (error: any) {
    console.error('[FAQs] Error toggling:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});