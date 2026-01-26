// app/api/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// GET - Get single campaign
export const GET = withAuth(
  async (req: NextRequest, user: AuthUser, { params }: { params: Promise<{ id: string }> }) => {
    try {
      //  Await params first
      const { id: campaignId } = await params;
      const supabase = await getAuthenticatedClient(req);

      console.log('[Campaign GET] Fetching campaign:', campaignId);

      // Fetch campaign and verify ownership
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          websites!inner(id, user_id)
        `)
        .eq('id', campaignId)
        .eq('websites.user_id', user.id)
        .single();

      if (error || !campaign) {
        console.error('[Campaign GET] Not found:', error);
        return NextResponse.json(
          { error: 'Campaign not found or access denied' },
          { status: 404 }
        );
      }

      console.log('[Campaign GET] Campaign found:', campaign.id);

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

// PATCH - Update campaign
export const PATCH = withAuth(
  async (req: NextRequest, user: AuthUser, { params }: { params: Promise<{ id: string }> }) => {
    try {
      //  Await params first
      const { id: campaignId } = await params;
      const supabase = await getAuthenticatedClient(req);
      const updates = await req.json();

      console.log('[Campaign PATCH] Updating campaign:', campaignId);

      // Verify ownership first
      const { data: existing } = await supabase
        .from('campaigns')
        .select(`
          id,
          websites!inner(id, user_id)
        `)
        .eq('id', campaignId)
        .eq('websites.user_id', user.id)
        .single();

      if (!existing) {
        return NextResponse.json(
          { error: 'Campaign not found or access denied' },
          { status: 404 }
        );
      }

      // Update campaign
      const { data: campaign, error } = await supabase
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

      console.log('[Campaign PATCH] Updated successfully');

      return NextResponse.json({
        success: true,
        campaign,
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

// DELETE - Delete campaign
export const DELETE = withAuth(
  async (req: NextRequest, user: AuthUser, { params }: { params: Promise<{ id: string }> }) => {
    try {
      //  Await params first
      const { id: campaignId } = await params;
      const supabase = await getAuthenticatedClient(req);

      console.log('[Campaign DELETE] Deleting campaign:', campaignId);

      // Verify ownership and delete
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('websites.user_id', user.id);

      if (error) {
        console.error('[Campaign DELETE] Error:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      console.log('[Campaign DELETE] Deleted successfully');

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