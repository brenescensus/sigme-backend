// app/api/journeys/[id]/archive/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    //  Await params (this is the missing piece)
    const { id: journeyId } = await params;

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: journey, error: fetchError } = await supabase
      .from('journeys')
      .select('id, status, total_active')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !journey) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      );
    }

    if (journey.total_active && journey.total_active > 0) {
      return NextResponse.json(
        {
          error: `Cannot archive journey with ${journey.total_active} active users.`,
          total_active: journey.total_active,
        },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('journeys')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', journeyId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to archive journey' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Journey archived successfully',
      journey: updated,
    });

  } catch (error: any) {
    console.error('[Archive Journey]', error);
    return NextResponse.json(
      { error: error.message ?? 'Server error' },
      { status: 500 }
    );
  }
}
