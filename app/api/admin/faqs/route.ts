// ============================================================================
// -- app/api/admin/faqs/route.ts
// -- Admin endpoint for managing FAQs
// -- ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';

// GET /api/admin/faqs - List all FAQs
export const GET = withAdmin(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const supabase = getAdminClient();

    let query = supabase
      .from('faqs')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      faqs: data,
    });
  } catch (error: any) {
    console.error('[FAQs] Error fetching:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});

// POST /api/admin/faqs - Create new FAQ
export const POST = withAdmin(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { question, answer, category, display_order } = body;

    // Validate required fields
    if (!question || !answer || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: question, answer, category' },
        { status: 400 }
      );
    }

    // Validate category
    if (!['integration', 'features', 'targeting', 'scaling'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be: integration, features, targeting, or scaling' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('faqs')
      .insert({
        question,
        answer,
        category,
        display_order: display_order || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await logAdminActivity(
      user.id,
      'create_faq',
      'faq',
      data.id,
      { question: question.substring(0, 50), category },
      req.headers.get('x-forwarded-for') || undefined
    );

    return NextResponse.json({
      success: true,
      faq: data,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[FAQs] Error creating:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});