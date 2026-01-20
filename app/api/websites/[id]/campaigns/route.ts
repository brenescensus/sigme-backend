// ============================================
// app/api/websites/[id]/campaigns/route.ts
// GET all campaigns for a website
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

export const GET = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const websiteId = params.id;

      const supabase = await getAuthenticatedClient(req);

      console.log('[Website Campaigns] Fetching campaigns for website:', websiteId);

      // Verify ownership and fetch campaigns
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('id, user_id')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .single();

      if (websiteError || !website) {
        console.error('[Website Campaigns] Website not found:', websiteError);
        return NextResponse.json(
          { error: 'Website not found or access denied' },
          { status: 404 }
        );
      }

      // Fetch all campaigns for this website
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          title,
          status,
          created_at,
          sent_at,
          sent_count,
          delivered_count,
          clicked_count,
          failed_count,
          is_recurring,
          scheduled_at
        `)
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false });

      if (campaignsError) {
        console.error('[Website Campaigns] Error fetching campaigns:', campaignsError);
        throw campaignsError;
      }

      console.log('[Website Campaigns] Found campaigns:', campaigns?.length || 0);

      return NextResponse.json({
        success: true,
        campaigns: campaigns || [],
        total: campaigns?.length || 0
      });

    } catch (error: any) {
      console.error('[Website Campaigns] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  }
);