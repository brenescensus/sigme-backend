// ============================================
// app/api/websites/[id]/logs/route.ts
// GET notification logs for time-series visualization
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export const GET = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const websiteId = params.id;
      const { searchParams } = new URL(req.url);
      const period = searchParams.get('period') || '7d';
      const limit = parseInt(searchParams.get('limit') || '1000');

      const supabase = await getAuthenticatedClient(req);

      console.log('[Website Logs] Fetching logs for website:', websiteId, 'period:', period);

      // Verify ownership
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('id, user_id')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .single();

      if (websiteError || !website) {
        console.error('[Website Logs] Website not found:', websiteError);
        return NextResponse.json(
          { error: 'Website not found or access denied' },
          { status: 404 }
        );
      }

      // Calculate date range
      const getDays = (p: string) => {
        switch (p) {
          case '24h': return 1;
          case '7d': return 7;
          case '30d': return 30;
          case '90d': return 90;
          default: return 7;
        }
      };

      const days = getDays(period);
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      // Fetch logs
      const { data: logs, error: logsError } = await supabase
        .from('notification_logs')
        .select(`
          id,
          status,
          created_at,
          sent_at,
          delivered_at,
          clicked_at,
          dismissed_at,
          error_message,
          platform,
          campaign_id,
          subscriber_id
        `)
        .eq('website_id', websiteId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true })
        .limit(limit);

      if (logsError) {
        console.error('[Website Logs] Error fetching logs:', logsError);
        throw logsError;
      }

      console.log('[Website Logs] Found logs:', logs?.length || 0);

      return NextResponse.json({
        success: true,
        logs: logs || [],
        total: logs?.length || 0,
        period,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      });

    } catch (error: any) {
      console.error('[Website Logs] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  }
);
