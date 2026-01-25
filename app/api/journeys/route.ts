// // backend/app/api/journeys/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import { journeyProcessor } from '@/lib/journeys/processor';

// const supabase = createClient(
//  process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// );

// // GET /api/journeys - List journeys
// export async function GET(request: NextRequest) {
//   try {
//     const userId = request.headers.get('x-user-id'); // From auth middleware
//     const websiteId = request.nextUrl.searchParams.get('website_id');

//     if (!userId) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     let query = supabase
//       .from('journeys')
//       .select('*')
//       .eq('user_id', userId)
//       .order('created_at', { ascending: false });

//     if (websiteId) {
//       query = query.eq('website_id', websiteId);
//     }

//     const { data, error } = await query;

//     if (error) throw error;

//     // Trigger opportunistic processing
//     journeyProcessor.processDueSteps().catch(console.error);

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
// }

// // POST /api/journeys - Create journey
// export async function POST(request: NextRequest) {
//   try {
//     const userId = request.headers.get('x-user-id');
//     if (!userId) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

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
//       .eq('user_id', userId)
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
//         user_id: userId,
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
// }

// // ============================================
// // backend/app/api/journeys/[journeyId]/route.ts
// // ============================================

// // GET /api/journeys/:id - Get single journey
// export async function GET_SINGLE(
//   request: NextRequest,
//   { params }: { params: { journeyId: string } }
// ) {
//   try {
//     const userId = request.headers.get('x-user-id');
//     if (!userId) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { data: journey, error } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('id', params.journeyId)
//       .eq('user_id', userId)
//       .single();

//     if (error || !journey) {
//       return NextResponse.json(
//         { error: 'Journey not found' },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       journey,
//     });
//   } catch (error: any) {
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// }

// // PUT /api/journeys/:id - Update journey
// export async function PUT(
//   request: NextRequest,
//   { params }: { params: { journeyId: string } }
// ) {
//   try {
//     const userId = request.headers.get('x-user-id');
//     if (!userId) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const body = await request.json();
//     const {
//       name,
//       description,
//       entry_trigger,
//       flow_definition,
//       settings,
//       status,
//     } = body;

//     // Verify ownership
//     const { data: existing } = await supabase
//       .from('journeys')
//       .select('id')
//       .eq('id', params.journeyId)
//       .eq('user_id', userId)
//       .single();

//     if (!existing) {
//       return NextResponse.json(
//         { error: 'Journey not found' },
//         { status: 404 }
//       );
//     }

//     // Update journey
//     const updates: any = { updated_at: new Date().toISOString() };
//     if (name) updates.name = name;
//     if (description !== undefined) updates.description = description;
//     if (entry_trigger) updates.entry_trigger = entry_trigger;
//     if (flow_definition) updates.flow_definition = flow_definition;
//     if (settings) updates.settings = settings;
//     if (status) updates.status = status;

//     const { data: journey, error } = await supabase
//       .from('journeys')
//       .update(updates)
//       .eq('id', params.journeyId)
//       .select()
//       .single();

//     if (error) throw error;

//     return NextResponse.json({
//       success: true,
//       journey,
//     });
//   } catch (error: any) {
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// }

// // DELETE /api/journeys/:id - Delete journey
// export async function DELETE(
//   request: NextRequest,
//   { params }: { params: { journeyId: string } }
// ) {
//   try {
//     const userId = request.headers.get('x-user-id');
//     if (!userId) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // Verify ownership
//     const { data: existing } = await supabase
//       .from('journeys')
//       .select('id')
//       .eq('id', params.journeyId)
//       .eq('user_id', userId)
//       .single();

//     if (!existing) {
//       return NextResponse.json(
//         { error: 'Journey not found' },
//         { status: 404 }
//       );
//     }

//     // Delete journey (cascade will handle user_journey_states)
//     const { error } = await supabase
//       .from('journeys')
//       .delete()
//       .eq('id', params.journeyId);

//     if (error) throw error;

//     return NextResponse.json({
//       success: true,
//       message: 'Journey deleted',
//     });
//   } catch (error: any) {
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// }

// backend/app/api/journeys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { journeyProcessor } from '@/lib/journeys/processor';
import { withAuth, AuthUser } from '@/lib/auth-middleware'; // 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// GET /api/journeys - List journeys
export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    const websiteId = request.nextUrl.searchParams.get('website_id');

    let query = supabase
      .from('journeys')
      .select('*')
      .eq('user_id', user.id) // Use user.id from withAuth
      .order('created_at', { ascending: false });

    if (websiteId) {
      query = query.eq('website_id', websiteId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Trigger opportunistic processing (already handled by withAuth now)
    // journeyProcessor.processDueSteps().catch(console.error);

    return NextResponse.json({
      success: true,
      journeys: data || [],
    });
  } catch (error: any) {
    console.error('Error listing journeys:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});

// POST /api/journeys - Create journey
export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    const body = await request.json();
    const {
      website_id,
      name,
      description,
      entry_trigger,
      flow_definition,
      settings,
    } = body;

    // Validate required fields
    if (!website_id || !name || !entry_trigger || !flow_definition) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify website belongs to user
    const { data: website } = await supabase
      .from('websites')
      .select('id')
      .eq('id', website_id)
      .eq('user_id', user.id) // Use user.id from withAuth
      .single();

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Create journey
    const { data: journey, error } = await supabase
      .from('journeys')
      .insert({
        user_id: user.id, // Use user.id from withAuth
        website_id,
        name,
        description,
        entry_trigger,
        flow_definition,
        settings: settings || {},
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      journey,
    });
  } catch (error: any) {
    console.error('Error creating journey:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});