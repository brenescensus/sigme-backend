// app/api/admin/logos/[id]/toggle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/admin-middleware';
import { getAdminClient } from '@/lib/admin-middleware';

/**
 * PATCH /api/admin/logos/:id/toggle
 * Toggle logo active status (admin only)
 */
export const PATCH = withAdmin(
  async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
    try {
      // IMPORTANT: In Next.js 15, params is a Promise and must be awaited
      const { id } = await context.params;
      
      const supabase = getAdminClient();

      // Get current status
      const { data: current, error: fetchError } = await supabase
        .from('company_logos')
        .select('is_active')
        .eq('id', id)
        .single();

      if (fetchError || !current) {
        return NextResponse.json(
          { error: 'Logo not found' },
          { status: 404 }
        );
      }

      // Toggle status
      const { data, error } = await supabase
        .from('company_logos')
        .update({ is_active: !current.is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        logo: data,
        message: `Logo ${data.is_active ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      console.error('Error toggling logo:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to toggle logo',
        },
        { status: 500 }
      );
    }
  }
);