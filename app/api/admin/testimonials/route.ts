// ============================================================================
// TESTIMONIALS - ADMIN ROUTES
// File: app/api/admin/testimonials/route.ts
// ============================================================================

/**
 * GET /api/admin/testimonials
 * Get all testimonials (admin only)
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
export const GET = withAdmin(async (req: NextRequest, user) => {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      testimonials: data,
    });
  } catch (error: any) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch testimonials',
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/testimonials
 * Create new testimonial (admin only)
 */
export const POST= withAdmin(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const {
      name,
      role,
      company,
      content,
      rating,
      avatar_url,
      display_order,
    } = body;

    // Validate required fields
    if (!name || !role || !company || !content || rating === undefined) {
      return NextResponse.json(
        {
          error: 'Missing required fields: name, role, company, content, rating',
        },
        { status: 400 }
      );
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          error: 'Rating must be between 1 and 5',
        },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('testimonials')
      .insert({
        name,
        role,
        company,
        content,
        rating,
        avatar_url: avatar_url || null,
        display_order: display_order || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        testimonial: data,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating testimonial:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create testimonial',
      },
      { status: 500 }
    );
  }
});