// ============================================================================
// -- app/api/admin/faqs/[id]/route.ts
// -- Individual FAQ management endpoints
// -- ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/admin/faqs/:id
export const GET = withAdmin(async (req: NextRequest, user, { params }: RouteParams) => {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: 'FAQ not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      faq: data,
    });
  } catch (error: any) {
    console.error('[FAQs] Error fetching:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});

// PUT /api/admin/faqs/:id
export const PUT = withAdmin(async (req: NextRequest, user, { params }: RouteParams) => {
  try {
    const body = await req.json();

    // Validate category if provided
    if (body.category && !['integration', 'features', 'targeting', 'scaling'].includes(body.category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('faqs')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: 'FAQ not found' },
        { status: 404 }
      );
    }

    // Log activity
    await logAdminActivity(
      user.id,
      'update_faq',
      'faq',
      params.id,
      body,
      req.headers.get('x-forwarded-for') || undefined
    );

    return NextResponse.json({
      success: true,
      faq: data,
    });
  } catch (error: any) {
    console.error('[FAQs] Error updating:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});

// DELETE /api/admin/faqs/:id
export const DELETE = withAdmin(async (req: NextRequest, user, { params }: RouteParams) => {
  try {
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('faqs')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    // Log activity
    await logAdminActivity(
      user.id,
      'delete_faq',
      'faq',
      params.id,
      null,
      req.headers.get('x-forwarded-for') || undefined
    );

    return NextResponse.json({
      success: true,
      message: 'FAQ deleted successfully',
    });
  } catch (error: any) {
    console.error('[FAQs] Error deleting:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});