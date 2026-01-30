// // // // // pages/api/journeys/[id]/duplicate.ts
// // // // import { NextApiRequest, NextApiResponse } from 'next';
// // // // import { createClient } from '@supabase/supabase-js';
// // // // import type { Database } from '@/types/database';

// // // // const supabase = createClient<Database>(
// // // //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // // //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // // // );

// // // // /**
// // // //  * POST /api/journeys/[id]/duplicate - Duplicate a journey
// // // //  */
// // // // export default async function handler(
// // // //   req: NextApiRequest,
// // // //   res: NextApiResponse
// // // // ) {
// // // //   if (req.method !== 'POST') {
// // // //     return res.status(405).json({ error: 'Method not allowed' });
// // // //   }

// // // //   const { id } = req.query;

// // // //   if (!id || typeof id !== 'string') {
// // // //     return res.status(400).json({ error: 'Journey ID is required' });
// // // //   }

// // // //   // Extract user ID from Authorization header
// // // //   const authHeader = req.headers.authorization;
// // // //   if (!authHeader?.startsWith('Bearer ')) {
// // // //     return res.status(401).json({ error: 'Unauthorized' });
// // // //   }

// // // //   const token = authHeader.substring(7);
// // // //   const { data: { user }, error: authError } = await supabase.auth.getUser(token);

// // // //   if (authError || !user) {
// // // //     return res.status(401).json({ error: 'Invalid token' });
// // // //   }

// // // //   try {
// // // //     // Fetch the journey to duplicate
// // // //     const { data: journey, error: fetchError } = await supabase
// // // //       .from('journeys')
// // // //       .select('*')
// // // //       .eq('id', id)
// // // //       .eq('user_id', user.id)
// // // //       .single();

// // // //     if (fetchError || !journey) {
// // // //       return res.status(404).json({ error: 'Journey not found' });
// // // //     }

// // // //     // Create duplicate with modified name
// // // //     const duplicateName = `${journey.name} (Copy)`;
    
// // // //     const { data: duplicateJourney, error: createError } = await supabase
// // // //       .from('journeys')
// // // //       .insert({
// // // //         website_id: journey.website_id,
// // // //         user_id: user.id,
// // // //         name: duplicateName,
// // // //         description: journey.description,
// // // //         entry_trigger: journey.entry_trigger,
// // // //         flow_definition: journey.flow_definition,
// // // //         exit_rules: journey.exit_rules,
// // // //         re_entry_settings: journey.re_entry_settings,
// // // //         settings: journey.settings,
// // // //         status: 'draft', // Always create duplicates as draft
// // // //         total_entered: 0,
// // // //         total_active: 0,
// // // //         total_completed: 0,
// // // //       })
// // // //       .select()
// // // //       .single();

// // // //     if (createError) {
// // // //       throw createError;
// // // //     }

// // // //     console.log(`[Journey ${id}] Duplicated to ${duplicateJourney.id}`);

// // // //     return res.status(201).json({
// // // //       success: true,
// // // //       message: 'Journey duplicated successfully',
// // // //       journey: duplicateJourney,
// // // //     });

// // // //   } catch (error: any) {
// // // //     console.error('[Journey Duplicate] Error:', error);
// // // //     return res.status(500).json({ 
// // // //       error: error.message || 'Failed to duplicate journey' 
// // // //     });
// // // //   }
// // // // }



// // // // app/api/journeys/[id]/duplicate/route.ts
// // // /**
// // //  * POST /api/journeys/[journeyId]/duplicate
// // //  * Duplicate a journey
// // //  */

// // // import { NextRequest, NextResponse } from 'next/server';
// // // import { createClient } from '@supabase/supabase-js';
// // // import type { Database } from '@/types/database';

// // // const supabase = createClient<Database>(
// // //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // // );
// // // export async function POST_DUPLICATE(
// // //   req: NextRequest,
// // //   { params }: { params: { journeyId: string } }
// // // ) {
// // //   try {
// // //     const authHeader = req.headers.get('authorization');
// // //     if (!authHeader) {
// // //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// // //     }

// // //     const token = authHeader.replace('Bearer ', '');
// // //     const { data: { user }, error: authError } = await supabase.auth.getUser(token);

// // //     if (authError || !user) {
// // //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// // //     }

// // //     const { journeyId } = params;

// // //     // Get original journey
// // //     const { data: original, error: fetchError } = await supabase
// // //       .from('journeys')
// // //       .select('*')
// // //       .eq('id', journeyId)
// // //       .eq('user_id', user.id)
// // //       .single();

// // //     if (fetchError || !original) {
// // //       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
// // //     }

// // //     // Create duplicate
// // //     const { data: duplicate, error: createError } = await supabase
// // //       .from('journeys')
// // //       .insert({
// // //         user_id: user.id,
// // //         website_id: original.website_id,
// // //         name: `${original.name} (Copy)`,
// // //         description: original.description,
// // //         status: 'draft', // Always start as draft
// // //         entry_trigger: original.entry_trigger,
// // //         flow_definition: original.flow_definition,
// // //         exit_rules: original.exit_rules,
// // //         re_entry_settings: original.re_entry_settings,
// // //         settings: original.settings,
// // //         total_entered: 0, // Reset stats
// // //         total_active: 0,
// // //         total_completed: 0,
// // //       })
// // //       .select()
// // //       .single();

// // //     if (createError) {
// // //       console.error('[API] Error duplicating journey:', createError);
// // //       return NextResponse.json({ error: 'Failed to duplicate journey' }, { status: 500 });
// // //     }

// // //     return NextResponse.json({
// // //       success: true,
// // //       journey: duplicate,
// // //       message: 'Journey duplicated successfully',
// // //     }, { status: 201 });

// // //   } catch (error: any) {
// // //     console.error('[API] Error in POST /api/journeys/[journeyId]/duplicate:', error);
// // //     return NextResponse.json({ error: error.message }, { status: 500 });
// // //   }
// // // }
























// // // app/api/journeys/[id]/duplicate/route.ts
// // /**
// //  * POST /api/journeys/[id]/duplicate
// //  * Duplicate a journey
// //  */

// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@supabase/supabase-js';
// // import type { Database } from '@/types/database';

// // const supabase = createClient<Database>(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // export async function POST(
// //   req: NextRequest,
// //   { params }: { params: { id: string } }  //  FIXED: Changed from journeyId to id
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

// //     const journeyId = params.id;  //  Get id from params

// //     // Get original journey
// //     const { data: original, error: fetchError } = await supabase
// //       .from('journeys')
// //       .select('*')
// //       .eq('id', journeyId)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (fetchError || !original) {
// //       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
// //     }

// //     // Create duplicate
// //     const { data: duplicate, error: createError } = await supabase
// //       .from('journeys')
// //       .insert({
// //         user_id: user.id,
// //         website_id: original.website_id,
// //         name: `${original.name} (Copy)`,
// //         description: original.description,
// //         status: 'draft', // Always start as draft
// //         entry_trigger: original.entry_trigger,
// //         flow_definition: original.flow_definition,
// //         exit_rules: original.exit_rules,
// //         re_entry_settings: original.re_entry_settings,
// //         settings: original.settings,
// //         total_entered: 0, // Reset stats
// //         total_active: 0,
// //         total_completed: 0,
// //       })
// //       .select()
// //       .single();

// //     if (createError) {
// //       console.error('[API] Error duplicating journey:', createError);
// //       return NextResponse.json({ error: 'Failed to duplicate journey' }, { status: 500 });
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       journey: duplicate,
// //       message: 'Journey duplicated successfully',
// //     }, { status: 201 });

// //   } catch (error: any) {
// //     console.error('[API] Error in POST /api/journeys/[id]/duplicate:', error);
// //     return NextResponse.json({ error: error.message }, { status: 500 });
// //   }
// // }





















// // app/api/journeys/[id]/duplicate/route.ts - Next.js 15 Compatible
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// /**
//  * POST /api/journeys/[id]/duplicate
//  */
// export async function POST(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }  //  Next.js 15: params is a Promise
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

//     const { id: journeyId } = await params;  //  Await params

//     // Get original journey
//     const { data: original, error: fetchError } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('id', journeyId)
//       .eq('user_id', user.id)
//       .single();

//     if (fetchError || !original) {
//       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
//     }

//     // Create duplicate
//     const { data: duplicate, error: createError } = await supabase
//       .from('journeys')
//       .insert({
//         user_id: user.id,
//         website_id: original.website_id,
//         name: `${original.name} (Copy)`,
//         description: original.description,
//         status: 'draft', // Always start as draft
//         entry_trigger: original.entry_trigger,
//         flow_definition: original.flow_definition,
//         exit_rules: original.exit_rules,
//         re_entry_settings: original.re_entry_settings,
//         settings: original.settings,
//         total_entered: 0, // Reset stats
//         total_active: 0,
//         total_completed: 0,
//       })
//       .select()
//       .single();

//     if (createError) {
//       console.error('[API] Error duplicating journey:', createError);
//       return NextResponse.json({ error: 'Failed to duplicate journey' }, { status: 500 });
//     }

//     return NextResponse.json({
//       success: true,
//       journey: duplicate,
//       message: 'Journey duplicated successfully',
//     }, { status: 201 });

//   } catch (error: any) {
//     console.error('[API] Error in POST /api/journeys/[id]/duplicate:', error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }




















// app/api/journeys/[id]/duplicate/route.ts - Next.js 15 Compatible
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/journeys/[id]/duplicate
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

    // Get original journey
    const { data: original, error: fetchError } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // Create duplicate
    const { data: duplicate, error: createError } = await supabase
      .from('journeys')
      .insert({
        user_id: user.id,
        website_id: original.website_id,
        name: `${original.name} (Copy)`,
        description: original.description,
        status: 'draft', // Always start as draft
        entry_trigger: original.entry_trigger,
        flow_definition: original.flow_definition,
        exit_rules: original.exit_rules,
        re_entry_settings: original.re_entry_settings,
        settings: original.settings,
        total_entered: 0, // Reset stats
        total_active: 0,
        total_completed: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('[API] Error duplicating journey:', createError);
      return NextResponse.json({ error: 'Failed to duplicate journey' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      journey: duplicate,
      message: 'Journey duplicated successfully',
    }, { status: 201 });

  } catch (error: any) {
    console.error('[API] Error in POST /api/journeys/[id]/duplicate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}