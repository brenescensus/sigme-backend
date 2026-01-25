// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import { withAuth, AuthUser } from '@/lib/auth-middleware';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// );

// export const POST = withAuth(async (
//   request: NextRequest,
//   user: AuthUser,
//   { params }: { params: { journeyId: string } }
// ) => {
//   try {
//     // Get original journey
//     const { data: original, error: fetchError } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('id', params.journeyId)
//       .eq('user_id', user.id)
//       .single();

//     if (fetchError || !original) {
//       return NextResponse.json(
//         { error: 'Journey not found' },
//         { status: 404 }
//       );
//     }

//     // Create duplicate
//     const { data: duplicate, error: createError } = await supabase
//       .from('journeys')
//       .insert({
//         user_id: user.id,
//         website_id: original.website_id,
//         name: `${original.name} (Copy)`,
//         description: original.description,
//         entry_trigger: original.entry_trigger,
//         flow_definition: original.flow_definition,
//         settings: original.settings,
//         status: 'draft',
//       })
//       .select()
//       .single();

//     if (createError) throw createError;

//     return NextResponse.json({
//       success: true,
//       journey: duplicate,
//     });
//   } catch (error: any) {
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// });
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

    // Get original journey
    const { data: original, error: fetchError } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json(
        { error: 'Journey not found or access denied' },
        { status: 404 }
      );
    }

    // Create duplicate
    const { data: duplicate, error: createError } = await supabase
      .from('journeys')
      .insert({
        user_id: user.id,
        website_id: original.website_id,
        name: `${original.name} (Copy)`,
        description: original.description,
        entry_trigger: original.entry_trigger,
        flow_definition: original.flow_definition,
        settings: original.settings,
        status: 'draft',
      })
      .select()
      .single();

    if (createError) throw createError;

    return NextResponse.json({
      success: true,
      journey: duplicate,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});