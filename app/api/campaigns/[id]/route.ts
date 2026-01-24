

// // ============================================
// // app/api/campaigns/[id]/route.ts
// // UPDATE, DELETE, and GET individual campaign
// // ============================================

// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // GET - Get single campaign
// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser, { params }: { params: { id: string } }) => {
//     try {
//       const campaignId = params.id;
//       const supabase = await getAuthenticatedClient(req);

//       console.log('[Campaign GET] Fetching campaign:', campaignId);

//       // Fetch campaign and verify ownership
//       const { data: campaign, error } = await supabase
//         .from('campaigns')
//         .select(`
//           *,
//           websites!inner(id, user_id)
//         `)
//         .eq('id', campaignId)
//         .eq('websites.user_id', user.id)
//         .single();

//       if (error || !campaign) {
//         console.error('[Campaign GET] Not found:', error);
//         return NextResponse.json(
//           { error: 'Campaign not found or access denied' },
//           { status: 404 }
//         );
//       }

//       return NextResponse.json({
//         success: true,
//         campaign,
//       });
//     } catch (error: any) {
//       console.error('[Campaign GET] Error:', error);
//       return NextResponse.json(
//         { error: 'Internal server error' },
//         { status: 500 }
//       );
//     }
//   }
// );

// // PATCH - Update campaign
// export const PATCH = withAuth(
//   async (req: NextRequest, user: AuthUser, { params }: { params: { id: string } }) => {
//     try {
//       const campaignId = params.id;
//       const supabase = await getAuthenticatedClient(req);
//       const updates = await req.json();

//       console.log('[Campaign PATCH] Updating campaign:', campaignId, updates);

//       // First verify ownership
//       const { data: existingCampaign, error: fetchError } = await supabase
//         .from('campaigns')
//         .select(`
//           id,
//           website_id,
//           websites!inner(user_id)
//         `)
//         .eq('id', campaignId)
//         .eq('websites.user_id', user.id)
//         .single();

//       if (fetchError || !existingCampaign) {
//         console.error('[Campaign PATCH] Not found:', fetchError);
//         return NextResponse.json(
//           { error: 'Campaign not found or access denied' },
//           { status: 404 }
//         );
//       }

//       // Prepare update data (only allow certain fields to be updated)
//       const allowedFields = [
//         'name',
//         'title',
//         'body',
//         'icon_url',
//         'image_url',
//         'click_url',
//         'actions',
//         'segment',
//         'target_browsers',
//         'target_devices',
//         'target_countries',
//         'status',
//         'scheduled_at',
//         'is_recurring',
//         'recurrence_pattern',
//         'recurrence_config',
//         'next_send_at',
//       ];

//       const updateData: any = {};
//       for (const field of allowedFields) {
//         if (field in updates) {
//           updateData[field] = updates[field];
//         }
//       }

//       // Normalize segment if it's being updated
//       if ('segment' in updateData && updateData.segment === 'all') {
//         updateData.segment = 'all_subscribers';
//       }

//       // Add updated_at timestamp
//       updateData.updated_at = new Date().toISOString();

//       // Update the campaign
//       const { data: campaign, error: updateError } = await supabase
//         .from('campaigns')
//         .update(updateData)
//         .eq('id', campaignId)
//         .select()
//         .single();

//       if (updateError) {
//         console.error('[Campaign PATCH] Update error:', updateError);
//         return NextResponse.json(
//           { error: updateError.message },
//           { status: 500 }
//         );
//       }

//       console.log('[Campaign PATCH] Updated successfully');

//       return NextResponse.json({
//         success: true,
//         campaign,
//       });
//     } catch (error: any) {
//       console.error('[Campaign PATCH] Error:', error);
//       return NextResponse.json(
//         { error: 'Internal server error' },
//         { status: 500 }
//       );
//     }
//   }
// );

// // DELETE - Delete campaign
// export const DELETE = withAuth(
//   async (req: NextRequest, user: AuthUser, { params }: { params: { id: string } }) => {
//     try {
//       const campaignId = params.id;
//       const supabase = await getAuthenticatedClient(req);

//       console.log('[Campaign DELETE] Deleting campaign:', campaignId);

//       // First verify ownership
//       const { data: existingCampaign, error: fetchError } = await supabase
//         .from('campaigns')
//         .select(`
//           id,
//           websites!inner(user_id)
//         `)
//         .eq('id', campaignId)
//         .eq('websites.user_id', user.id)
//         .single();

//       if (fetchError || !existingCampaign) {
//         console.error('[Campaign DELETE] Not found:', fetchError);
//         return NextResponse.json(
//           { error: 'Campaign not found or access denied' },
//           { status: 404 }
//         );
//       }

//       // Delete the campaign
//       const { error: deleteError } = await supabase
//         .from('campaigns')
//         .delete()
//         .eq('id', campaignId);

//       if (deleteError) {
//         console.error('[Campaign DELETE] Delete error:', deleteError);
//         return NextResponse.json(
//           { error: deleteError.message },
//           { status: 500 }
//         );
//       }

//       console.log('[Campaign DELETE] Deleted successfully');

//       return NextResponse.json({
//         success: true,
//         message: 'Campaign deleted successfully',
//       });
//     } catch (error: any) {
//       console.error('[Campaign DELETE] Error:', error);
//       return NextResponse.json(
//         { error: 'Internal server error' },
//         { status: 500 }
//       );
//     }
//   }
// );

// // // ============================================
// // // app/api/campaigns/[id]/route.ts
// // // Campaign CRUD operations - UPDATE, DELETE, GET
// // // File location: app/api/campaigns/[id]/route.ts
// // // ============================================

// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // // ============================================
// // // GET - Fetch single campaign
// // // ============================================
// // export const GET = withAuth(
// //   async (req: NextRequest, user: AuthUser, context: any) => {
// //     try {
// //       const params = await context.params;
// //       const campaignId = params.id;

// //       const supabase = await getAuthenticatedClient(req);

// //       console.log('[Campaign GET] Fetching campaign:', campaignId);

// //       const { data: campaign, error } = await supabase
// //         .from('campaigns')
// //         .select(`
// //           *,
// //           website:websites!inner(id, user_id, name)
// //         `)
// //         .eq('id', campaignId)
// //         .eq('website.user_id', user.id)
// //         .single();

// //       if (error || !campaign) {
// //         console.error('[Campaign GET] Error:', error);
// //         return NextResponse.json(
// //           { error: 'Campaign not found or access denied' },
// //           { status: 404 }
// //         );
// //       }

// //       return NextResponse.json({
// //         success: true,
// //         campaign,
// //       });
// //     } catch (error: any) {
// //       console.error('[Campaign GET] Error:', error);
// //       return NextResponse.json(
// //         { error: 'Internal server error', details: error.message },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );

// // // ============================================
// // // PATCH - Update campaign
// // // ============================================
// // export const PATCH = withAuth(
// //   async (req: NextRequest, user: AuthUser, context: any) => {
// //     try {
// //       const params = await context.params;
// //       const campaignId = params.id;
// //       const updates = await req.json();

// //       const supabase = await getAuthenticatedClient(req);

// //       console.log('[Campaign PATCH] Updating campaign:', campaignId, updates);

// //       // Verify ownership first
// //       const { data: existing, error: verifyError } = await supabase
// //         .from('campaigns')
// //         .select(`
// //           id,
// //           website:websites!inner(id, user_id)
// //         `)
// //         .eq('id', campaignId)
// //         .eq('website.user_id', user.id)
// //         .single();

// //       if (verifyError || !existing) {
// //         console.error('[Campaign PATCH] Access denied:', verifyError);
// //         return NextResponse.json(
// //           { error: 'Campaign not found or access denied' },
// //           { status: 404 }
// //         );
// //       }

// //       // Normalize segment value if present
// //       if (updates.segment === 'all') {
// //         updates.segment = 'all_subscribers';
// //       }

// //       // Update campaign
// //       const { data: campaign, error: updateError } = await supabase
// //         .from('campaigns')
// //         .update({
// //           ...updates,
// //           updated_at: new Date().toISOString(),
// //         })
// //         .eq('id', campaignId)
// //         .select()
// //         .single();

// //       if (updateError) {
// //         console.error('[Campaign PATCH] Update error:', updateError);
// //         return NextResponse.json(
// //           { error: 'Failed to update campaign', details: updateError.message },
// //           { status: 400 }
// //         );
// //       }

// //       console.log('[Campaign PATCH] Updated successfully');

// //       return NextResponse.json({
// //         success: true,
// //         campaign,
// //       });
// //     } catch (error: any) {
// //       console.error('[Campaign PATCH] Error:', error);
// //       return NextResponse.json(
// //         { error: 'Internal server error', details: error.message },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );

// // // ============================================
// // // DELETE - Delete campaign
// // // ============================================
// // export const DELETE = withAuth(
// //   async (req: NextRequest, user: AuthUser, context: any) => {
// //     try {
// //       const params = await context.params;
// //       const campaignId = params.id;

// //       const supabase = await getAuthenticatedClient(req);

// //       console.log('[Campaign DELETE] Deleting campaign:', campaignId);

// //       // Verify ownership first
// //       const { data: existing, error: verifyError } = await supabase
// //         .from('campaigns')
// //         .select(`
// //           id,
// //           name,
// //           website:websites!inner(id, user_id)
// //         `)
// //         .eq('id', campaignId)
// //         .eq('website.user_id', user.id)
// //         .single();

// //       if (verifyError || !existing) {
// //         console.error('[Campaign DELETE] Access denied:', verifyError);
// //         return NextResponse.json(
// //           { error: 'Campaign not found or access denied' },
// //           { status: 404 }
// //         );
// //       }

// //       // Delete campaign (this will cascade to notification_logs if FK is set up)
// //       const { error: deleteError } = await supabase
// //         .from('campaigns')
// //         .delete()
// //         .eq('id', campaignId);

// //       if (deleteError) {
// //         console.error('[Campaign DELETE] Delete error:', deleteError);
// //         return NextResponse.json(
// //           { error: 'Failed to delete campaign', details: deleteError.message },
// //           { status: 400 }
// //         );
// //       }

// //       console.log('[Campaign DELETE] Deleted successfully:', existing.name);

// //       return NextResponse.json({
// //         success: true,
// //         message: 'Campaign deleted successfully',
// //       });
// //     } catch (error: any) {
// //       console.error('[Campaign DELETE] Error:', error);
// //       return NextResponse.json(
// //         { error: 'Internal server error', details: error.message },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );


// app/api/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// GET - Get single campaign
export const GET = withAuth(
  async (req: NextRequest, user: AuthUser, { params }: { params: Promise<{ id: string }> }) => {
    try {
      // ✅ Await params first
      const { id: campaignId } = await params;
      const supabase = await getAuthenticatedClient(req);

      console.log('[Campaign GET] Fetching campaign:', campaignId);

      // Fetch campaign and verify ownership
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          websites!inner(id, user_id)
        `)
        .eq('id', campaignId)
        .eq('websites.user_id', user.id)
        .single();

      if (error || !campaign) {
        console.error('[Campaign GET] Not found:', error);
        return NextResponse.json(
          { error: 'Campaign not found or access denied' },
          { status: 404 }
        );
      }

      console.log('[Campaign GET] Campaign found:', campaign.id);

      return NextResponse.json({
        success: true,
        campaign,
      });
    } catch (error: any) {
      console.error('[Campaign GET] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

// PATCH - Update campaign
export const PATCH = withAuth(
  async (req: NextRequest, user: AuthUser, { params }: { params: Promise<{ id: string }> }) => {
    try {
      // ✅ Await params first
      const { id: campaignId } = await params;
      const supabase = await getAuthenticatedClient(req);
      const updates = await req.json();

      console.log('[Campaign PATCH] Updating campaign:', campaignId);

      // Verify ownership first
      const { data: existing } = await supabase
        .from('campaigns')
        .select(`
          id,
          websites!inner(id, user_id)
        `)
        .eq('id', campaignId)
        .eq('websites.user_id', user.id)
        .single();

      if (!existing) {
        return NextResponse.json(
          { error: 'Campaign not found or access denied' },
          { status: 404 }
        );
      }

      // Update campaign
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', campaignId)
        .select()
        .single();

      if (error) {
        console.error('[Campaign PATCH] Error:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      console.log('[Campaign PATCH] Updated successfully');

      return NextResponse.json({
        success: true,
        campaign,
      });
    } catch (error: any) {
      console.error('[Campaign PATCH] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete campaign
export const DELETE = withAuth(
  async (req: NextRequest, user: AuthUser, { params }: { params: Promise<{ id: string }> }) => {
    try {
      // ✅ Await params first
      const { id: campaignId } = await params;
      const supabase = await getAuthenticatedClient(req);

      console.log('[Campaign DELETE] Deleting campaign:', campaignId);

      // Verify ownership and delete
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('websites.user_id', user.id);

      if (error) {
        console.error('[Campaign DELETE] Error:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      console.log('[Campaign DELETE] Deleted successfully');

      return NextResponse.json({
        success: true,
        message: 'Campaign deleted successfully',
      });
    } catch (error: any) {
      console.error('[Campaign DELETE] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);