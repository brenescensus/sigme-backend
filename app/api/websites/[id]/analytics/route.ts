// ============================================
// app/api/websites/[id]/analytics/route.ts
// GET overall website analytics
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

      const supabase = await getAuthenticatedClient(req);

      console.log('[Website Analytics] Fetching analytics for website:', websiteId, 'period:', period);

      // Verify ownership
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('id, user_id, active_subscribers, notifications_sent')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .single();

      if (websiteError || !website) {
        console.error('[Website Analytics] Website not found:', websiteError);
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

      console.log('[Website Analytics] Date range:', {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });

      // Fetch notification logs for the period
      const { data: logs, error: logsError } = await supabase
        .from('notification_logs')
        .select('status, delivered_at, clicked_at, created_at')
        .eq('website_id', websiteId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (logsError) {
        console.error('[Website Analytics] Logs error:', logsError);
        throw logsError;
      }

      // Calculate metrics
      const totalSent = logs?.length || 0;
      const totalDelivered = logs?.filter(
        l => l.delivered_at || l.status === 'delivered' || l.status === 'sent'
      ).length || 0;
      const totalClicked = logs?.filter(l => l.clicked_at).length || 0;
      const totalFailed = logs?.filter(l => l.status === 'failed').length || 0;

      const deliveryRate = totalSent > 0
        ? (totalDelivered / totalSent * 100)
        : 0;
      const clickThroughRate = totalSent > 0
        ? (totalClicked / totalSent * 100)
        : 0;

      // Fetch new subscribers in period
      const { data: newSubs, error: subsError } = await supabase
        .from('subscribers')
        .select('id')
        .eq('website_id', websiteId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (subsError) {
        console.error('[Website Analytics] Subscribers error:', subsError);
      }

      const newSubscribers = newSubs?.length || 0;

      const analytics = {
        website_id: websiteId,
        period,
        total_sent: totalSent,
        total_delivered: totalDelivered,
        total_clicked: totalClicked,
        total_failed: totalFailed,
        delivery_rate: parseFloat(deliveryRate.toFixed(2)),
        click_through_rate: parseFloat(clickThroughRate.toFixed(2)),
        new_subscribers: newSubscribers,
        total_subscribers: website.active_subscribers || 0,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      };

      console.log('[Website Analytics] Analytics:', analytics);

      return NextResponse.json({
        success: true,
        ...analytics
      });

    } catch (error: any) {
      console.error('[Website Analytics] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  }
);