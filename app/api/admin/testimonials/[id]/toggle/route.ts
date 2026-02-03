// app/api/admin/testimonials/[id]/toggle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/admin-middleware';
import { getAdminClient } from '@/lib/admin-middleware';

/**
 * PATCH /api/admin/testimonials/:id/toggle
 * Toggle testimonial active status (admin only)
 */
export const PATCH = withAdmin(
  async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
    try {
      // IMPORTANT: In Next.js 15, params is a Promise and must be awaited
      const { id } = await context.params;
      
      const supabase = getAdminClient();

      // Get current status
      const { data: current, error: fetchError } = await supabase
        .from('testimonials')
        .select('is_active')
        .eq('id', id)
        .single();

      if (fetchError || !current) {
        return NextResponse.json(
          { error: 'Testimonial not found' },
          { status: 404 }
        );
      }

      // Toggle status
      const { data, error } = await supabase
        .from('testimonials')
        .update({ is_active: !current.is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        testimonial: data,
        message: `Testimonial ${data.is_active ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      console.error('Error toggling testimonial:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to toggle testimonial',
        },
        { status: 500 }
      );
    }
  }
);