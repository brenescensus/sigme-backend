// ============================================================================
// COMPANY LOGOS - ADMIN ROUTES (Single Logo Operations)
// File: app/api/admin/logos/[id]/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, getAdminClient } from '@/lib/admin-middleware';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * GET /api/admin/logos/[id]
 * Get single company logo (admin only)
 */
export const GET = withAdmin(
  async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
    try {
      // Await params in Next.js 15
      const { id } = await context.params;
      
      const supabase = getAdminClient();

      const { data, error } = await supabase
        .from('company_logos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        return NextResponse.json(
          {
            success: false,
            error: 'Logo not found',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        logo: data,
      });
    } catch (error: any) {
      console.error('Error fetching logo:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to fetch logo',
        },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/admin/logos/[id]
 * Update company logo (admin only)
 */
export const PATCH = withAdmin(
  async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
    try {
      // Await params in Next.js 15
      const { id } = await context.params;
      const body = await req.json();
      const { company_name, logo_url, website_url, category, display_order, is_active } = body;

      // Validate category if provided
      if (category && !['client', 'partner', 'integration'].includes(category)) {
        return NextResponse.json(
          {
            error: 'Invalid category. Must be: client, partner, or integration',
          },
          { status: 400 }
        );
      }

      const supabase = getAdminClient();

      // Build update object with only provided fields
      const updateData: any = {};
      if (company_name !== undefined) updateData.company_name = company_name;
      if (logo_url !== undefined) updateData.logo_url = logo_url;
      if (website_url !== undefined) updateData.website_url = website_url;
      if (category !== undefined) updateData.category = category;
      if (display_order !== undefined) updateData.display_order = display_order;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data, error } = await supabase
        .from('company_logos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        return NextResponse.json(
          {
            success: false,
            error: 'Logo not found',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        logo: data,
      });
    } catch (error: any) {
      console.error('Error updating logo:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to update logo',
        },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/admin/logos/[id]
 * Delete company logo (admin only)
 */
export const DELETE = withAdmin(
  async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
    try {
      // Await params in Next.js 15
      const { id } = await context.params;
      const supabase = getAdminClient();

      // First get the logo to check if it exists and get the logo_url for cleanup
      const { data: existingLogo, error: fetchError } = await supabase
        .from('company_logos')
        .select('logo_url')
        .eq('id', id)
        .single();

      if (fetchError || !existingLogo) {
        return NextResponse.json(
          {
            success: false,
            error: 'Logo not found',
          },
          { status: 404 }
        );
      }

      // Delete from database
      const { error } = await supabase.from('company_logos').delete().eq('id', id);

      if (error) {
        console.error('Error deleting logo:', error);
        throw error;
      }

      // Try to delete from Cloudinary if it's a Cloudinary URL
      if (existingLogo.logo_url?.includes('cloudinary.com')) {
        try {
          // Extract public_id from Cloudinary URL
          const matches = existingLogo.logo_url.match(/\/v\d+\/(.+)\./);
          if (matches && matches[1]) {
            const publicId = matches[1];
            await cloudinary.uploader.destroy(publicId);
            console.log(`Deleted image from Cloudinary: ${publicId}`);
          }
        } catch (cloudinaryError) {
          // Log but don't fail the request if Cloudinary deletion fails
          console.error('Error deleting from Cloudinary:', cloudinaryError);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Logo deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting logo:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to delete logo',
        },
        { status: 500 }
      );
    }
  }
);