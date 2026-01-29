//api/journeys/[id]/activate

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
  context: any
) => {
  try {
    const params = await context.params;
    const journeyId = params?.id;

    if (!journeyId) {
      return NextResponse.json(
        { error: 'Journey ID is required' },
        { status: 400 }
      );
    }

    console.log('🚀 [Activate] Journey ID:', journeyId);
    console.log('🚀 [Activate] User ID:', user.id);

    // Update status to active
    const { data: journey, error } = await supabase
      .from('journeys')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !journey) {
      console.error(' [Activate] Error:', error);
      return NextResponse.json(
        { error: 'Journey not found or access denied' },
        { status: 404 }
      );
    }

    console.log(' [Activate] Journey activated:', journey.name);

    return NextResponse.json({
      success: true,
      journey,
    });
  } catch (error: any) {
    console.error(' [Activate] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});