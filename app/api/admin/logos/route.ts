// ============================================================================
//  app/api/admin/logos/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, getAdminClient } from '@/lib/admin-middleware';


export const GET = withAdmin(
  async (req: NextRequest, user) => {
    try {
      // Get query parameters from the URL
      const { searchParams } = new URL(req.url);
      const category = searchParams.get('category');
      
      const supabase = getAdminClient();

      // Build query
      let query = supabase
        .from('company_logos')
        .select('*')
        .order('display_order', { ascending: true });

      // Filter by category if provided
      if (category && ['client', 'partner', 'integration'].includes(category)) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return NextResponse.json({
        success: true,
        logos: data || [],
      });
    } catch (error: any) {
      console.error('Error fetching logos:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to fetch logos',
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/admin/logos
 * Create new company logo (admin only)
 */
export const POST = withAdmin(
  async (req: NextRequest, user) => {
    try {
      const body = await req.json();
      const { company_name, logo_url, website_url, category, display_order, is_active } = body;

      // Validate required fields
      if (!company_name || !logo_url || !category) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing required fields: company_name, logo_url, category',
          },
          { status: 400 }
        );
      }

      // Validate category
      if (!['client', 'partner', 'integration'].includes(category)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid category. Must be: client, partner, or integration',
          },
          { status: 400 }
        );
      }

      const supabase = getAdminClient();

      const { data, error } = await supabase
        .from('company_logos')
        .insert({
          company_name,
          logo_url,
          website_url: website_url || null,
          category,
          display_order: display_order || 0,
          is_active: is_active !== undefined ? is_active : true,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json(
        {
          success: true,
          logo: data,
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('Error creating logo:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to create logo',
        },
        { status: 500 }
      );
    }
  }
);