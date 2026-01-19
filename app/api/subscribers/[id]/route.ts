// app/api/subscribers/[id]/route.ts - CONSOLIDATED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// ==========================================
// GET - Get single subscriber
// ==========================================
export const GET = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const subscriberId = params.id;

      console.log('[Subscriber GET] User:', user.email, 'Subscriber:', subscriberId);

      // Get authenticated client
      const supabase = await getAuthenticatedClient(req);

      // Fetch subscriber and verify website ownership
      const { data: subscriber, error } = await supabase
        .from('subscribers')
        .select(`
          *,
          website:websites!inner(id, user_id, name)
        `)
        .eq('id', subscriberId)
        .eq('website.user_id', user.id)
        .single();

      if (error || !subscriber) {
        return NextResponse.json(
          { error: 'Subscriber not found or access denied' },
          { status: 404 }
        );
      }

      console.log('[Subscriber GET] Success:', subscriber.id);

      return NextResponse.json({
        success: true,
        subscriber,
      });
    } catch (error: any) {
      console.error('[Subscriber GET] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

// ==========================================
// PATCH - Update subscriber status
// ==========================================
export const PATCH = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const subscriberId = params.id;

      console.log('[Subscriber PATCH] User:', user.email, 'Subscriber:', subscriberId);

      const body = await req.json();
      const { status } = body;

      if (!status || !['active', 'inactive', 'unsubscribed'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be: active, inactive, or unsubscribed' },
          { status: 400 }
        );
      }

      // Get authenticated client
      const supabase = await getAuthenticatedClient(req);

      // Verify ownership before updating
      const { data: subscriber, error: fetchError } = await supabase
        .from('subscribers')
        .select(`
          id,
          website:websites!inner(id, user_id)
        `)
        .eq('id', subscriberId)
        .eq('website.user_id', user.id)
        .single();

      if (fetchError || !subscriber) {
        return NextResponse.json(
          { error: 'Subscriber not found or access denied' },
          { status: 404 }
        );
      }

      // Update status
      const { data, error } = await supabase
        .from('subscribers')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriberId)
        .select()
        .single();

      if (error) {
        console.error('[Subscriber PATCH] Update error:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      console.log('[Subscriber PATCH] Updated:', subscriberId);

      return NextResponse.json({
        success: true,
        subscriber: data,
      });
    } catch (error: any) {
      console.error('[Subscriber PATCH] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

// ==========================================
// DELETE - Delete/Unsubscribe subscriber
// ==========================================
export const DELETE = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const subscriberId = params.id;

      console.log('[Subscriber DELETE] User:', user.email, 'Subscriber:', subscriberId);

      // Get authenticated client
      const supabase = await getAuthenticatedClient(req);

      // Verify ownership before deleting
      const { data: subscriber, error: fetchError } = await supabase
        .from('subscribers')
        .select(`
          id,
          website:websites!inner(id, user_id)
        `)
        .eq('id', subscriberId)
        .eq('website.user_id', user.id)
        .single();

      if (fetchError || !subscriber) {
        return NextResponse.json(
          { error: 'Subscriber not found or access denied' },
          { status: 404 }
        );
      }

      // Soft delete by setting status to inactive
      const { error } = await supabase
        .from('subscribers')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriberId);

      if (error) {
        console.error('[Subscriber DELETE] Update error:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      console.log('[Subscriber DELETE] Soft deleted:', subscriberId);

      return NextResponse.json({
        success: true,
        message: 'Subscriber removed successfully',
      });
    } catch (error: any) {
      console.error('[Subscriber DELETE] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

// ==========================================
// POST - Send test notification to subscriber
// ==========================================
export const POST = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const subscriberId = params.id;

      console.log('[Subscriber POST] Sending test notification, User:', user.email);

      const body = await req.json();
      const { title, body: messageBody, icon, image, url } = body;

      if (!title || !messageBody) {
        return NextResponse.json(
          { error: 'Title and body are required' },
          { status: 400 }
        );
      }

      // Get authenticated client
      const supabase = await getAuthenticatedClient(req);

      // Fetch subscriber and verify ownership
      const { data: subscriber, error } = await supabase
        .from('subscribers')
        .select(`
          *,
          website:websites!inner(id, user_id, vapid_public_key, vapid_private_key)
        `)
        .eq('id', subscriberId)
        .eq('website.user_id', user.id)
        .single();

      if (error || !subscriber) {
        return NextResponse.json(
          { error: 'Subscriber not found or access denied' },
          { status: 404 }
        );
      }

      if (subscriber.status !== 'active') {
        return NextResponse.json(
          { error: 'Cannot send notification to inactive subscriber' },
          { status: 400 }
        );
      }

      // TODO: Implement actual push notification sending using web-push
      // For now, we'll just return success
      // You'll need to install: npm install web-push
      // import webpush from 'web-push';
      // 
      // webpush.setVapidDetails(
      //   'mailto:your-email@example.com',
      //   subscriber.website.vapid_public_key,
      //   subscriber.website.vapid_private_key
      // );
      //
      // const pushSubscription = {
      //   endpoint: subscriber.endpoint,
      //   keys: {
      //     p256dh: subscriber.p256dh_key,
      //     auth: subscriber.auth_key
      //   }
      // };
      //
      // await webpush.sendNotification(
      //   pushSubscription,
      //   JSON.stringify({ title, body: messageBody, icon, image, url })
      // );

      console.log('[Subscriber POST] Test notification sent:', subscriberId);

      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
      });
    } catch (error: any) {
      console.error('[Subscriber POST] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);