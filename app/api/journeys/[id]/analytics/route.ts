import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, AuthUser } from '@/lib/auth-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

//  CORRECT: Export as GET, not GET_ANALYTICS
export const GET = withAuth(async (
  request: NextRequest,
  user: AuthUser,
  { params }: { params: { journeyId: string } }
) => {
  try {
    // Verify journey ownership first
    const { data: journey } = await supabase
      .from('journeys')
      .select('id')
      .eq('id', params.journeyId)
      .eq('user_id', user.id)
      .single();

    if (!journey) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      );
    }

    // Get journey stats
    const { data: states, error: statesError } = await supabase
      .from('user_journey_states')
      .select('status')
      .eq('journey_id', params.journeyId);

    if (statesError) throw statesError;

    const analytics = {
      total_entered: states?.length || 0,
      active: states?.filter(s => s.status === 'active').length || 0,
      completed: states?.filter(s => s.status === 'completed').length || 0,
      exited: states?.filter(s => s.status === 'exited').length || 0,
    };

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error: any) {
    console.error('Error fetching journey analytics:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});