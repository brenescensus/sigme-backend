// // app/api/journeys/[id]/test/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// /**
//  * POST /api/journeys/[id]/test
//  * Test a journey with a subscriber
//  */
// export async function POST(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id: journeyId } = await params;
    
//     console.log('[Test] Journey ID:', journeyId);

//     // Auth check
//     const authHeader = req.headers.get('authorization');
//     if (!authHeader) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const token = authHeader.replace('Bearer ', '');
//     const { data: { user }, error: authError } = await supabase.auth.getUser(token);

//     if (authError || !user) {
//       console.error('[Test] Auth error:', authError);
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // Get request body
//     const body = await req.json();
//     const { subscriber_id } = body;

//     if (!subscriber_id) {
//       return NextResponse.json({ 
//         error: 'subscriber_id is required' 
//       }, { status: 400 });
//     }

//     console.log('[Test] User:', user.email, 'Subscriber:', subscriber_id);

//     // Verify journey ownership
//     const { data: journey, error: journeyError } = await supabase
//       .from('journeys')
//       .select('*, website:websites(*)')
//       .eq('id', journeyId)
//       .eq('user_id', user.id)
//       .single();

//     if (journeyError || !journey) {
//       console.error('[Test] Journey not found:', journeyError);
//       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
//     }

//     // Verify subscriber exists and belongs to website
//     const { data: subscriber, error: subscriberError } = await supabase
//       .from('subscribers')
//       .select('*')
//       .eq('id', subscriber_id)
//       .eq('website_id', journey.website_id)
//       .single();

//     if (subscriberError || !subscriber) {
//       console.error('[Test] Subscriber not found:', subscriberError);
//       return NextResponse.json({ 
//         error: 'Subscriber not found or does not belong to this website' 
//       }, { status: 404 });
//     }

//     // Clear any existing test states
//     console.log('[Test] Cleaning up previous test states...');
    
//     const { data: existingStates } = await supabase
//       .from('user_journey_states')
//       .select('id, status')
//       .eq('journey_id', journeyId)
//       .eq('subscriber_id', subscriber_id)
//       .in('status', ['active', 'waiting']);

//     if (existingStates && existingStates.length > 0) {
//       for (const state of existingStates) {
//         await supabase
//           .from('user_journey_states')
//           .update({
//             status: 'exited',
//             exit_reason: 'test_mode_cleanup',
//             exited_at: new Date().toISOString(),
//           })
//           .eq('id', state.id);
//       }
//       console.log('[Test] Cleared', existingStates.length, 'existing states');
//     }

//     // Enroll subscriber using stored procedure
//     console.log('[Test] Enrolling subscriber...');
    
//     const { data: enrollResult, error: enrollError } = await supabase.rpc(
//       'enroll_subscriber_in_journey',
//       {
//         p_journey_id: journeyId,
//         p_subscriber_id: subscriber_id,
//       }
//     );

//     if (enrollError) {
//       console.error('[Test] Enrollment error:', enrollError);
//       return NextResponse.json({
//         error: 'Failed to enroll subscriber',
//         details: enrollError.message,
//       }, { status: 500 });
//     }

//     console.log('[Test] Enrollment result:', enrollResult);

//     return NextResponse.json({
//       success: true,
//       message: 'Journey test started successfully',
//       journey_state: enrollResult,
//       journey: {
//         id: journey.id,
//         name: journey.name,
//       },
//       subscriber: {
//         id: subscriber.id,
//         platform: subscriber.platform,
//       },
//     });

//   } catch (error: any) {
//     console.error('[Test] Error:', error);
//     return NextResponse.json(
//       { 
//         error: error.message || 'Internal server error',
//       },
//       { status: 500 }
//     );
//   }
// }





// app/api/journeys/[id]/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/journeys/[id]/test
 * Test a journey with a subscriber
 * 
 *  FIXED: Check website ownership instead of journey.user_id
 *  FIXED: Specify foreign key to avoid TypeScript ambiguity
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: journeyId } = await params;
    
    console.log('[Test] Journey ID:', journeyId);

    // Auth check
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Test] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { subscriber_id } = body;

    if (!subscriber_id) {
      return NextResponse.json({ 
        error: 'subscriber_id is required' 
      }, { status: 400 });
    }

    console.log('[Test] User:', user.email, 'Subscriber:', subscriber_id);

    //  FIX: Get journey and verify ownership via website
    // Use explicit foreign key name to avoid TypeScript ambiguity
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select(`
        *,
        website:websites!journeys_website_id_fkey(
          id,
          name,
          user_id
        )
      `)
      .eq('id', journeyId)
      .single();

    if (journeyError || !journey) {
      console.error('[Test] Journey not found:', journeyError);
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    //  FIX: Verify user owns the website
    if (journey.website.user_id !== user.id) {
      console.error('[Test] Unauthorized - user does not own website');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('[Test]  Journey found:', journey.name, '- Website:', journey.website.name);

    // Verify subscriber exists and belongs to website
    const { data: subscriber, error: subscriberError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', subscriber_id)
      .eq('website_id', journey.website_id)
      .single();

    if (subscriberError || !subscriber) {
      console.error('[Test] Subscriber not found:', subscriberError);
      return NextResponse.json({ 
        error: 'Subscriber not found or does not belong to this website' 
      }, { status: 404 });
    }

    console.log('[Test]  Subscriber found:', subscriber.id);

    // Clear any existing test states
    console.log('[Test] Cleaning up previous test states...');
    
    const { data: existingStates } = await supabase
      .from('user_journey_states')
      .select('id, status')
      .eq('journey_id', journeyId)
      .eq('subscriber_id', subscriber_id)
      .in('status', ['active', 'waiting']);

    if (existingStates && existingStates.length > 0) {
      for (const state of existingStates) {
        await supabase
          .from('user_journey_states')
          .update({
            status: 'exited',
            exit_reason: 'test_mode_cleanup',
            exited_at: new Date().toISOString(),
          })
          .eq('id', state.id);
      }
      console.log('[Test]  Cleared', existingStates.length, 'existing states');
    }

    // Enroll subscriber using stored procedure
    console.log('[Test] Enrolling subscriber in journey...');
    
    const { data: enrollResult, error: enrollError } = await supabase.rpc(
      'enroll_subscriber_in_journey',
      {
        p_journey_id: journeyId,
        p_subscriber_id: subscriber_id,
      }
    );

    if (enrollError) {
      console.error('[Test]  Enrollment error:', enrollError);
      return NextResponse.json({
        error: 'Failed to enroll subscriber',
        details: enrollError.message,
      }, { status: 500 });
    }

    console.log('[Test]  Subscriber enrolled successfully!');
    console.log('[Test] Journey state:', enrollResult);

    // Get the created journey state for details
    const { data: journeyState } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('journey_id', journeyId)
      .eq('subscriber_id', subscriber_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Journey test started successfully',
      journey_state: journeyState || enrollResult,
      journey: {
        id: journey.id,
        name: journey.name,
        website_id: journey.website_id,
      },
      subscriber: {
        id: subscriber.id,
        platform: subscriber.platform,
      },
      next_steps: [
        'Check user_journey_states table for the active state',
        'Run the journey processor: POST /api/internal/process-journeys',
        'Check notification_logs table for sent notifications',
      ]
    });

  } catch (error: any) {
    console.error('[Test]  Unexpected error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}