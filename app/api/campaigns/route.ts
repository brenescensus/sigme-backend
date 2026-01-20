// // // ============================================
// // // app/api/campaigns/route.ts
// // // CREATE & LIST campaigns - FIXED TO MATCH FRONTEND
// // // ============================================

// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // // GET - List all campaigns for a website
// // export const GET = withAuth(
// //   async (req: NextRequest, user: AuthUser) => {
// //     try {
// //       const { searchParams } = new URL(req.url);
// //       const websiteId = searchParams.get('websiteId');

// //       console.log('[Campaigns GET] Request for website:', websiteId);

// //       if (!websiteId) {
// //         return NextResponse.json(
// //           { error: 'websiteId is required' },
// //           { status: 400 }
// //         );
// //       }

// //       const supabase = await getAuthenticatedClient(req);

// //       // Verify website ownership
// //       const { data: website, error: websiteError } = await supabase
// //         .from('websites')
// //         .select('id')
// //         .eq('id', websiteId)
// //         .eq('user_id', user.id)
// //         .single();

// //       if (websiteError || !website) {
// //         console.error('[Campaigns GET] Website access denied:', websiteError);
// //         return NextResponse.json(
// //           { error: 'Website not found or access denied' },
// //           { status: 404 }
// //         );
// //       }

// //       // Fetch campaigns
// //       const { data: campaigns, error } = await supabase
// //         .from('campaigns')
// //         .select('*')
// //         .eq('website_id', websiteId)
// //         .order('created_at', { ascending: false });

// //       if (error) {
// //         console.error('[Campaigns GET] Error:', error);
// //         return NextResponse.json(
// //           { error: error.message },
// //           { status: 500 }
// //         );
// //       }

// //       console.log('[Campaigns GET] Found', campaigns?.length || 0, 'campaigns');

// //       return NextResponse.json({
// //         success: true,
// //         campaigns: campaigns || [],
// //       });
// //     } catch (error: any) {
// //       console.error('[Campaigns GET] Error:', error);
// //       return NextResponse.json(
// //         { error: 'Internal server error' },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );

// // // POST - Create new campaign
// // export const POST = withAuth(
// //   async (req: NextRequest, user: AuthUser) => {
// //     try {
// //       const supabase = await getAuthenticatedClient(req);
// //       const body = await req.json();

// //       console.log('[Campaigns POST] Creating campaign:', {
// //         name: body.name,
// //         websiteId: body.websiteId,
// //         segment: body.segment,
// //         status: body.status,
// //       });

// //       const {
// //         websiteId,
// //         name,
// //         title,
// //         body: messageBody,
// //         icon_url,
// //         image_url,
// //         click_url,
// //         actions,
// //         segment,
// //         target_browsers,
// //         target_devices,
// //         target_countries,
// //         status,
// //         scheduled_at,
// //         is_recurring,
// //         recurrence_pattern,
// //         recurrence_config,
// //         next_send_at,
// //       } = body;

// //       // Validation
// //       if (!websiteId || !name || !title || !messageBody) {
// //         return NextResponse.json(
// //           { error: 'Required fields: websiteId, name, title, body' },
// //           { status: 400 }
// //         );
// //       }

// //       // Verify website ownership
// //       const { data: website, error: websiteError } = await supabase
// //         .from('websites')
// //         .select('id, user_id')
// //         .eq('id', websiteId)
// //         .eq('user_id', user.id)
// //         .single();

// //       if (websiteError || !website) {
// //         console.error('[Campaigns POST] Website access denied:', websiteError);
// //         return NextResponse.json(
// //           { error: 'Website not found or access denied' },
// //           { status: 404 }
// //         );
// //       }

// //       // BILLING CHECK: Recurring notifications
// //       if (is_recurring && status !== 'draft') {
// //         // Get user's plan and limits
// //         const { data: userData } = await supabase
// //           .from('users')
// //           .select('plan, role')
// //           .eq('id', user.id)
// //           .single();

// //         const isOwner = userData?.role === 'owner' || user.email?.includes('owner');

// //         if (!isOwner) {
// //           // Count current recurring campaigns
// //           const { count } = await supabase
// //             .from('campaigns')
// //             .select('*', { count: 'exact', head: true })
// //             .eq('website_id', websiteId)
// //             .eq('is_recurring', true)
// //             .in('status', ['recurring', 'active']);

// //           const currentRecurring = count || 0;

// //           // Check limits based on plan
// //           const limits = {
// //             free: 0,
// //             starter: 10,
// //             growth: 30,
// //           };

// //           const maxRecurring = limits[userData?.plan as keyof typeof limits] || 0;

// //           if (currentRecurring >= maxRecurring) {
// //             console.warn('[Campaigns POST] Billing limit exceeded:', {
// //               current: currentRecurring,
// //               max: maxRecurring,
// //               plan: userData?.plan,
// //             });
// //             return NextResponse.json(
// //               { 
// //                 error: 'BILLING_LIMIT_EXCEEDED',
// //                 message: `Your plan allows ${maxRecurring} recurring campaigns. Upgrade to create more.`,
// //                 code: 'BILLING_LIMIT_EXCEEDED'
// //               },
// //               { status: 403 }
// //             );
// //           }
// //         }
// //       }

// //       // Normalize segment value - ensure consistency
// //       const normalizedSegment = segment === 'all' ? 'all_subscribers' : segment || 'all_subscribers';

// //       console.log('[Campaigns POST] Normalized segment:', normalizedSegment);

// //       // Create campaign - using snake_case for database columns
// //       const { data: campaign, error } = await supabase
// //         .from('campaigns')
// //         .insert({
// //           website_id: websiteId,
// //           name,
// //           title,
// //           body: messageBody,
// //           icon_url: icon_url || null,
// //           image_url: image_url || null,
// //           click_url: click_url || null,
// //           actions: actions || null,
// //           segment: normalizedSegment,
// //           target_browsers: target_browsers || null,
// //           target_devices: target_devices || null,
// //           target_countries: target_countries || null,
// //           status: status || 'draft',
// //           scheduled_at: scheduled_at || null,
// //           is_recurring: is_recurring || false,
// //           recurrence_pattern: recurrence_pattern || null,
// //           recurrence_config: recurrence_config || null,
// //           next_send_at: next_send_at || null,
// //         })
// //         .select()
// //         .single();

// //       if (error) {
// //         console.error('[Campaigns POST] Database error:', error);
// //         return NextResponse.json(
// //           { error: error.message },
// //           { status: 500 }
// //         );
// //       }

// //       console.log('[Campaigns POST] Campaign created successfully:', campaign.id);

// //       return NextResponse.json({
// //         success: true,
// //         campaign,
// //       }, { status: 201 });
// //     } catch (error: any) {
// //       console.error('[Campaigns POST] Error:', error);
// //       return NextResponse.json(
// //         { error: 'Internal server error' },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );

// // ============================================
// // app/api/campaigns/route.ts
// // CREATE & LIST campaigns - FIXED TO MATCH FRONTEND
// // ============================================

// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // GET - List all campaigns for a website
// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       const { searchParams } = new URL(req.url);
//       const websiteId = searchParams.get('websiteId');

//       console.log('[Campaigns GET] Request for website:', websiteId);

//       if (!websiteId) {
//         return NextResponse.json(
//           { error: 'websiteId is required' },
//           { status: 400 }
//         );
//       }

//       const supabase = await getAuthenticatedClient(req);

//       // Verify website ownership
//       const { data: website, error: websiteError } = await supabase
//         .from('websites')
//         .select('id')
//         .eq('id', websiteId)
//         .eq('user_id', user.id)
//         .single();

//       if (websiteError || !website) {
//         console.error('[Campaigns GET] Website access denied:', websiteError);
//         return NextResponse.json(
//           { error: 'Website not found or access denied' },
//           { status: 404 }
//         );
//       }

//       // Fetch campaigns
//       const { data: campaigns, error } = await supabase
//         .from('campaigns')
//         .select('*')
//         .eq('website_id', websiteId)
//         .order('created_at', { ascending: false });

//       if (error) {
//         console.error('[Campaigns GET] Error:', error);
//         return NextResponse.json(
//           { error: error.message },
//           { status: 500 }
//         );
//       }

//       console.log('[Campaigns GET] Found', campaigns?.length || 0, 'campaigns');

//       return NextResponse.json({
//         success: true,
//         campaigns: campaigns || [],
//       });
//     } catch (error: any) {
//       console.error('[Campaigns GET] Error:', error);
//       return NextResponse.json(
//         { error: 'Internal server error' },
//         { status: 500 }
//       );
//     }
//   }
// );

// // POST - Create new campaign
// export const POST = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       const supabase = await getAuthenticatedClient(req);
//       const body = await req.json();

//       console.log('[Campaigns POST] Creating campaign:', {
//         name: body.name,
//         websiteId: body.websiteId,
//         segment: body.segment,
//         status: body.status,
//       });

//       const {
//         websiteId,
//         name,
//         title,
//         body: messageBody,
//         icon_url,
//         image_url,
//         click_url,
//         actions,
//         segment,
//         target_browsers,
//         target_devices,
//         target_countries,
//         status,
//         scheduled_at,
//         is_recurring,
//         recurrence_pattern,
//         recurrence_config,
//         next_send_at,
//       } = body;

//       // Validation
//       if (!websiteId || !name || !title || !messageBody) {
//         return NextResponse.json(
//           { error: 'Required fields: websiteId, name, title, body' },
//           { status: 400 }
//         );
//       }

//       // Verify website ownership
//       const { data: website, error: websiteError } = await supabase
//         .from('websites')
//         .select('id, user_id')
//         .eq('id', websiteId)
//         .eq('user_id', user.id)
//         .single();

//       if (websiteError || !website) {
//         console.error('[Campaigns POST] Website access denied:', websiteError);
//         return NextResponse.json(
//           { error: 'Website not found or access denied' },
//           { status: 404 }
//         );
//       }

//       // BILLING CHECK: Recurring notifications
//       // NOTE: Billing enforcement currently disabled
//       // Enable when you have a billing/subscription system in place
//       if (is_recurring && status !== 'draft') {
//         const isOwner = user.email?.includes('owner') || user.email?.includes('@anthropic.com');
        
//         if (isOwner) {
//           console.log('[Campaigns POST] Owner detected - bypassing billing limits');
//         } else {
//           // TODO: Implement billing checks when subscription system is ready
//           // For now, allow all recurring campaigns
//           console.log('[Campaigns POST] Billing checks disabled - allowing recurring campaign');
          
//           /* FUTURE: Enable this when billing is ready
//           const { count } = await supabase
//             .from('campaigns')
//             .select('*', { count: 'exact', head: true })
//             .eq('website_id', websiteId)
//             .eq('is_recurring', true)
//             .in('status', ['recurring', 'active']);

//           const currentRecurring = count || 0;
//           const maxRecurring = 10; // Get from user's plan
          
//           if (currentRecurring >= maxRecurring) {
//             return NextResponse.json(
//               { 
//                 error: 'BILLING_LIMIT_EXCEEDED',
//                 message: `Your plan allows ${maxRecurring} recurring campaigns.`,
//                 code: 'BILLING_LIMIT_EXCEEDED'
//               },
//               { status: 403 }
//             );
//           }
//           */
//         }
//       }

//       // Normalize segment value - ensure consistency
//       const normalizedSegment = segment === 'all' ? 'all_subscribers' : segment || 'all_subscribers';

//       console.log('[Campaigns POST] Normalized segment:', normalizedSegment);

//       // Create campaign - using snake_case for database columns
//       const { data: campaign, error } = await supabase
//         .from('campaigns')
//         .insert({
//           website_id: websiteId,
//           name,
//           title,
//           body: messageBody,
//           icon_url: icon_url || null,
//           image_url: image_url || null,
//           click_url: click_url || null,
//           actions: actions || null,
//           segment: normalizedSegment,
//           target_browsers: target_browsers || null,
//           target_devices: target_devices || null,
//           target_countries: target_countries || null,
//           status: status || 'draft',
//           scheduled_at: scheduled_at || null,
//           is_recurring: is_recurring || false,
//           recurrence_pattern: recurrence_pattern || null,
//           recurrence_config: recurrence_config || null,
//           next_send_at: next_send_at || null,
//         })
//         .select()
//         .single();

//       if (error) {
//         console.error('[Campaigns POST] Database error:', error);
//         return NextResponse.json(
//           { error: error.message },
//           { status: 500 }
//         );
//       }

//       console.log('[Campaigns POST] Campaign created successfully:', campaign.id);

//       return NextResponse.json({
//         success: true,
//         campaign,
//       }, { status: 201 });
//     } catch (error: any) {
//       console.error('[Campaigns POST] Error:', error);
//       return NextResponse.json(
//         { error: 'Internal server error' },
//         { status: 500 }
//       );
//     }
//   }
// );

// ============================================
// app/api/campaigns/route.ts
// CREATE & LIST campaigns
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// GET - List all campaigns for a website
export const GET = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const { searchParams } = new URL(req.url);
      const websiteId = searchParams.get('websiteId');

      console.log('[Campaigns GET] Request for website:', websiteId);

      if (!websiteId) {
        return NextResponse.json(
          { error: 'websiteId is required' },
          { status: 400 }
        );
      }

      const supabase = await getAuthenticatedClient(req);

      // Verify website ownership
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('id')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .single();

      if (websiteError || !website) {
        console.error('[Campaigns GET] Website access denied:', websiteError);
        return NextResponse.json(
          { error: 'Website not found or access denied' },
          { status: 404 }
        );
      }

      // Fetch campaigns
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Campaigns GET] Error:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      console.log('[Campaigns GET] Found', campaigns?.length || 0, 'campaigns');

      return NextResponse.json({
        success: true,
        campaigns: campaigns || [],
      });
    } catch (error: any) {
      console.error('[Campaigns GET] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

// POST - Create new campaign
export const POST = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {

      const supabase = await getAuthenticatedClient(req);
      const body = await req.json();

      console.log('[Campaigns POST] Creating campaign:', {
        name: body.name,
        websiteId: body.websiteId,
        segment: body.segment,
        status: body.status,
      });

      const {
        websiteId,
        name,
        title,
        body: messageBody,
        icon_url,
        image_url,
        click_url,
        actions,
        segment,
        target_browsers,
        target_devices,
        target_countries,
        status,
        scheduled_at,
        is_recurring,
        recurrence_pattern,
        recurrence_config,
        next_send_at,
      } = body;

      // Validation
      if (!websiteId || !name || !title || !messageBody) {
        return NextResponse.json(
          { error: 'Required fields: websiteId, name, title, body' },
          { status: 400 }
        );
      }

      // Verify website ownership
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('id, user_id')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .single();

      if (websiteError || !website) {
        console.error('[Campaigns POST] Website access denied:', websiteError);
        return NextResponse.json(
          { error: 'Website not found or access denied' },
          { status: 404 }
        );
      }

      // Normalize segment value - handle both 'all' and 'all_subscribers'
      let normalizedSegment = segment || 'all_subscribers';
      if (normalizedSegment === 'all') {
        normalizedSegment = 'all_subscribers';
      }

      console.log('[Campaigns POST] Normalized segment:', normalizedSegment);

      // Create campaign
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
          website_id: websiteId,
          name,
          title,
          body: messageBody,
          icon_url: icon_url || null,
          image_url: image_url || null,
          click_url: click_url || null,
          actions: actions || null,
          segment: normalizedSegment,
          target_browsers: target_browsers || null,
          target_devices: target_devices || null,
          target_countries: target_countries || null,
          status: status || 'draft',
          scheduled_at: scheduled_at || null,
          is_recurring: is_recurring || false,
          recurrence_pattern: recurrence_pattern || null,
          recurrence_config: recurrence_config || null,
          next_send_at: next_send_at || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[Campaigns POST] Database error:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      console.log('[Campaigns POST] Campaign created successfully:', campaign.id);

      return NextResponse.json({
        success: true,
        campaign,
      }, { status: 201 });
    } catch (error: any) {
      console.error('[Campaigns POST] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);