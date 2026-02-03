// app/api/admin/logos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/admin-middleware';
import { getAdminClient } from '@/lib/admin-middleware';

/**
 * PUT /api/admin/logos/:id
 * Update company logo (admin only)
 */
export const PUT = withAdmin(
  async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
    try {
      // IMPORTANT: In Next.js 15, params is a Promise and must be awaited
      const { id } = await context.params;
      
      const updates = await req.json();

      // Validate category if provided
      if (
        updates.category &&
        !['client', 'partner', 'integration'].includes(updates.category)
      ) {
        return NextResponse.json(
          {
            error: 'Invalid category. Must be: client, partner, or integration',
          },
          { status: 400 }
        );
      }

      const supabase = getAdminClient();

      const { data, error } = await supabase
        .from('company_logos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
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
 * DELETE /api/admin/logos/:id
 * Delete company logo (admin only)
 */
export const DELETE = withAdmin(
  async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
    try {
      // IMPORTANT: In Next.js 15, params is a Promise and must be awaited
      const { id } = await context.params;
      
      const supabase = getAdminClient();

      const { error } = await supabase
        .from('company_logos')
        .delete()
        .eq('id', id);

      if (error) throw error;

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

/**
 * GET /api/admin/logos/:id
 * Get single company logo (admin only)
 */
export const GET = withAdmin(
  async (req: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
    try {
      // IMPORTANT: In Next.js 15, params is a Promise and must be awaited
      const { id } = await context.params;
      
      const supabase = getAdminClient();

      const { data, error } = await supabase
        .from('company_logos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
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