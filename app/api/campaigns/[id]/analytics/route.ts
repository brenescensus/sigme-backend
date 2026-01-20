// //app/api/campaigns/[id]/analytics/route.ts
// // GET campaign analytics
// // ============================================
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
// export const GET_ANALYTICS = withAuth(
//   async (req: NextRequest, user: AuthUser, context: any) => {
//     try {
//       const params = await context.params;
//       const campaignId = params.id;

//       const supabase = await getAuthenticatedClient(req);

//       // Verify ownership
//       const { data: campaign, error: campaignError } = await supabase
//         .from('campaigns')
//         .select(`
//           id,
//           name,
//           sent_count,
//           delivered_count,
//           clicked_count,
//           failed_count,
//           website:websites!inner(id, user_id)
//         `)
//         .eq('id', campaignId)
//         .eq('website.user_id', user.id)
//         .single();

//       if (campaignError || !campaign) {
//         return NextResponse.json(
//           { error: 'Campaign not found or access denied' },
//           { status: 404 }
//         );
//       }

//       // Get detailed logs
//       const { data: logs, error: logsError } = await supabase
//         .from('notification_logs')
//         .select('*')
//         .eq('campaign_id', campaignId)
//         .order('created_at', { ascending: false })
//         .limit(100);

//       if (logsError) {
//         console.error('[Campaign Analytics] Logs error:', logsError);
//       }

//       // Calculate metrics
//       const deliveryRate = campaign.sent_count > 0
//         ? (campaign.delivered_count / campaign.sent_count * 100).toFixed(2)
//         : 0;

//       const clickThroughRate = campaign.sent_count > 0
//         ? (campaign.clicked_count / campaign.sent_count * 100).toFixed(2)
//         : 0;

//       return NextResponse.json({
//         success: true,
//         analytics: {
//           campaign_id: campaign.id,
//           campaign_name: campaign.name,
//           sent: campaign.sent_count,
//           delivered: campaign.delivered_count,
//           clicked: campaign.clicked_count,
//           failed: campaign.failed_count,
//           delivery_rate: parseFloat(deliveryRate as string),
//           click_through_rate: parseFloat(clickThroughRate as string),
//         },
//         recent_logs: logs || [],
//       });
//     } catch (error: any) {
//       console.error('[Campaign Analytics] Error:', error);
//       return NextResponse.json(
//         { error: 'Internal server error' },
//         { status: 500 }
//       );
//     }
//   }
// );
