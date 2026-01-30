// // // // app/api/journeys/[id]/test/route.ts

// // // export const runtime = 'nodejs';

// // // import { NextRequest, NextResponse } from 'next/server';
// // // import { createClient } from '@supabase/supabase-js';

// // // const supabase = createClient(
// // //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // // );

// // // export async function GET(
// // //   request: NextRequest,
// // //   context: { params: Promise<{ id: string }> } //  params is a Promise
// // // ) {
// // //   try {
// // //     const params = await context.params; //  Await params first
// // //     const { id } = params;
    
// // //     const { searchParams } = new URL(request.url);
// // //     const limit = parseInt(searchParams.get('limit') || '50');
// // //     const eventName = searchParams.get('event_name');

// // //     let query = supabase
// // //       .from('subscriber_events')
// // //       .select('*')
// // //       .eq('subscriber_id', id)
// // //       .order('created_at', { ascending: false })
// // //       .limit(limit);

// // //     if (eventName) {
// // //       query = query.eq('event_name', eventName);
// // //     }

// // //     const { data: events, error } = await query;

// // //     if (error) throw error;

// // //     return NextResponse.json({
// // //       success: true,
// // //       events: events || [],
// // //     });
// // //   } catch (error) {
// // //     console.error('[Events] Error fetching events:', error);
// // //     return NextResponse.json(
// // //       {
// // //         success: false,
// // //         error: 'Failed to fetch events',
// // //       },
// // //       { status: 500 }
// // //     );
// // //   }
// // // }











// // // app/api/journeys/[id]/test/route.ts
// // /**
// //  * POST /api/journeys/[id]/test
// //  * Test a journey with a subscriber
// //  */

// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@supabase/supabase-js';
// // import type { Database } from '@/types/database';
// // import { enrollSubscriber } from '@/lib/journeys/processor';

// // const supabase = createClient<Database>(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // export async function POST_TEST(
// //   req: NextRequest,
// //   { params }: { params: { journeyId: string } }
// // ) {
// //   try {
// //     const authHeader = req.headers.get('authorization');
// //     if (!authHeader) {
// //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// //     }

// //     const token = authHeader.replace('Bearer ', '');
// //     const { data: { user }, error: authError } = await supabase.auth.getUser(token);

// //     if (authError || !user) {
// //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// //     }

// //     const { journeyId } = params;
// //     const body = await req.json();
// //     const { subscriber_id } = body;

// //     // Verify journey ownership
// //     const { data: journey, error: journeyError } = await supabase
// //       .from('journeys')
// //       .select('*, website:websites(*)')
// //       .eq('id', journeyId)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (journeyError || !journey) {
// //       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
// //     }

// //     let testSubscriberId = subscriber_id;

// //     // If no subscriber provided, find or create a test subscriber
// //     if (!testSubscriberId) {
// //       const { data: subscribers } = await supabase
// //         .from('subscribers')
// //         .select('id')
// //         .eq('website_id', journey.website_id)
// //         .eq('status', 'active')
// //         .limit(1);

// //       if (subscribers && subscribers.length > 0) {
// //         testSubscriberId = subscribers[0].id;
// //       } else {
// //         // Create a test subscriber
// //         const { data: newSubscriber, error: createError } = await supabase
// //           .from('subscribers')
// //           .insert({
// //             website_id: journey.website_id,
// //             platform: 'web',
// //             endpoint: 'https://test.example.com/push',
// //             p256dh_key: 'test_p256dh_key',
// //             auth_key: 'test_auth_key',
// //             status: 'active',
// //             tags: ['test'],
// //           })
// //           .select('id')
// //           .single();

// //         if (createError || !newSubscriber) {
// //           return NextResponse.json({ 
// //             error: 'Failed to create test subscriber' 
// //           }, { status: 500 });
// //         }

// //         testSubscriberId = newSubscriber.id;
// //       }
// //     }

// //     // Verify subscriber
// //     const { data: subscriber, error: subscriberError } = await supabase
// //       .from('subscribers')
// //       .select('*')
// //       .eq('id', testSubscriberId)
// //       .eq('website_id', journey.website_id)
// //       .single();

// //     if (subscriberError || !subscriber) {
// //       return NextResponse.json({ 
// //         error: 'Subscriber not found or does not belong to this website' 
// //       }, { status: 404 });
// //     }

// //     console.log('🧪 [API] Testing journey:', {
// //       journey: journey.name,
// //       subscriber: testSubscriberId,
// //       user: user.email,
// //     });

// //     // Enroll subscriber with test context
// //     const journeyState = await enrollSubscriber(journeyId, testSubscriberId, {
// //       test_mode: true,
// //       test_initiated_by: user.email,
// //       test_timestamp: new Date().toISOString(),
// //     });

// //     if (!journeyState) {
// //       return NextResponse.json({
// //         error: 'Could not enroll subscriber for testing',
// //         reason: 'May not meet re-entry criteria or other enrollment conditions',
// //       }, { status: 400 });
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       message: 'Journey test started successfully',
// //       journey_state: {
// //         id: journeyState.id,
// //         status: journeyState.status,
// //         current_step_id: journeyState.current_step_id,
// //       },
// //       journey: {
// //         id: journey.id,
// //         name: journey.name,
// //       },
// //       subscriber: {
// //         id: subscriber.id,
// //         platform: subscriber.platform,
// //       },
// //     });

// //   } catch (error: any) {
// //     console.error('[API] Error in POST /api/journeys/[journeyId]/test:', error);
// //     return NextResponse.json({ error: error.message }, { status: 500 });
// //   }
// // }











// // app/api/journeys/[id]/test/route.ts

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';
// import { enrollSubscriber } from '@/lib/journeys/processor';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export async function POST(
//   req: NextRequest,
//     { params }: { params: Promise<{ id: string }> }  //  Next.js 15: params is a Promise


// ) {
//   try {
//       const { id: journeyId } = await params;
//     const authHeader = req.headers.get('authorization');
//     if (!authHeader) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const token = authHeader.replace('Bearer ', '');
//     const { data: { user }, error: authError } =
//       await supabase.auth.getUser(token);

//     if (authError || !user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { subscriber_id } = await req.json();

//     // Verify journey ownership
//     const { data: journey, error: journeyError } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('id', journeyId)
//       .eq('user_id', user.id)
//       .single();

//     if (journeyError || !journey) {
//       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
//     }

//     // 🧪 enroll test subscriber
//     const journeyState = await enrollSubscriber(journeyId, subscriber_id, {
//       test_mode: true,
//       test_initiated_by: user.email,
//       test_timestamp: new Date().toISOString(),
//     });

//     return NextResponse.json({
//       success: true,
//       message: 'Journey test started successfully',
//       journey_state: journeyState,
//     });

//   } catch (error: any) {
//     console.error('[API] Journey test error:', error);
//     return NextResponse.json(
//       { error: error.message },
//       { status: 500 }
//     );
//   }
// }




















// app/api/journeys/[id]/test/route.ts - FIXED
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { enrollSubscriber } from '@/lib/journeys/processor';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/journeys/[id]/test
 * Test a journey with a subscriber
 * ✅ FIXED: Handles re-entry errors gracefully
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: journeyId } = await params;
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriber_id } = await req.json();

    if (!subscriber_id) {
      return NextResponse.json({ 
        error: 'subscriber_id is required' 
      }, { status: 400 });
    }

    // Verify journey ownership
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('*, website:websites(*)')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (journeyError || !journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // ✅ FIX: Clear any existing test journey states first
    console.log('🧪 [Test] Clearing previous test states for subscriber:', subscriber_id);
    
    const { data: existingStates } = await supabase
      .from('user_journey_states')
      .select('id, status')
      .eq('journey_id', journeyId)
      .eq('subscriber_id', subscriber_id)
      .in('status', ['active', 'waiting']);

    // Exit any active states
    if (existingStates && existingStates.length > 0) {
      for (const state of existingStates) {
        await supabase
          .from('user_journey_states')
          .update({
            status: 'exited',
            exit_reason: 'test_mode_cleanup',
            completed_at: new Date().toISOString(),
          })
          .eq('id', state.id);
        
        // Decrement active count
        await supabase.rpc('increment', {
          table_name: 'journeys',
          column_name: 'total_active',
          row_id: journeyId,
        }).then(async () => {
          // Ensure it doesn't go negative
          const { data: j } = await supabase
            .from('journeys')
            .select('total_active')
            .eq('id', journeyId)
            .single();
          
          if (j && (j.total_active ?? 0) < 0) {
            await supabase
              .from('journeys')
              .update({ total_active: 0 })
              .eq('id', journeyId);
          }
        });
      }
      
      console.log('✅ [Test] Cleared', existingStates.length, 'existing states');
    }

    // Verify subscriber exists
    const { data: subscriber, error: subscriberError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', subscriber_id)
      .eq('website_id', journey.website_id)
      .single();

    if (subscriberError || !subscriber) {
      return NextResponse.json({ 
        error: 'Subscriber not found or does not belong to this website' 
      }, { status: 404 });
    }

    console.log('🧪 [Test] Enrolling subscriber in journey...');

    // 🧪 Enroll test subscriber
    const journeyState = await enrollSubscriber(journeyId, subscriber_id, {
      test_mode: true,
      test_initiated_by: user.email,
      test_timestamp: new Date().toISOString(),
      force_entry: true, // ✅ Add flag to bypass re-entry checks in test mode
    });

    if (!journeyState) {
      return NextResponse.json({
        error: 'Could not enroll subscriber',
        details: 'Enrollment failed - check journey configuration and re-entry settings',
      }, { status: 400 });
    }

    console.log('✅ [Test] Journey test started successfully');

    return NextResponse.json({
      success: true,
      message: 'Journey test started successfully',
      journey_state: {
        id: journeyState.id,
        status: journeyState.status,
        current_step_id: journeyState.current_step_id,
        entered_at: journeyState.entered_at,
      },
      journey: {
        id: journey.id,
        name: journey.name,
      },
      subscriber: {
        id: subscriber.id,
        platform: subscriber.platform,
      },
    });

  } catch (error: any) {
    console.error('❌ [Test] Journey test error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: 'Test enrollment failed - check server logs'
      },
      { status: 500 }
    );
  }
}