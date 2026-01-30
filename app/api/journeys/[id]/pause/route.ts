// // // // import { NextRequest, NextResponse } from 'next/server';
// // // // import { createClient } from '@supabase/supabase-js';
// // // // import { withAuth, AuthUser } from '@/lib/auth-middleware';

// // // // const supabase = createClient(
// // // //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // // //   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// // // // );

// // // // export const POST = withAuth(async (
// // // //   request: NextRequest,
// // // //   user: AuthUser,
// // // //   { params }: { params: { journeyId: string } }
// // // // ) => {
// // // //   try {
// // // //     const { data: journey, error } = await supabase
// // // //       .from('journeys')
// // // //       .update({ status: 'paused' })
// // // //       .eq('id', params.journeyId)
// // // //       .eq('user_id', user.id)
// // // //       .select()
// // // //       .single();

// // // //     if (error || !journey) {
// // // //       return NextResponse.json(
// // // //         { error: 'Journey not found' },
// // // //         { status: 404 }
// // // //       );
// // // //     }

// // // //     return NextResponse.json({
// // // //       success: true,
// // // //       journey,
// // // //     });
// // // //   } catch (error: any) {
// // // //     return NextResponse.json(
// // // //       { success: false, error: error.message },
// // // //       { status: 500 }
// // // //     );
// // // //   }
// // // // });


// // // import { NextRequest, NextResponse } from 'next/server';
// // // import { createClient } from '@supabase/supabase-js';
// // // import { withAuth, AuthUser } from '@/lib/auth-middleware';

// // // const supabase = createClient(
// // //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // //   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// // // );

// // // export const POST = withAuth(async (
// // //   request: NextRequest,
// // //   user: AuthUser,
// // //   context: any
// // // ) => {
// // //   try {
// // //     const params = await context.params;
// // //     const journeyId = params?.id;

// // //     if (!journeyId) {
// // //       return NextResponse.json(
// // //         { error: 'Journey ID is required' },
// // //         { status: 400 }
// // //       );
// // //     }

// // //     // Update status to paused
// // //     const { data: journey, error } = await supabase
// // //       .from('journeys')
// // //       .update({ 
// // //         status: 'paused',
// // //         updated_at: new Date().toISOString()
// // //       })
// // //       .eq('id', journeyId)
// // //       .eq('user_id', user.id)
// // //       .select()
// // //       .single();

// // //     if (error || !journey) {
// // //       return NextResponse.json(
// // //         { error: 'Journey not found or access denied' },
// // //         { status: 404 }
// // //       );
// // //     }

// // //     return NextResponse.json({
// // //       success: true,
// // //       journey,
// // //     });
// // //   } catch (error: any) {
// // //     return NextResponse.json(
// // //       { success: false, error: error.message },
// // //       { status: 500 }
// // //     );
// // //   }
// // // });


// // // app/api/journeys/[id]/pause/route.ts
// // /**
// //  * POST /api/journeys/[id]/pause
// //  * Pause a running journey
// //  */


// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@supabase/supabase-js';
// // import type { Database } from '@/types/database';

// // const supabase = createClient<Database>(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );
// // export async function POST_PAUSE(
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

// //     // Verify ownership
// //     const { data: journey, error: checkError } = await supabase
// //       .from('journeys')
// //       .select('id, status')
// //       .eq('id', journeyId)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (checkError || !journey) {
// //       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
// //     }

// //     if (journey.status !== 'active') {
// //       return NextResponse.json({ 
// //         error: `Cannot pause journey with status: ${journey.status}` 
// //       }, { status: 400 });
// //     }

// //     // Pause journey
// //     const { data: updated, error: updateError } = await supabase
// //       .from('journeys')
// //       .update({ 
// //         status: 'paused',
// //         updated_at: new Date().toISOString(),
// //       })
// //       .eq('id', journeyId)
// //       .select()
// //       .single();

// //     if (updateError) {
// //       console.error('[API] Error pausing journey:', updateError);
// //       return NextResponse.json({ error: 'Failed to pause journey' }, { status: 500 });
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       journey: updated,
// //       message: 'Journey paused successfully',
// //     });

// //   } catch (error: any) {
// //     console.error('[API] Error in POST /api/journeys/[journeyId]/pause:', error);
// //     return NextResponse.json({ error: error.message }, { status: 500 });
// //   }
// // }

































// // app/api/journeys/[id]/pause/route.ts
// /**
//  * POST /api/journeys/[id]/pause
//  * Pause a running journey
//  */

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export async function POST(
//   req: NextRequest,
//   { params }: { params: { id: string } }  //  FIXED: Changed from journeyId to id
// ) {
//   try {
//     const authHeader = req.headers.get('authorization');
//     if (!authHeader) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const token = authHeader.replace('Bearer ', '');
//     const { data: { user }, error: authError } = await supabase.auth.getUser(token);

//     if (authError || !user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const journeyId = params.id;  //  Get id from params

//     // Verify ownership
//     const { data: journey, error: checkError } = await supabase
//       .from('journeys')
//       .select('id, status')
//       .eq('id', journeyId)
//       .eq('user_id', user.id)
//       .single();

//     if (checkError || !journey) {
//       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
//     }

//     if (journey.status !== 'active') {
//       return NextResponse.json({ 
//         error: `Cannot pause journey with status: ${journey.status}` 
//       }, { status: 400 });
//     }

//     // Pause journey
//     const { data: updated, error: updateError } = await supabase
//       .from('journeys')
//       .update({ 
//         status: 'paused',
//         updated_at: new Date().toISOString(),
//       })
//       .eq('id', journeyId)
//       .select()
//       .single();

//     if (updateError) {
//       console.error('[API] Error pausing journey:', updateError);
//       return NextResponse.json({ error: 'Failed to pause journey' }, { status: 500 });
//     }

//     return NextResponse.json({
//       success: true,
//       journey: updated,
//       message: 'Journey paused successfully',
//     });

//   } catch (error: any) {
//     console.error('[API] Error in POST /api/journeys/[id]/pause:', error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
























// app/api/journeys/[id]/pause/route.ts - Next.js 15 Compatible
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/journeys/[id]/pause
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }  //  Next.js 15: params is a Promise
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: journeyId } = await params;  //  Await params

    // Verify ownership
    const { data: journey, error: checkError } = await supabase
      .from('journeys')
      .select('id, status')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (checkError || !journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    if (journey.status !== 'active') {
      return NextResponse.json({ 
        error: `Cannot pause journey with status: ${journey.status}` 
      }, { status: 400 });
    }

    // Pause journey
    const { data: updated, error: updateError } = await supabase
      .from('journeys')
      .update({ 
        status: 'paused',
        updated_at: new Date().toISOString(),
      })
      .eq('id', journeyId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error pausing journey:', updateError);
      return NextResponse.json({ error: 'Failed to pause journey' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      journey: updated,
      message: 'Journey paused successfully',
    });

  } catch (error: any) {
    console.error('[API] Error in POST /api/journeys/[id]/pause:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}