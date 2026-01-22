

// // app/api/ai/generate-notification/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
// import { getAIGenerator, NotificationContext, AIGenerationRequest } from '@/lib/ai/notification-generator';

// export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
//     try {
//         const supabase = await getAuthenticatedClient(req);
//         const body = await req.json() as AIGenerationRequest;

//         const { prompt, websiteId, goal, tone, maxLength, includeEmojis = true } = body;

//         // Validate prompt
//         if (!prompt || prompt.trim().length === 0) {
//             return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
//         }

//         // Build website context
//         let context: NotificationContext | undefined;
//         if (websiteId) {
//             const { data: website } = await supabase
//                 .from('websites')
//                 .select('*')
//                 .eq('id', websiteId)
//                 .eq('user_id', user.id)
//                 .single();

//             if (website) {
//                 const { data: campaigns } = await supabase
//                     .from('campaigns')
//                     .select('title, body, clicked_count, delivered_count, sent_at, sent_count')
//                     .eq('website_id', websiteId)
//                     .gt('delivered_count', 0)
//                     .order('clicked_count', { ascending: false })
//                     .limit(5);

//                 context = {
//                     websiteId,
//                     websiteName: website.name,
//                     websiteDomain: website.domain || undefined,
//                     goal: goal || 'engagement',
//                     tone: tone || 'friendly',
//                     previousCampaigns: campaigns?.map(c => ({
//                         title: c.title,
//                         body: c.body,
//                         clickRate: c.delivered_count ? c.clicked_count / c.delivered_count : 0,
//                         deliveredCount: c.delivered_count,
//                         sent_at: c.sent_at ?? undefined,       // <-- null → undefined
//                         sent_count: c.sent_count ?? undefined,
//                     })),
//                 };
//             }
//         }

//         // Generate AI suggestions
//         const generator = getAIGenerator();
//         const result = await generator.generateNotification({ prompt, maxLength, includeEmojis }, context);

//         if (!result.success) {
//             return NextResponse.json({ error: result.error || 'AI generation failed' }, { status: 500 });
//         }

//         // Analyze optimal send time & target segment
//         const optimalTime = websiteId && context?.previousCampaigns
//             ? await generator.analyzeOptimalSendTime(context.previousCampaigns)
//             : result.bestTime;

//         const targetSegment = context
//             ? normalizeSegment(await generator.suggestTargetSegment(context))
//             : normalizeSegment(result.targetSegment);

//         // Return response
//         return NextResponse.json({
//             success: true,
//             suggestions: result.suggestions,
//             bestTime: optimalTime,
//             targetSegment,
//         });
//     } catch (error: any) {
//         console.error('[AI Generate] Error:', error);
//         return NextResponse.json(
//             { error: 'Failed to generate notification', details: error.message },
//             { status: 500 }
//         );
//     }
// });

// // Helper to ensure target segment is compatible with DB
// function normalizeSegment(segment?: string): 'all_subscribers' | 'active' | 'inactive' | 'custom' {
//     if (!segment) return 'all_subscribers';
//     const s = segment.toLowerCase();
//     if (s.includes('inactive')) return 'inactive';
//     if (s.includes('active')) return 'active';
//     if (s.includes('custom')) return 'custom';
//     return 'all_subscribers';
// }


// ============================================
// app/api/ai/generate-notification/route.ts
// Next.js API route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
import { getAIGenerator, NotificationContext, AIGenerationRequest } from '@/lib/ai/notification-generator';

export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
  try {
    const supabase = await getAuthenticatedClient(req);
    const body = (await req.json()) as AIGenerationRequest;

    const { prompt, websiteId, goal, tone, maxLength, includeEmojis = true } = body;

    if (!prompt || prompt.trim().length === 0) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

    // Build context
    let context: NotificationContext | undefined;
    if (websiteId) {
      const { data: website } = await supabase
        .from('websites')
        .select('*')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .single();

      if (website) {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('title, body, clicked_count, delivered_count, sent_at, sent_count')
          .eq('website_id', websiteId)
          .gt('delivered_count', 0)
          .order('clicked_count', { ascending: false })
          .limit(5);

        context = {
          websiteId,
          websiteName: website.name,
          websiteDomain: website.domain || undefined,
          goal: goal || 'engagement',
          tone: tone || 'friendly',
          previousCampaigns: campaigns?.map(c => ({
            title: c.title,
            body: c.body,
            clickRate: c.delivered_count ? c.clicked_count / c.delivered_count : 0,
            deliveredCount: c.delivered_count,
            sent_at: c.sent_at ?? undefined,
            sent_count: c.sent_count ?? undefined,
          })),
        };
      }
    }

    const generator = getAIGenerator();
    const result = await generator.generateNotification({ prompt, maxLength, includeEmojis, goal, tone }, context);

    if (!result.success) return NextResponse.json({ error: result.error || 'AI generation failed' }, { status: 500 });

    const optimalTime = context?.previousCampaigns
      ? await generator.analyzeOptimalSendTime(context.previousCampaigns)
      : result.bestTime;

    const targetSegment = context
      ? normalizeSegment(await generator.suggestTargetSegment(context))
      : normalizeSegment(result.targetSegment);

    return NextResponse.json({
      success: true,
      suggestions: result.suggestions,
      bestTime: optimalTime,
      targetSegment,
    });
  } catch (error: any) {
    console.error('[AI Generate] Error:', error);
    return NextResponse.json({ error: 'Failed to generate notification', details: error.message }, { status: 500 });
  }
});

function normalizeSegment(segment?: string): 'all_subscribers' | 'active' | 'inactive' | 'custom' {
  if (!segment) return 'all_subscribers';
  const s = segment.toLowerCase();
  if (s.includes('inactive')) return 'inactive';
  if (s.includes('active')) return 'active';
  if (s.includes('custom')) return 'custom';
  return 'all_subscribers';
}
