// app/api/campaigns/[id]/route.ts
// GET, UPDATE, DELETE single campaign

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// ✅ Changed from GET_SINGLE to GET
export const GET = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const campaignId = params.id;

      const supabase = await getAuthenticatedClient(req);

      // Fetch campaign with ownership verification
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          website:websites!inner(id, user_id, name)
        `)
        .eq('id', campaignId)
        .eq('website.user_id', user.id)
        .single();

      if (error || !campaign) {
        return NextResponse.json(
          { error: 'Campaign not found or access denied' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        campaign,
      });
    } catch (error: any) {
      console.error('[Campaign GET] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

export const PATCH = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const campaignId = params.id;
      const updates = await req.json();

      const supabase = await getAuthenticatedClient(req);

      // Verify ownership
      const { data: campaign, error: fetchError } = await supabase
        .from('campaigns')
        .select(`
          id,
          website:websites!inner(id, user_id)
        `)
        .eq('id', campaignId)
        .eq('website.user_id', user.id)
        .single();

      if (fetchError || !campaign) {
        return NextResponse.json(
          { error: 'Campaign not found or access denied' },
          { status: 404 }
        );
      }

      // Update campaign
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', campaignId)
        .select()
        .single();

      if (error) {
        console.error('[Campaign PATCH] Error:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        campaign: data,
      });
    } catch (error: any) {
      console.error('[Campaign PATCH] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const campaignId = params.id;

      const supabase = await getAuthenticatedClient(req);

      // Verify ownership
      const { data: campaign, error: fetchError } = await supabase
        .from('campaigns')
        .select(`
          id,
          website:websites!inner(id, user_id)
        `)
        .eq('id', campaignId)
        .eq('website.user_id', user.id)
        .single();

      if (fetchError || !campaign) {
        return NextResponse.json(
          { error: 'Campaign not found or access denied' },
          { status: 404 }
        );
      }

      // Delete campaign
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) {
        console.error('[Campaign DELETE] Error:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Campaign deleted successfully',
      });
    } catch (error: any) {
      console.error('[Campaign DELETE] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);