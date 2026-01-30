// // // pages/api/journeys/[id]/archive.ts
// // import { NextApiRequest, NextApiResponse } from 'next';
// // import { createClient } from '@supabase/supabase-js';
// // import type { Database } from '@/types/database';

// // const supabase = createClient<Database>(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // /**
// //  * POST /api/journeys/[id]/archive - Archive a journey
// //  */
// // export default async function handler(
// //   req: NextApiRequest,
// //   res: NextApiResponse
// // ) {
// //   if (req.method !== 'POST') {
// //     return res.status(405).json({ error: 'Method not allowed' });
// //   }

// //   const { id } = req.query;

// //   if (!id || typeof id !== 'string') {
// //     return res.status(400).json({ error: 'Journey ID is required' });
// //   }

// //   // Extract user ID from Authorization header
// //   const authHeader = req.headers.authorization;
// //   if (!authHeader?.startsWith('Bearer ')) {
// //     return res.status(401).json({ error: 'Unauthorized' });
// //   }

// //   const token = authHeader.substring(7);
// //   const { data: { user }, error: authError } = await supabase.auth.getUser(token);

// //   if (authError || !user) {
// //     return res.status(401).json({ error: 'Invalid token' });
// //   }

// //   try {
// //     // Verify journey ownership
// //     const { data: journey, error: fetchError } = await supabase
// //       .from('journeys')
// //       .select('id, status, total_active')
// //       .eq('id', id)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (fetchError || !journey) {
// //       return res.status(404).json({ error: 'Journey not found' });
// //     }

// //     // Check if already archived
// //     if (journey.status === 'archived') {
// //       return res.status(400).json({ error: 'Journey is already archived' });
// //     }

// //     // Prevent archiving if there are active users
// //     if (journey.total_active && journey.total_active > 0) {
// //       return res.status(400).json({
// //         error: `Cannot archive journey with ${journey.total_active} active users. Please wait for them to complete or exit.`,
// //       });
// //     }

// //     // Archive journey
// //     const { data: updatedJourney, error: updateError } = await supabase
// //       .from('journeys')
// //       .update({
// //         status: 'archived',
// //         updated_at: new Date().toISOString(),
// //       })
// //       .eq('id', id)
// //       .select()
// //       .single();

// //     if (updateError) {
// //       throw updateError;
// //     }

// //     console.log(`[Journey ${id}] Archived`);

// //     return res.status(200).json({
// //       success: true,
// //       message: 'Journey archived successfully',
// //       journey: updatedJourney,
// //     });

// //   } catch (error: any) {
// //     console.error('[Journey Archive] Error:', error);
// //     return res.status(500).json({ 
// //       error: error.message || 'Failed to archive journey' 
// //     });
// //   }
// // }


// // app/api/journeys/[id]/archive/route.ts
// /**
//  * POST /api/journeys/[id]/archive
//  * Archive a journey
//  */


// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );
// export async function POST_ARCHIVE(
//   req: NextRequest,
//   { params }: { params: { journeyId: string } }
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

//     const { journeyId } = params;

//     // Verify ownership
//     const { data: journey, error: checkError } = await supabase
//       .from('journeys')
//       .select('id, status, total_active')
//       .eq('id', journeyId)
//       .eq('user_id', user.id)
//       .single();

//     if (checkError || !journey) {
//       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
//     }

//     // Prevent archiving if active users
//     if (journey.total_active && journey.total_active > 0) {
//       return NextResponse.json({ 
//         error: `Cannot archive journey with ${journey.total_active} active users. Please pause and wait for completion.`,
//         total_active: journey.total_active,
//       }, { status: 400 });
//     }

//     // Archive journey
//     const { data: updated, error: updateError } = await supabase
//       .from('journeys')
//       .update({ 
//         status: 'archived',
//         updated_at: new Date().toISOString(),
//       })
//       .eq('id', journeyId)
//       .select()
//       .single();

//     if (updateError) {
//       console.error('[API] Error archiving journey:', updateError);
//       return NextResponse.json({ error: 'Failed to archive journey' }, { status: 500 });
//     }

//     return NextResponse.json({
//       success: true,
//       journey: updated,
//       message: 'Journey archived successfully',
//     });

//   } catch (error: any) {
//     console.error('[API] Error in POST /api/journeys/[id]/archive:', error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }









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
