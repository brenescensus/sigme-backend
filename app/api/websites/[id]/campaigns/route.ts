// // // ============================================
// // // app/api/websites/[id]/campaigns/route.ts
// // // GET all campaigns for a website
// // // ============================================
// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // export const GET = withAuth(
// //   async (req: NextRequest, user: AuthUser, context: any) => {
// //     try {
// //       const params = await context.params;
// //       const websiteId = params.id;

// //       const supabase = await getAuthenticatedClient(req);

// //       console.log('[Website Campaigns] Fetching campaigns for website:', websiteId);

// //       // Verify ownership and fetch campaigns
// //       const { data: website, error: websiteError } = await supabase
// //         .from('websites')
// //         .select('id, user_id')
// //         .eq('id', websiteId)
// //         .eq('user_id', user.id)
// //         .single();

// //       if (websiteError || !website) {
// //         console.error('[Website Campaigns] Website not found:', websiteError);
// //         return NextResponse.json(
// //           { error: 'Website not found or access denied' },
// //           { status: 404 }
// //         );
// //       }

// //       // Fetch all campaigns for this website
// //       const { data: campaigns, error: campaignsError } = await supabase
// //         .from('campaigns')
// //         .select(`
// //           id,
// //           name,
// //           title,
// //           status,
// //           created_at,
// //           sent_at,
// //           sent_count,
// //           delivered_count,
// //           clicked_count,
// //           failed_count,
// //           is_recurring,
// //           scheduled_at
// //         `)
// //         .eq('website_id', websiteId)
// //         .order('created_at', { ascending: false });

// //       if (campaignsError) {
// //         console.error('[Website Campaigns] Error fetching campaigns:', campaignsError);
// //         throw campaignsError;
// //       }

// //       console.log('[Website Campaigns] Found campaigns:', campaigns?.length || 0);

// //       return NextResponse.json({
// //         success: true,
// //         campaigns: campaigns || [],
// //         total: campaigns?.length || 0
// //       });

// //     } catch (error: any) {
// //       console.error('[Website Campaigns] Error:', error);
// //       return NextResponse.json(
// //         { error: 'Internal server error', details: error.message },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );
// // app/api/websites/[id]/campaigns/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import { withAuth, AuthUser } from '@/lib/auth-middleware';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser, context: any) => {
//     try {
//       // Extract params from context
//       const params = await context.params;
//       const websiteId = params.id;

//       console.log(`📋 [Campaigns] Fetching for website: ${websiteId}`);

//       // Verify website ownership
//       const { data: website, error: websiteError } = await supabase
//         .from('websites')
//         .select('id')
//         .eq('id', websiteId)
//         .eq('user_id', user.id)
//         .single();

//       if (websiteError || !website) {
//         console.error('🔴 [Campaigns] Website not found or access denied');
//         return NextResponse.json(
//           { success: false, error: 'Website not found or access denied' },
//           { status: 404 }
//         );
//       }

//       // Get campaigns for this website
//       const { data: campaigns, error } = await supabase
//         .from('campaigns')
//         .select('*')
//         .eq('website_id', websiteId)
//         .order('created_at', { ascending: false })
//         .limit(10);

//       if (error) {
//         console.error('🔴 [Campaigns] Fetch error:', error);
//         return NextResponse.json(
//           { success: false, error: 'Failed to fetch campaigns' },
//           { status: 500 }
//         );
//       }

//       console.log(`✅ [Campaigns] Returning ${campaigns?.length || 0} campaigns`);

//       return NextResponse.json({
//         success: true,
//         campaigns: campaigns || []
//       });

//     } catch (error: any) {
//       console.error('🔴 [Campaigns] Error:', error);
//       return NextResponse.json(
//         { success: false, error: error.message || 'Failed to fetch campaigns' },
//         { status: 500 }
//       );
//     }
//   }
// );




// ============================================
// FILE: app/api/websites/[id]/campaigns/route.ts
// FIXED: Proper async params handling
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthUser } from '@/lib/auth-middleware';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleGetCampaigns(
  req: NextRequest,
  user: AuthUser,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ FIX: Await params
    const { id: websiteId } = await context.params;

    console.log(`📋 [Campaigns] Fetching for website: ${websiteId}`);

    // Verify website ownership
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (websiteError || !website) {
      console.error('🔴 [Campaigns] Website not found or access denied');
      return NextResponse.json(
        { success: false, error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    // Get campaigns for this website
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('🔴 [Campaigns] Fetch error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    console.log(`✅ [Campaigns] Returning ${campaigns?.length || 0} campaigns`);

    return NextResponse.json({
      success: true,
      campaigns: campaigns || []
    });

  } catch (error: any) {
    console.error('🔴 [Campaigns] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGetCampaigns);