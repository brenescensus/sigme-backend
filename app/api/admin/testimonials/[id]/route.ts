// app/api/admin/testimonials/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/admin-middleware';
import { getAdminClient } from '@/lib/admin-middleware';

/**
 * GET /api/admin/testimonials/:id
 * Get single testimonial (admin only)
 */
export const GET = withAdmin(
  async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
    try {
      // IMPORTANT: In Next.js 15, params is a Promise and must be awaited
      const { id } = await context.params;
      
      const supabase = getAdminClient();

      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        return NextResponse.json(
          { error: 'Testimonial not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        testimonial: data,
      });
    } catch (error: any) {
      console.error('Error fetching testimonial:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to fetch testimonial',
        },
        { status: 500 }
      );
    }
  }
);

/**
 * PUT /api/admin/testimonials/:id
 * Update testimonial (admin only)
 */
export const PUT = withAdmin(
  async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
    try {
      // IMPORTANT: In Next.js 15, params is a Promise and must be awaited
      const { id } = await context.params;
      
      const updates = await req.json();

      // Validate rating if provided
      if (updates.rating && (updates.rating < 1 || updates.rating > 5)) {
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
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        return NextResponse.json(
          { error: 'Testimonial not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        testimonial: data,
      });
    } catch (error: any) {
      console.error('Error updating testimonial:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to update testimonial',
        },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/admin/testimonials/:id
 * Delete testimonial (admin only)
 */
export const DELETE = withAdmin(
  async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
    try {
      // IMPORTANT: In Next.js 15, params is a Promise and must be awaited
      const { id } = await context.params;
      
      const supabase = getAdminClient();

      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Testimonial deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting testimonial:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to delete testimonial',
        },
        { status: 500 }
      );
    }
  }
);