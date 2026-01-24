// // ============================================
// // FILE: app/api/journeys/[id]/duplicate/route.ts
// // Duplicate a journey
// // ============================================

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import { withAuth, type AuthUser } from '@/lib/auth-middleware';
// import type { Database } from '@/types/database';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// async function handleDuplicate(
//   req: NextRequest,
//   user: AuthUser,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const { data: existingJourney } = await supabase
//       .from('journeys')
//       .select('*, websites!inner(user_id)')
//       .eq('id', params.id)
//       .single();

//     const journeyData = existingJourney as any;

//     if (!existingJourney || journeyData.websites?.user_id !== user.id) {
//       return NextResponse.json(
//         { success: false, error: 'Journey not found' },
//         { status: 404 }
//       );
//     }

//     // Create duplicate with modified name
//     const { data: newJourney, error } = await supabase
//       .from('journeys')
//       .insert({
//         website_id: existingJourney.website_id,
//         user_id: user.id,
//         name: `${existingJourney.name} (Copy)`,
//         description: existingJourney.description,
//         entry_trigger: existingJourney.entry_trigger,
//         flow_definition: existingJourney.flow_definition,
//         settings: existingJourney.settings,
//         status: 'draft',
//       })
//       .select()
//       .single();

//     if (error) throw error;

//     return NextResponse.json({
//       success: true,
//       journey: newJourney,
//       message: 'Journey duplicated successfully',
//     });
//   } catch (error: any) {
//     console.error('[Journeys] Duplicate error:', error);
//     return NextResponse.json(
//       { success: false, error: error.message || 'Failed to duplicate journey' },
//       { status: 500 }
//     );
//   }
// }

// export const POST = withAuth(handleDuplicate);

// app/api/journeys/[id]/duplicate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, type AuthUser } from '@/lib/auth-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/journeys/[id]/duplicate - Duplicate journey
export const POST = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const journeyId = params.id;

      console.log('[Journey Duplicate] Duplicating journey:', journeyId);

      // Fetch original journey
      const { data: original, error: fetchError } = await supabase
        .from('journeys')
        .select(`
          *,
          websites!inner(id, user_id)
        `)
        .eq('id', journeyId)
        .eq('websites.user_id', user.id)
        .single();

      if (fetchError || !original) {
        return NextResponse.json(
          { success: false, error: 'Journey not found or access denied' },
          { status: 404 }
        );
      }

      // Create duplicate
      const { data: duplicate, error } = await supabase
        .from('journeys')
        .insert({
          website_id: original.website_id,
          user_id: user.id,
          name: `${original.name} (Copy)`,
          description: original.description,
          entry_trigger: original.entry_trigger,
          flow_definition: original.flow_definition,
          settings: original.settings,
          status: 'draft',
        })
        .select()
        .single();

      if (error) {
        console.error('[Journey Duplicate] Error:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      console.log('[Journey Duplicate] Duplicated successfully');

      return NextResponse.json({
        success: true,
        journey: duplicate,
        message: 'Journey duplicated successfully',
      });
    } catch (error: any) {
      console.error('[Journey Duplicate] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to duplicate journey' },
        { status: 500 }
      );
    }
  }
);

