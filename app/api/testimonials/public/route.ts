// ============================================================================
// BACKEND API ROUTES FOR TESTIMONIALS & LOGOS
// Next.js App Router API Routes with Admin Authentication
// ============================================================================

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

// ============================================================================
// TESTIMONIALS - PUBLIC ROUTES
// ============================================================================

/**
 * GET /api/testimonials/public
 * Get all active testimonials for landing page (no auth required)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      testimonials: data,
    });
  } catch (error: any) {
    console.error('Error fetching public testimonials:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch testimonials',
      },
      { status: 500 }
    );
  }
}