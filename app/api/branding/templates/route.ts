// ============================================
// STEP 4: API Route - Templates
// app/api/branding/templates/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient } from '@/lib/auth-middleware';

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const supabase = await getAuthenticatedClient(req);

      const { data, error } = await supabase
        .from('branding_templates')
        .select('*')
        .eq('is_public', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('[Templates GET] Error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch templates' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        templates: data || []
      });
    } catch (err: any) {
      console.error('[Templates GET] Error:', err);
      return NextResponse.json(
        { success: false, error: err.message || 'Server error' },
        { status: 500 }
      );
    }
  }
);
