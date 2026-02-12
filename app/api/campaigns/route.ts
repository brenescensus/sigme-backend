// // ============================================
// // app/api/campaigns/route.ts
// // CREATE & LIST campaigns
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

//       // Normalize segment value - handle both 'all' and 'all_subscribers'
//       let normalizedSegment = segment || 'all_subscribers';
//       if (normalizedSegment === 'all') {
//         normalizedSegment = 'all_subscribers';
//       }

//       console.log('[Campaigns POST] Normalized segment:', normalizedSegment);

//       // Create campaign
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





// app/api/campaigns/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
import { checkCustomPlanLimit } from '@/lib/custom-plans/enforce-limits';

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

      //  CHECK NOTIFICATION LIMIT FOR RECURRING CAMPAIGNS
      if (is_recurring) {
        console.log('[Campaigns POST] Checking recurring campaign limit...');
        
        // Check if user can create recurring campaigns
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('recurring_limit, recurring_used')
          .eq('user_id', user.id)
          .single();

        if (subscription) {
          const limit = subscription.recurring_limit || 0;
          const used = subscription.recurring_used || 0;

          if (limit > 0 && used >= limit) {
            console.warn('[Campaigns POST] Recurring campaign limit reached');
            return NextResponse.json(
              { 
                error: `Recurring campaign limit reached. You have ${used} of ${limit} recurring campaigns.`,
                limit,
                used,
              },
              { status: 403 }
            );
          }
        }
      }

      // Normalize segment value
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

        if (is_recurring) {
        console.log('[Campaigns POST] Incrementing recurring_used counter...');

        // Fetch current value
        const { data: currentSub } = await supabase
          .from('user_subscriptions')
          .select('recurring_used')
          .eq('user_id', user.id)
          .single();

        const currentUsed = currentSub?.recurring_used || 0;

        // Update with new value
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({ 
            recurring_used: currentUsed + 1 
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('[Campaigns POST] Failed to increment recurring_used:', updateError);
          // Don't fail the campaign creation, just log the error
        } else {
          console.log('[Campaigns POST] Incremented recurring_used:', currentUsed, '→', currentUsed + 1);
        }
      }
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