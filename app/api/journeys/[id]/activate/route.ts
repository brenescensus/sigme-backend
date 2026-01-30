// // // //api/journeys/[id]/activate

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

// // //     console.log('🚀 [Activate] Journey ID:', journeyId);
// // //     console.log('🚀 [Activate] User ID:', user.id);

// // //     // Update status to active
// // //     const { data: journey, error } = await supabase
// // //       .from('journeys')
// // //       .update({ 
// // //         status: 'active',
// // //         updated_at: new Date().toISOString()
// // //       })
// // //       .eq('id', journeyId)
// // //       .eq('user_id', user.id)
// // //       .select()
// // //       .single();

// // //     if (error || !journey) {
// // //       console.error(' [Activate] Error:', error);
// // //       return NextResponse.json(
// // //         { error: 'Journey not found or access denied' },
// // //         { status: 404 }
// // //       );
// // //     }

// // //     console.log(' [Activate] Journey activated:', journey.name);

// // //     return NextResponse.json({
// // //       success: true,
// // //       journey,
// // //     });
// // //   } catch (error: any) {
// // //     console.error(' [Activate] Error:', error);
// // //     return NextResponse.json(
// // //       { success: false, error: error.message },
// // //       { status: 500 }
// // //     );
// // //   }
// // // });







// // // app/api/journeys/[id]/activate/route.ts
// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@supabase/supabase-js';
// // import type { Database } from '@/types/database';

// // const supabase = createClient<Database>(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // /**
// //  * POST /api/journeys/[journeyId]/activate
// //  * Activate a journey
// //  */
// // export async function POST(
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

// //     // Verify ownership and get journey
// //     const { data: journey, error: checkError } = await supabase
// //       .from('journeys')
// //       .select('*, flow_definition')
// //       .eq('id', journeyId)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (checkError || !journey) {
// //       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
// //     }

// //     // Validate flow definition
// //     const flowDef = journey.flow_definition as any;
// //     if (!flowDef || !flowDef.nodes || flowDef.nodes.length === 0) {
// //       return NextResponse.json({ 
// //         error: 'Journey must have at least one step before activation' 
// //       }, { status: 400 });
// //     }

// //     // Check for required paths in condition nodes
// //     const conditionNodes = flowDef.nodes.filter((n: any) => n.type === 'condition');
// //     for (const node of conditionNodes) {
// //       const edges = flowDef.edges.filter((e: any) => e.from === node.id);
// //       const hasYes = edges.some((e: any) => e.type === 'yes');
// //       const hasNo = edges.some((e: any) => e.type === 'no');
      
// //       if (!hasYes || !hasNo) {
// //         return NextResponse.json({ 
// //           error: `Condition node "${node.id}" must have both YES and NO paths` 
// //         }, { status: 400 });
// //       }
// //     }

// //     // Activate journey
// //     const { data: updated, error: updateError } = await supabase
// //       .from('journeys')
// //       .update({ 
// //         status: 'active',
// //         updated_at: new Date().toISOString(),
// //       })
// //       .eq('id', journeyId)
// //       .select()
// //       .single();

// //     if (updateError) {
// //       console.error('[API] Error activating journey:', updateError);
// //       return NextResponse.json({ error: 'Failed to activate journey' }, { status: 500 });
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       journey: updated,
// //       message: 'Journey activated successfully',
// //     });

// //   } catch (error: any) {
// //     console.error('[API] Error in POST /api/journeys/[journeyId]/activate:', error);
// //     return NextResponse.json({ error: error.message }, { status: 500 });
// //   }
// // }












// // app/api/journeys/[id]/activate/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// /**
//  * POST /api/journeys/[id]/activate
//  * Activate a journey
//  */
// export async function POST(
//   req: NextRequest,
//   { params }: { params: { id: string } }  // ✅ FIXED: Changed from journeyId to id
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

//     const journeyId = params.id;  // ✅ Get id from params

//     // Verify ownership and get journey
//     const { data: journey, error: checkError } = await supabase
//       .from('journeys')
//       .select('*, flow_definition')
//       .eq('id', journeyId)
//       .eq('user_id', user.id)
//       .single();

//     if (checkError || !journey) {
//       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
//     }

//     // Validate flow definition
//     const flowDef = journey.flow_definition as any;
//     if (!flowDef || !flowDef.nodes || flowDef.nodes.length === 0) {
//       return NextResponse.json({ 
//         error: 'Journey must have at least one step before activation' 
//       }, { status: 400 });
//     }

//     // Check for required paths in condition nodes
//     const conditionNodes = flowDef.nodes.filter((n: any) => n.type === 'condition');
//     for (const node of conditionNodes) {
//       const edges = flowDef.edges.filter((e: any) => e.from === node.id);
//       const hasYes = edges.some((e: any) => e.type === 'yes');
//       const hasNo = edges.some((e: any) => e.type === 'no');
      
//       if (!hasYes || !hasNo) {
//         return NextResponse.json({ 
//           error: `Condition node "${node.id}" must have both YES and NO paths` 
//         }, { status: 400 });
//       }
//     }

//     // Activate journey
//     const { data: updated, error: updateError } = await supabase
//       .from('journeys')
//       .update({ 
//         status: 'active',
//         updated_at: new Date().toISOString(),
//       })
//       .eq('id', journeyId)
//       .select()
//       .single();

//     if (updateError) {
//       console.error('[API] Error activating journey:', updateError);
//       return NextResponse.json({ error: 'Failed to activate journey' }, { status: 500 });
//     }

//     return NextResponse.json({
//       success: true,
//       journey: updated,
//       message: 'Journey activated successfully',
//     });

//   } catch (error: any) {
//     console.error('[API] Error in POST /api/journeys/[id]/activate:', error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }















// app/api/journeys/[id]/activate/route.ts - Next.js 15 Compatible
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/journeys/[id]/activate
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ✅ Next.js 15: params is a Promise
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

    const { id: journeyId } = await params;  // ✅ Await params

    // Verify ownership and get journey
    const { data: journey, error: checkError } = await supabase
      .from('journeys')
      .select('*, flow_definition')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (checkError || !journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // Validate flow definition
    const flowDef = journey.flow_definition as any;
    if (!flowDef || !flowDef.nodes || flowDef.nodes.length === 0) {
      return NextResponse.json({ 
        error: 'Journey must have at least one step before activation' 
      }, { status: 400 });
    }

    // Check for required paths in condition nodes
    const conditionNodes = flowDef.nodes.filter((n: any) => n.type === 'condition');
    for (const node of conditionNodes) {
      const edges = flowDef.edges.filter((e: any) => e.from === node.id);
      const hasYes = edges.some((e: any) => e.type === 'yes');
      const hasNo = edges.some((e: any) => e.type === 'no');
      
      if (!hasYes || !hasNo) {
        return NextResponse.json({ 
          error: `Condition node "${node.id}" must have both YES and NO paths` 
        }, { status: 400 });
      }
    }

    // Activate journey
    const { data: updated, error: updateError } = await supabase
      .from('journeys')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', journeyId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error activating journey:', updateError);
      return NextResponse.json({ error: 'Failed to activate journey' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      journey: updated,
      message: 'Journey activated successfully',
    });

  } catch (error: any) {
    console.error('[API] Error in POST /api/journeys/[id]/activate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}