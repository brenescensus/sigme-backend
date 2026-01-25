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
//   context: { params: Promise<{ id: string }> }  // ✅ params is a Promise
// ) => {
//   try {
//     const params = await context.params;  // ✅ Await it first
//     const journeyId = params.id;
    
//     console.log('🚀 [Activate] Journey ID:', journeyId);
//     console.log('🚀 [Activate] User ID:', user.id);

//     // First, check if journey exists
//     const { data: existingJourney, error: fetchError } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('id', journeyId)
//       .single();

//     console.log('🔍 [Activate] Existing journey:', existingJourney);
//     console.log('🔍 [Activate] Fetch error:', fetchError);

//     if (fetchError || !existingJourney) {
//       return NextResponse.json(
//         { 
//           error: 'Journey not found',
//           journeyId,
//           details: fetchError 
//         },
//         { status: 404 }
//       );
//     }

//     // Check ownership
//     if (existingJourney.user_id !== user.id) {
//       return NextResponse.json(
//         { 
//           error: 'Access denied - Journey belongs to different user',
//           journeyUserId: existingJourney.user_id,
//           currentUserId: user.id
//         },
//         { status: 403 }
//       );
//     }

//     // Update status to active
//     const { data: journey, error } = await supabase
//       .from('journeys')
//       .update({ status: 'active' })
//       .eq('id', journeyId)
//       .eq('user_id', user.id)
//       .select()
//       .single();

//     console.log('✅ [Activate] Update result:', { journey, error });

//     if (error || !journey) {
//       return NextResponse.json(
//         { 
//           error: 'Failed to activate journey',
//           details: error 
//         },
//         { status: 500 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       journey,
//     });
//   } catch (error: any) {
//     console.error('❌ [Activate] Error:', error);
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
      console.error('❌ [Activate] Error:', error);
      return NextResponse.json(
        { error: 'Journey not found or access denied' },
        { status: 404 }
      );
    }

    console.log('✅ [Activate] Journey activated:', journey.name);

    return NextResponse.json({
      success: true,
      journey,
    });
  } catch (error: any) {
    console.error('❌ [Activate] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});