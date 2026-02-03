// ============================================================================
// COMPANY LOGOS - PUBLIC ROUTES
// File: app/api/logos/public/route.ts
// ============================================================================

/**
 * GET /api/logos/public
 * Get all active company logos (no auth required)
 */


import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/admin-middleware';
import { getAdminClient } from '@/lib/admin-middleware';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const supabase = getAdminClient();

    let query = supabase
      .from('company_logos')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      logos: data,
    });
  } catch (error: any) {
    console.error('Error fetching public logos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch logos',
      },
      { status: 500 }
    );
  }
}