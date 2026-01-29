// // backend/app/api/journeys/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import { journeyProcessor } from '@/lib/journeys/processor';
// import { withAuth, AuthUser } from '@/lib/auth-middleware'; // 

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// );

// // GET /api/journeys - List journeys
// export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
//   try {
//     const websiteId = request.nextUrl.searchParams.get('website_id');

//     let query = supabase
//       .from('journeys')
//       .select('*')
//       .eq('user_id', user.id) // Use user.id from withAuth
//       .order('created_at', { ascending: false });

//     if (websiteId) {
//       query = query.eq('website_id', websiteId);
//     }

//     const { data, error } = await query;

//     if (error) throw error;

//     // Trigger opportunistic processing (already handled by withAuth now)
//     // journeyProcessor.processDueSteps().catch(console.error);

//     return NextResponse.json({
//       success: true,
//       journeys: data || [],
//     });
//   } catch (error: any) {
//     console.error('Error listing journeys:', error);
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// });

// // POST /api/journeys - Create journey
// export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
//   try {
//     const body = await request.json();
//     const {
//       website_id,
//       name,
//       description,
//       entry_trigger,
//       flow_definition,
//       settings,
//     } = body;

//     // Validate required fields
//     if (!website_id || !name || !entry_trigger || !flow_definition) {
//       return NextResponse.json(
//         { error: 'Missing required fields' },
//         { status: 400 }
//       );
//     }

//     // Verify website belongs to user
//     const { data: website } = await supabase
//       .from('websites')
//       .select('id')
//       .eq('id', website_id)
//       .eq('user_id', user.id) // Use user.id from withAuth
//       .single();

//     if (!website) {
//       return NextResponse.json(
//         { error: 'Website not found' },
//         { status: 404 }
//       );
//     }

//     // Create journey
//     const { data: journey, error } = await supabase
//       .from('journeys')
//       .insert({
//         user_id: user.id, // Use user.id from withAuth
//         website_id,
//         name,
//         description,
//         entry_trigger,
//         flow_definition,
//         settings: settings || {},
//         status: 'draft',
//       })
//       .select()
//       .single();

//     if (error) throw error;

//     return NextResponse.json({
//       success: true,
//       journey,
//     });
//   } catch (error: any) {
//     console.error('Error creating journey:', error);
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// });



// app/api/journeys/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withAuth, AuthUser } from '@/lib/auth-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/journeys
 * List all journeys for a website with calculated stats
 * 
 * Query params:
 * - website_id: Required - The website ID to filter journeys
 * 
 * Returns:
 * {
 *   success: true,
 *   journeys: [
 *     {
 *       id: "uuid",
 *       name: "Journey name",
 *       total_entered: 2,
 *       total_active: 1,
 *       total_completed: 1,
 *       ...
 *     }
 *   ]
 * }
 */
export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('website_id');

    if (!websiteId) {
      return NextResponse.json(
        { success: false, error: 'website_id is required' },
        { status: 400 }
      );
    }

    console.log('📋 [Journeys] Fetching journeys for website:', websiteId);
    console.log('👤 [Journeys] User:', user.id);

    // Fetch journeys
    const { data: journeys, error: journeysError } = await supabase
      .from('journeys')
      .select('*')
      .eq('website_id', websiteId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (journeysError) {
      console.error('❌ [Journeys] Error fetching journeys:', journeysError);
      throw journeysError;
    }

    if (!journeys || journeys.length === 0) {
      console.log('📭 [Journeys] No journeys found');
      return NextResponse.json({
        success: true,
        journeys: [],
      });
    }

    console.log(`📊 [Journeys] Found ${journeys.length} journeys, calculating stats...`);

    // Calculate stats for each journey by querying user_journey_states
    const journeysWithStats = await Promise.all(
      journeys.map(async (journey) => {
        try {
          // Fetch all user states for this journey
          const { data: states, error: statesError } = await supabase
            .from('user_journey_states')
            .select('id, status')
            .eq('journey_id', journey.id);

          if (statesError) {
            console.error(`❌ [Journeys] Error fetching states for journey ${journey.id}:`, statesError);
            // Return journey with default stats if query fails
            return {
              ...journey,
              total_entered: 0,
              total_active: 0,
              total_completed: 0,
              total_exited: 0,
            };
          }

          // Calculate stats
          const allStates = states || [];
          const total_entered = allStates.filter(s => s.status !== 'exited').length;
          const total_active = allStates.filter(s => ['active', 'waiting'].includes(s.status)).length;
          const total_completed = allStates.filter(s => s.status === 'completed').length;
          const total_exited = allStates.filter(s => s.status === 'exited').length;

          console.log(`  📊 ${journey.name}:`, {
            entered: total_entered,
            active: total_active,
            completed: total_completed,
            exited: total_exited,
          });

          return {
            ...journey,
            total_entered,
            total_active,
            total_completed,
            total_exited,
          };
        } catch (error) {
          console.error(`❌ [Journeys] Error calculating stats for journey ${journey.id}:`, error);
          // Return journey with default stats on error
          return {
            ...journey,
            total_entered: 0,
            total_active: 0,
            total_completed: 0,
            total_exited: 0,
          };
        }
      })
    );

    console.log(`✅ [Journeys] Successfully calculated stats for ${journeysWithStats.length} journeys`);

    return NextResponse.json({
      success: true,
      journeys: journeysWithStats,
    });
  } catch (error: any) {
    console.error('❌ [Journeys] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch journeys',
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/journeys
 * Create a new journey
 */
export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    const body = await request.json();
    const {
      website_id,
      name,
      description,
      entry_trigger,
      flow_definition,
      exit_rules,
      re_entry_settings,
      settings,
    } = body;

    // Validation
    if (!website_id || !name || !entry_trigger || !flow_definition) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: website_id, name, entry_trigger, flow_definition',
        },
        { status: 400 }
      );
    }

    console.log('📝 [Journeys] Creating journey:', name);

    // Create journey
    const { data: journey, error } = await supabase
      .from('journeys')
      .insert({
        website_id,
        user_id: user.id,
        name,
        description: description || null,
        entry_trigger,
        flow_definition,
        exit_rules: exit_rules || null,
        re_entry_settings: re_entry_settings || null,
        settings: settings || null,
        status: 'draft',
        total_entered: 0,
        total_active: 0,
        total_completed: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [Journeys] Error creating journey:', error);
      throw error;
    }

    console.log('✅ [Journeys] Journey created:', journey.id);

    return NextResponse.json({
      success: true,
      journey,
    });
  } catch (error: any) {
    console.error('❌ [Journeys] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create journey',
      },
      { status: 500 }
    );
  }
});