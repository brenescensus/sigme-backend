// app/api/journeys/[id]/route.ts
// SIMPLIFIED: Removes relationship joins to avoid 404 errors

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
      const journeyId = params?.id;

      if (!journeyId) {
        return NextResponse.json(
          { success: false, error: 'Journey ID is required' },
          { status: 400 }
        );
      }

      console.log('[Journey GET] User:', user.email, 'Journey:', journeyId);

      const { data: journey, error } = await supabase
        .from('journeys')
        .select('*')
        .eq('id', journeyId)
        .eq('user_id', user.id) // Direct ownership check
        .single();

      if (error || !journey) {
        console.error('[Journey GET] Not found:', error?.message);
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

export const PUT = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const journeyId = params?.id;

      if (!journeyId) {
        return NextResponse.json(
          { success: false, error: 'Journey ID is required' },
          { status: 400 }
        );
      }

      const body = await req.json();
      console.log('[Journey PUT] Updating journey:', journeyId);

      // current_step_id Verify ownership with simple query
      const { data: existing } = await supabase
        .from('journeys')
        .select('id')
        .eq('id', journeyId)
        .eq('user_id', user.id)
        .single();

      if (!existing) {
        console.error('[Journey PUT] Not found or access denied');
        return NextResponse.json(
          { success: false, error: 'Journey not found or access denied' },
          { status: 404 }
        );
      }

      // Build update object
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      // current_step_id ADD website_id to allowed fields
      const allowedFields = [
        'name',
        'description',
        'entry_trigger',
        'exit_rules',           // current_step_id Add this
        're_entry_settings',    // current_step_id Add this
        'flow_definition',
        'settings',
        'status',
        'website_id',           // current_step_id Add this
      ];

      allowedFields.forEach((field) => {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      });

      // Update journey
      const { data: updatedJourney, error } = await supabase
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
        journey: updatedJourney,
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
      const journeyId = params?.id;

      if (!journeyId) {
        return NextResponse.json(
          { success: false, error: 'Journey ID is required' },
          { status: 400 }
        );
      }

      console.log('[Journey DELETE] Deleting journey:', journeyId);
      console.log('[Journey DELETE] User:', user.email, 'User ID:', user.id);

      // current_step_id Simple query - check ownership directly
      const { data: journey, error: fetchError } = await supabase
        .from('journeys')
        .select('id, name, user_id')
        .eq('id', journeyId)
        .single();

      if (fetchError || !journey) {
        console.error('[Journey DELETE] Journey not found:', fetchError?.message);
        return NextResponse.json(
          { success: false, error: 'Journey not found' },
          { status: 404 }
        );
      }

      console.log('[Journey DELETE] Found journey:', journey.name);
      console.log('[Journey DELETE] Journey owner:', journey.user_id);

      // current_step_id Verify ownership
      if (journey.user_id !== user.id) {
        console.error('[Journey DELETE] Access denied - User does not own this journey');
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }

      console.log('[Journey DELETE] Ownership verified');

      // current_step_id Delete journey (cascade will handle related records)
      const { error: deleteError } = await supabase
        .from('journeys')
        .delete()
        .eq('id', journeyId);

      if (deleteError) {
        console.error('[Journey DELETE] Delete error:', deleteError);
        return NextResponse.json(
          { success: false, error: deleteError.message },
          { status: 500 }
        );
      }

      console.log('[Journey DELETE] current_step_id Deleted successfully');

      return NextResponse.json({
        success: true,
        message: 'Journey deleted successfully',
      });
    } catch (error: any) {
      console.error('[Journey DELETE] Unexpected error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to delete journey' },
        { status: 500 }
      );
    }
  }
);