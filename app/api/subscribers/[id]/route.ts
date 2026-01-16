// FILE: app/api/subscribers/[id]/route.ts
// Individual subscriber operations
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: {
    id: string;
  };
}

// DELETE - Unsubscribe
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();


    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get subscriber and verify ownership
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('*, websites!inner(user_id)')
      .eq('id', params.id)
      .single();

    if (!subscriber || subscriber.websites.user_id !== user.id) {
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
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Subscriber unsubscribed successfully',
    });
  } catch (error: any) {
    console.error('[Subscriber DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
