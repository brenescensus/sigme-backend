// // ============================================
// // app/api/websites/[id]/logs/route.ts
// // GET notification logs for time-series visualization
// // ============================================
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
// import { subDays, startOfDay, endOfDay } from 'date-fns';

// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser, context: any) => {
//     try {
//       const params = await context.params;
//       const websiteId = params.id;
//       const { searchParams } = new URL(req.url);
//       const period = searchParams.get('period') || '7d';
//       const limit = parseInt(searchParams.get('limit') || '1000');

//       const supabase = await getAuthenticatedClient(req);

//       console.log('[Website Logs] Fetching logs for website:', websiteId, 'period:', period);

//       // Verify ownership
//       const { data: website, error: websiteError } = await supabase
//         .from('websites')
//         .select('id, user_id')
//         .eq('id', websiteId)
//         .eq('user_id', user.id)
//         .single();

//       if (websiteError || !website) {
//         console.error('[Website Logs] Website not found:', websiteError);
//         return NextResponse.json(
//           { error: 'Website not found or access denied' },
//           { status: 404 }
//         );
//       }

//       // Calculate date range
//       const getDays = (p: string) => {
//         switch (p) {
//           case '24h': return 1;
//           case '7d': return 7;
//           case '30d': return 30;
//           case '90d': return 90;
//           default: return 7;
//         }
//       };

//       const days = getDays(period);
//       const startDate = startOfDay(subDays(new Date(), days));
//       const endDate = endOfDay(new Date());

//       // Fetch logs
//       const { data: logs, error: logsError } = await supabase
//         .from('notification_logs')
//         .select(`
//           id,
//           status,
//           created_at,
//           sent_at,
//           delivered_at,
//           clicked_at,
//           dismissed_at,
//           error_message,
//           platform,
//           campaign_id,
//           subscriber_id
//         `)
//         .eq('website_id', websiteId)
//         .gte('created_at', startDate.toISOString())
//         .lte('created_at', endDate.toISOString())
//         .order('created_at', { ascending: true })
//         .limit(limit);

//       if (logsError) {
//         console.error('[Website Logs] Error fetching logs:', logsError);
//         throw logsError;
//       }

//       console.log('[Website Logs] Found logs:', logs?.length || 0);

//       return NextResponse.json({
//         success: true,
//         logs: logs || [],
//         total: logs?.length || 0,
//         period,
//         date_range: {
//           start: startDate.toISOString(),
//           end: endDate.toISOString()
//         }
//       });

//     } catch (error: any) {
//       console.error('[Website Logs] Error:', error);
//       return NextResponse.json(
//         { error: 'Internal server error', details: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );


// app/api/websites/[id]/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthUser } from '@/lib/auth-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const GET = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const websiteId = params.id;
      const { searchParams } = new URL(req.url);
      const period = searchParams.get('period') || '7d';
      const limit = parseInt(searchParams.get('limit') || '1000');

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case '24h':
          startDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      // Verify ownership
      const { data: website } = await supabase
        .from('websites')
        .select('id')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .single();

      if (!website) {
        return NextResponse.json(
          { error: 'Website not found' },
          { status: 404 }
        );
      }

      // Get logs
      const { data: logs } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('website_id', websiteId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      // 🔥 Get click events to merge with logs
      const { data: clickEvents } = await supabase
        .from('subscriber_events')
        .select('*')
        .eq('website_id', websiteId)
        .eq('event_name', 'notification_clicked')
        .gte('created_at', startDate.toISOString());

      // Create a map of subscriber_id -> click timestamp
      const clickMap = new Map();
      clickEvents?.forEach(event => {
        if (!clickMap.has(event.subscriber_id) || 
            new Date(event.created_at) > new Date(clickMap.get(event.subscriber_id))) {
          clickMap.set(event.subscriber_id, event.created_at);
        }
      });

      // Enhance logs with click data
      const enhancedLogs = logs?.map(log => ({
        ...log,
        clicked_at: log.clicked_at || clickMap.get(log.subscriber_id) || null,
      }));

      return NextResponse.json({
        success: true,
        logs: enhancedLogs || [],
        total: enhancedLogs?.length || 0,
      });
    } catch (error: any) {
      console.error('[Logs] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch logs' },
        { status: 500 }
      );
    }
  }
);
