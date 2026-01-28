// // // ============================================
// // // backend/app/api/ai/generate-notification/route.ts
// // // ============================================

// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
// // import { getAIGenerator, NotificationContext, AIGenerationRequest } from '@/lib/ai/notification-generator';

// // export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
// //   try {
// //     const supabase = await getAuthenticatedClient(req);
// //     const body = (await req.json()) as AIGenerationRequest;

// //     const { prompt, websiteId, goal, tone, maxLength, includeEmojis = true } = body;

// //     if (!prompt || prompt.trim().length === 0) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

// //     // Build context
// //     let context: NotificationContext | undefined;
// //     if (websiteId) {
// //       const { data: website } = await supabase
// //         .from('websites')
// //         .select('*')
// //         .eq('id', websiteId)
// //         .eq('user_id', user.id)
// //         .single();

// //       if (website) {
// //         const { data: campaigns } = await supabase
// //           .from('campaigns')
// //           .select('title, body, clicked_count, delivered_count, sent_at, sent_count')
// //           .eq('website_id', websiteId)
// //           .gt('delivered_count', 0)
// //           .order('clicked_count', { ascending: false })
// //           .limit(5);

// //         context = {
// //           websiteId,
// //           websiteName: website.name,
// //           websiteDomain: website.domain || undefined,
// //           goal: goal || 'engagement',
// //           tone: tone || 'friendly',
// //           previousCampaigns: campaigns?.map(c => ({
// //             title: c.title,
// //             body: c.body,
// //             clickRate: c.delivered_count ? c.clicked_count / c.delivered_count : 0,
// //             deliveredCount: c.delivered_count,
// //             sent_at: c.sent_at ?? undefined,
// //             sent_count: c.sent_count ?? undefined,
// //           })),
// //         };
// //       }
// //     }

// //     const generator = getAIGenerator();
// //     const result = await generator.generateNotification({ prompt, maxLength, includeEmojis, goal, tone }, context);

// //     if (!result.success) return NextResponse.json({ error: result.error || 'AI generation failed' }, { status: 500 });

// //     const optimalTime = context?.previousCampaigns
// //       ? await generator.analyzeOptimalSendTime(context.previousCampaigns)
// //       : result.bestTime;

// //     const targetSegment = context
// //       ? normalizeSegment(await generator.suggestTargetSegment(context))
// //       : normalizeSegment(result.targetSegment);

// //     return NextResponse.json({
// //       success: true,
// //       suggestions: result.suggestions,
// //       bestTime: optimalTime,
// //       targetSegment,
// //     });
// //   } catch (error: any) {
// //     console.error('[AI Generate] Error:', error);
// //     return NextResponse.json({ error: 'Failed to generate notification', details: error.message }, { status: 500 });
// //   }
// // });

// // function normalizeSegment(segment?: string): 'all_subscribers' | 'active' | 'inactive' | 'custom' {
// //   if (!segment) return 'all_subscribers';
// //   const s = segment.toLowerCase();
// //   if (s.includes('inactive')) return 'inactive';
// //   if (s.includes('active')) return 'active';
// //   if (s.includes('custom')) return 'custom';
// //   return 'all_subscribers';
// // }




// // app/api/ai/generate-notification/route.ts
// // API endpoint for AI-powered notification generation

// import { NextRequest, NextResponse } from 'next/server';
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
// import { cookies } from 'next/headers';
// import { getAIGenerator, NotificationContext, AIGenerationRequest } from '@/lib/ai/notification-generator';

// export const runtime = 'nodejs';
// export const dynamic = 'force-dynamic';

// export async function POST(request: NextRequest) {
//   try {
//     // Initialize Supabase client
//     const supabase = createRouteHandlerClient({ cookies });

//     // Verify authentication
//     const { data: { session }, error: authError } = await supabase.auth.getSession();
    
//     if (authError || !session) {
//       return NextResponse.json(
//         { success: false, error: 'Unauthorized' },
//         { status: 401 }
//       );
//     }

//     const user = session.user;

//     // Parse request body
//     const body: AIGenerationRequest = await request.json();
//     const { prompt, websiteId, goal, tone, maxLength, includeEmojis = true } = body;

//     // Validate input
//     if (!prompt || prompt.trim().length === 0) {
//       return NextResponse.json(
//         { success: false, error: 'Prompt is required' },
//         { status: 400 }
//       );
//     }

//     // Build context from historical data
//     let context: NotificationContext | undefined;

//     if (websiteId) {
//       // Fetch website data
//       const { data: website, error: websiteError } = await supabase
//         .from('websites')
//         .select('*')
//         .eq('id', websiteId)
//         .eq('user_id', user.id)
//         .single();

//       if (websiteError) {
//         console.error('[AI Generate] Website fetch error:', websiteError);
//         return NextResponse.json(
//           { success: false, error: 'Website not found or access denied' },
//           { status: 404 }
//         );
//       }

//       if (website) {
//         // Fetch historical campaign data for context
//         const { data: campaigns, error: campaignsError } = await supabase
//           .from('campaigns')
//           .select('title, body, clicked_count, delivered_count, sent_at, sent_count')
//           .eq('website_id', websiteId)
//           .gt('delivered_count', 0)
//           .order('clicked_count', { ascending: false })
//           .limit(10); // Get top 10 campaigns

//         if (campaignsError) {
//           console.warn('[AI Generate] Campaigns fetch error:', campaignsError);
//         }

//         // Build context object
//         context = {
//           websiteId,
//           websiteName: website.name,
//           websiteDomain: website.domain || undefined,
//           goal: goal || 'engagement',
//           tone: tone || 'friendly',
//           previousCampaigns: campaigns?.map(c => ({
//             title: c.title,
//             body: c.body,
//             clickRate: c.delivered_count > 0 ? c.clicked_count / c.delivered_count : 0,
//             deliveredCount: c.delivered_count,
//             sent_at: c.sent_at ?? undefined,
//             sent_count: c.sent_count ?? undefined,
//           })) || [],
//         };
//       }
//     }

//     // Generate notifications using AI
//     const generator = getAIGenerator();
//     const result = await generator.generateNotification(
//       { prompt, maxLength, includeEmojis, goal, tone },
//       context
//     );

//     if (!result.success) {
//       return NextResponse.json(
//         { success: false, error: result.error || 'AI generation failed' },
//         { status: 500 }
//       );
//     }

//     // Get optimal send time
//     const optimalTime = context?.previousCampaigns && context.previousCampaigns.length > 0
//       ? await generator.analyzeOptimalSendTime(context.previousCampaigns)
//       : result.bestTime;

//     // Get target segment suggestion
//     const targetSegment = context
//       ? normalizeSegment(await generator.suggestTargetSegment(context))
//       : normalizeSegment(result.targetSegment);

//     return NextResponse.json({
//       success: true,
//       suggestions: result.suggestions,
//       bestTime: optimalTime,
//       targetSegment,
//     });

//   } catch (error: any) {
//     console.error('[AI Generate] Error:', error);
//     return NextResponse.json(
//       { 
//         success: false, 
//         error: 'Failed to generate notification', 
//         details: process.env.NODE_ENV === 'development' ? error.message : undefined 
//       },
//       { status: 500 }
//     );
//   }
// }

// /**
//  * Normalize segment to valid database values
//  */
// function normalizeSegment(segment?: string): 'all_subscribers' | 'active' | 'inactive' | 'custom' {
//   if (!segment) return 'all_subscribers';
  
//   const s = segment.toLowerCase();
  
//   if (s.includes('inactive') || s.includes('dormant')) {
//     return 'inactive';
//   }
  
//   if (s.includes('active') || s.includes('engaged')) {
//     return 'active';
//   }
  
//   if (s.includes('custom') || s.includes('specific')) {
//     return 'custom';
//   }
  
//   return 'all_subscribers';
// }


// app/api/ai/generate-notification/route.ts
// API endpoint for AI-powered notification generation
// Integrates with existing Supabase auth and database

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
import { getAIGenerator, NotificationContext, AIGenerationRequest } from '@/lib/ai/notification-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/generate-notification
 * Generate AI-powered notification suggestions based on prompt and historical data
 * 
 * Request body:
 * {
 *   prompt: string;              // What you want to communicate
 *   websiteId?: string;          // Optional: for context-aware generation
 *   goal?: string;               // promotion | update | reminder | engagement | announcement
 *   tone?: string;               // professional | casual | urgent | friendly
 *   maxLength?: number;          // Max body length (default: 120)
 *   includeEmojis?: boolean;     // Include emojis (default: true)
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   suggestions: Array<{
 *     title: string;
 *     body: string;
 *     emoji?: string;
 *     reason?: string;
 *   }>;
 *   bestTime?: string;           // Optimal send time recommendation
 *   targetSegment?: string;      // Recommended audience segment
 *   error?: string;
 * }
 */
export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
  try {
    console.log('🤖 [AI Generate] Request from:', user.email);
    
    // Parse request body
    const body: AIGenerationRequest = await req.json();
    const { prompt, websiteId, goal, tone, maxLength, includeEmojis = true } = body;

    // Validate input
    if (!prompt || prompt.trim().length === 0) {
      console.error(' [AI Generate] Empty prompt');
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('📝 [AI Generate] Prompt:', prompt.substring(0, 50) + '...');
    console.log('🎯 [AI Generate] Goal:', goal, '| Tone:', tone);

    // Build context from historical data
    let context: NotificationContext | undefined;

    if (websiteId) {
      console.log('🔍 [AI Generate] Building context for website:', websiteId);
      
      const supabase = await getAuthenticatedClient(req);
      
      // Fetch website data and verify ownership
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('*')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .single();

      if (websiteError || !website) {
        console.error(' [AI Generate] Website not found or access denied');
        return NextResponse.json(
          { success: false, error: 'Website not found or access denied' },
          { status: 404 }
        );
      }

      console.log(' [AI Generate] Website found:', website.name);

      // Fetch historical campaign data for AI context
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('title, body, clicked_count, delivered_count, sent_at, sent_count')
        .eq('website_id', websiteId)
        .gt('delivered_count', 0) // Only campaigns that were actually delivered
        .order('clicked_count', { ascending: false }) // Best performing first
        .limit(10); // Top 10 campaigns

      if (campaignsError) {
        console.warn('⚠️  [AI Generate] Could not fetch campaigns:', campaignsError.message);
      } else {
        console.log(`📊 [AI Generate] Found ${campaigns?.length || 0} historical campaigns`);
      }

      // Build context object with historical data
      context = {
        websiteId,
        websiteName: website.name,
        websiteDomain: website.domain || undefined,
        goal: goal || 'engagement',
        tone: tone || 'friendly',
        previousCampaigns: campaigns?.map(c => ({
          title: c.title,
          body: c.body,
          clickRate: c.delivered_count > 0 ? c.clicked_count / c.delivered_count : 0,
          deliveredCount: c.delivered_count,
          sent_at: c.sent_at ?? undefined,
          sent_count: c.sent_count ?? undefined,
        })) || [],
      };

      console.log('✨ [AI Generate] Context built with', context.previousCampaigns?.length || 0, 'campaigns');
    }

    // Generate notifications using HuggingFace AI
    console.log('🚀 [AI Generate] Calling HuggingFace API...');
    
    const generator = getAIGenerator();
    const result = await generator.generateNotification(
      { prompt, maxLength, includeEmojis, goal, tone },
      context
    );

    if (!result.success) {
      console.error(' [AI Generate] Generation failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'AI generation failed' },
        { status: 500 }
      );
    }

    console.log(' [AI Generate] Generated', result.suggestions.length, 'suggestions');

    // Analyze optimal send time from historical data
    const optimalTime = context?.previousCampaigns && context.previousCampaigns.length > 0
      ? await generator.analyzeOptimalSendTime(context.previousCampaigns)
      : result.bestTime;

    // Get target segment recommendation
    const targetSegment = context
      ? normalizeSegment(await generator.suggestTargetSegment(context))
      : normalizeSegment(result.targetSegment);

    console.log('⏰ [AI Generate] Optimal time:', optimalTime);
    console.log('🎯 [AI Generate] Target segment:', targetSegment);

    // Return successful response
    return NextResponse.json({
      success: true,
      suggestions: result.suggestions,
      bestTime: optimalTime,
      targetSegment,
    });

  } catch (error: any) {
    console.error(' [AI Generate] Unexpected error:', error);
    console.error('Stack trace:', error.stack);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate notification', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    );
  }
});

/**
 * Normalize segment to valid database values
 * Maps AI suggestions to your database schema
 */
function normalizeSegment(segment?: string): 'all_subscribers' | 'active' | 'inactive' | 'custom' {
  if (!segment) return 'all_subscribers';
  
  const s = segment.toLowerCase();
  
  if (s.includes('inactive') || s.includes('dormant') || s.includes('churned')) {
    return 'inactive';
  }
  
  if (s.includes('active') || s.includes('engaged') || s.includes('recent')) {
    return 'active';
  }
  
  if (s.includes('custom') || s.includes('specific') || s.includes('targeted')) {
    return 'custom';
  }
  
  return 'all_subscribers';
}