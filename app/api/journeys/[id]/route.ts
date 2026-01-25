// app/api/journeys/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthUser } from '@/lib/auth-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/journeys/[id] - Get single journey
export const GET = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const journeyId = params.id;

      console.log('[Journey GET] User:', user.email, 'Journey:', journeyId);

      // Fetch journey and verify ownership via website
      const { data: journey, error } = await supabase
        .from('journeys')
        .select(`
          *,
          websites!inner(id, user_id, name)
        `)
        .eq('id', journeyId)
        .eq('websites.user_id', user.id)
        .single();

      if (error || !journey) {
        console.error('[Journey GET] Not found:', error);
        return NextResponse.json(
          { success: false, error: 'Journey not found or access denied' },
          { status: 404 }
        );
      }

      console.log('[Journey GET] Found:', journey.name);

      return NextResponse.json({
        success: true,
        journey,
      });
    } catch (error: any) {
      console.error('[Journey GET] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch journey' },
        { status: 500 }
      );
    }
  }
);

// PUT /api/journeys/[id] - Update journey
export const PUT = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const journeyId = params.id;
      const body = await req.json();

      console.log('[Journey PUT] Updating journey:', journeyId);

      // Verify ownership first
      const { data: existing } = await supabase
        .from('journeys')
        .select(`
          id,
          websites!inner(id, user_id)
        `)
        .eq('id', journeyId)
        .eq('websites.user_id', user.id)
        .single();

      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Journey not found or access denied' },
          { status: 404 }
        );
      }

      // Build update object
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      const allowedFields = [
        'name',
        'description',
        'entry_trigger',
        'flow_definition',
        'settings',
        'status',
      ];

      allowedFields.forEach((field) => {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      });

      // Update journey
      const { data: journey, error } = await supabase
        .from('journeys')
        .update(updates)
        .eq('id', journeyId)
        .select()
        .single();

      if (error) {
        console.error('[Journey PUT] Error:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      console.log('[Journey PUT] Updated successfully');

      return NextResponse.json({
        success: true,
        journey,
      });
    } catch (error: any) {
      console.error('[Journey PUT] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update journey' },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/journeys/[id] - Delete journey
export const DELETE = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const journeyId = params.id;

      console.log('[Journey DELETE] Deleting journey:', journeyId);

      // Verify ownership first
      const { data: existing } = await supabase
        .from('journeys')
        .select(`
          id,
          websites!inner(id, user_id)
        `)
        .eq('id', journeyId)
        .eq('websites.user_id', user.id)
        .single();

      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Journey not found or access denied' },
          { status: 404 }
        );
      }

      // Delete journey (cascade will handle related records)
      const { error } = await supabase
        .from('journeys')
        .delete()
        .eq('id', journeyId);

      if (error) {
        console.error('[Journey DELETE] Error:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      console.log('[Journey DELETE] Deleted successfully');

      return NextResponse.json({
        success: true,
        message: 'Journey deleted successfully',
      });
    } catch (error: any) {
      console.error('[Journey DELETE] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to delete journey' },
        { status: 500 }
      );
    }
  }
);