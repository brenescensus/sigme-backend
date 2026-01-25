import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, AuthUser } from '@/lib/auth-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const POST = withAuth(async (
  request: NextRequest,
  user: AuthUser,
  { params }: { params: { journeyId: string } }
) => {
  try {
    const { data: journey, error } = await supabase
      .from('journeys')
      .update({ status: 'paused' })
      .eq('id', params.journeyId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !journey) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      journey,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});