// // // app/api/journeys/[id]/route.ts - Next.js 15 Compatible
// // import { NextRequest, NextResponse } from 'next/server';
// // import { createClient } from '@supabase/supabase-js';
// // import type { Database } from '@/types/database';

// // const supabase = createClient<Database>(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // /**
// //  * GET /api/journeys/[id]
// //  */
// // export async function GET(
// //   req: NextRequest,
// //   { params }: { params: Promise<{ id: string }> }  // ✅ Next.js 15: params is a Promise
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

// //     const { id: journeyId } = await params;  // ✅ Await params

// //     const { data: journey, error } = await supabase
// //       .from('journeys')
// //       .select(`
// //         *,
// //         website:websites!journeys_website_id_fkey(id, name, domain)
// //       `)
// //       .eq('id', journeyId)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (error || !journey) {
// //       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       journey,
// //     });

// //   } catch (error: any) {
// //     console.error('[API] Error in GET /api/journeys/[id]:', error);
// //     return NextResponse.json({ error: error.message }, { status: 500 });
// //   }
// // }

// // /**
// //  * PUT /api/journeys/[id]
// //  */
// // export async function PUT(
// //   req: NextRequest,
// //   { params }: { params: Promise<{ id: string }> }  // ✅ Next.js 15: params is a Promise
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

// //     const { id: journeyId } = await params;  // ✅ Await params
// //     const body = await req.json();

// //     // Verify ownership
// //     const { data: existing, error: checkError } = await supabase
// //       .from('journeys')
// //       .select('id, status')
// //       .eq('id', journeyId)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (checkError || !existing) {
// //       return NextResponse.json({ error: 'Journey not found or access denied' }, { status: 404 });
// //     }

// //     // Prepare update data
// //     const allowedFields = [
// //       'name',
// //       'description',
// //       'status',
// //       'entry_trigger',
// //       'flow_definition',
// //       'exit_rules',
// //       're_entry_settings',
// //       'settings',
// //     ];

// //     const updates: any = {
// //       updated_at: new Date().toISOString(),
// //     };

// //     for (const field of allowedFields) {
// //       if (field in body) {
// //         updates[field] = body[field];
// //       }
// //     }

// //     // Handle goal separately if provided
// //     if (body.goal) {
// //       updates.settings = {
// //         ...(body.settings || {}),
// //         goal: body.goal,
// //       };
// //     }

// //     // Update journey
// //     const { data: journey, error: updateError } = await supabase
// //       .from('journeys')
// //       .update(updates)
// //       .eq('id', journeyId)
// //       .select()
// //       .single();

// //     if (updateError) {
// //       console.error('[API] Error updating journey:', updateError);
// //       return NextResponse.json({ error: 'Failed to update journey' }, { status: 500 });
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       journey,
// //       message: 'Journey updated successfully',
// //     });

// //   } catch (error: any) {
// //     console.error('[API] Error in PUT /api/journeys/[id]:', error);
// //     return NextResponse.json({ error: error.message }, { status: 500 });
// //   }
// // }

// // /**
// //  * DELETE /api/journeys/[id]
// //  */
// // export async function DELETE(
// //   req: NextRequest,
// //   { params }: { params: Promise<{ id: string }> }  // ✅ Next.js 15: params is a Promise
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

// //     const { id: journeyId } = await params;  // ✅ Await params

// //     console.log('[DELETE] Attempting to delete journey:', journeyId, 'for user:', user.id);

// //     // Verify ownership and get status
// //     const { data: journey, error: checkError } = await supabase
// //       .from('journeys')
// //       .select('id, status, total_active')
// //       .eq('id', journeyId)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (checkError || !journey) {
// //       console.error('[DELETE] Journey not found:', journeyId);
// //       return NextResponse.json({ error: 'Journey not found or access denied' }, { status: 404 });
// //     }

// //     console.log('✅ [DELETE] Ownership verified');

// //     // Prevent deletion if active with users in it
// //     if (journey.status === 'active' && journey.total_active && journey.total_active > 0) {
// //       console.log('⚠️ [DELETE] Journey has active users, cannot delete');
// //       return NextResponse.json({ 
// //         error: `Cannot delete active journey with ${journey.total_active} active users. Please pause it first.`,
// //         total_active: journey.total_active,
// //       }, { status: 400 });
// //     }

// //     // Delete journey (CASCADE will handle related records)
// //     const { error: deleteError } = await supabase
// //       .from('journeys')
// //       .delete()
// //       .eq('id', journeyId);

// //     if (deleteError) {
// //       console.error('[DELETE] Error deleting journey:', deleteError);
// //       return NextResponse.json({ error: 'Failed to delete journey' }, { status: 500 });
// //     }

// //     console.log('✅ [DELETE] Journey deleted successfully');

// //     return NextResponse.json({
// //       success: true,
// //       message: 'Journey deleted successfully',
// //     });

// //   } catch (error: any) {
// //     console.error('[API] Error in DELETE /api/journeys/[id]:', error);
// //     return NextResponse.json({ error: error.message }, { status: 500 });
// //   }
// // }










// // app/api/journeys/[id]/route.ts - FIXED VERSION
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// /**
//  * GET /api/journeys/[id]
//  * FIXED: Proper error handling and goal field support
//  */
// export async function GET(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
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

//     const { id: journeyId } = await params;

//     const { data: journey, error } = await supabase
//       .from('journeys')
//       .select(`
//         *,
//         website:websites!journeys_website_id_fkey(id, name, domain)
//       `)
//       .eq('id', journeyId)
//       .eq('user_id', user.id)
//       .single();

//     if (error || !journey) {
//       console.error('[API] Journey not found:', journeyId, error);
//       return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
//     }

//     // Ensure all fields have safe defaults
//     const responseJourney = {
//       ...journey,
//       name: journey.name || '',
//       description: journey.description || '',
//       entry_trigger: journey.entry_trigger || { type: 'event', event_name: '' },
//       flow_definition: journey.flow_definition || { nodes: [], edges: [] },
//       exit_rules: journey.exit_rules || [],
//       re_entry_settings: journey.re_entry_settings || {
//         allow_re_entry: false,
//         cooldown_days: 0,
//         max_entries: 1,
//       },
//       settings: journey.settings || {},
//       // Ensure goal is available at top level for backward compatibility
//       goal: journey.goal || journey.settings?.goal || null,
//     };

//     return NextResponse.json({
//       success: true,
//       journey: responseJourney,
//     });

//   } catch (error: any) {
//     console.error('[API] Error in GET /api/journeys/[id]:', error);
//     return NextResponse.json({ 
//       error: error.message || 'Internal server error',
//       success: false,
//     }, { status: 500 });
//   }
// }

// /**
//  * PUT /api/journeys/[id]
//  * FIXED: Proper goal handling and validation
//  */
// export async function PUT(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
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

//     const { id: journeyId } = await params;
//     const body = await req.json();

//     // Verify ownership
//     const { data: existing, error: checkError } = await supabase
//       .from('journeys')
//       .select('id, status')
//       .eq('id', journeyId)
//       .eq('user_id', user.id)
//       .single();

//     if (checkError || !existing) {
//       return NextResponse.json({ error: 'Journey not found or access denied' }, { status: 404 });
//     }

//     // Prepare update data
//     const allowedFields = [
//       'name',
//       'description',
//       'status',
//       'entry_trigger',
//       'flow_definition',
//       'exit_rules',
//       're_entry_settings',
//       'settings',
//     ];

//     const updates: any = {
//       updated_at: new Date().toISOString(),
//     };

//     for (const field of allowedFields) {
//       if (field in body) {
//         updates[field] = body[field];
//       }
//     }

//     // Handle goal - store in settings for consistency
//     if (body.goal !== undefined) {
//       updates.settings = {
//         ...(body.settings || {}),
//         goal: body.goal,
//       };
//     }

//     console.log('[API] Updating journey:', journeyId, 'with fields:', Object.keys(updates));

//     // Update journey
//     const { data: journey, error: updateError } = await supabase
//       .from('journeys')
//       .update(updates)
//       .eq('id', journeyId)
//       .select()
//       .single();

//     if (updateError) {
//       console.error('[API] Error updating journey:', updateError);
//       return NextResponse.json({ error: 'Failed to update journey' }, { status: 500 });
//     }

//     // Return with goal at top level for consistency
//     const responseJourney = {
//       ...journey,
//       goal: journey.goal || journey.settings?.goal || null,
//     };

//     return NextResponse.json({
//       success: true,
//       journey: responseJourney,
//       message: 'Journey updated successfully',
//     });

//   } catch (error: any) {
//     console.error('[API] Error in PUT /api/journeys/[id]:', error);
//     return NextResponse.json({ 
//       error: error.message || 'Internal server error',
//       success: false,
//     }, { status: 500 });
//   }
// }

// /**
//  * DELETE /api/journeys/[id]
//  * No changes needed - already correct
//  */
// export async function DELETE(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
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

//     const { id: journeyId } = await params;

//     console.log('[DELETE] Attempting to delete journey:', journeyId, 'for user:', user.id);

//     // Verify ownership and get status
//     const { data: journey, error: checkError } = await supabase
//       .from('journeys')
//       .select('id, status, total_active')
//       .eq('id', journeyId)
//       .eq('user_id', user.id)
//       .single();

//     if (checkError || !journey) {
//       console.error('[DELETE] Journey not found:', journeyId);
//       return NextResponse.json({ error: 'Journey not found or access denied' }, { status: 404 });
//     }

//     console.log('✅ [DELETE] Ownership verified');

//     // Prevent deletion if active with users in it
//     if (journey.status === 'active' && journey.total_active && journey.total_active > 0) {
//       console.log('⚠️ [DELETE] Journey has active users, cannot delete');
//       return NextResponse.json({ 
//         error: `Cannot delete active journey with ${journey.total_active} active users. Please pause it first.`,
//         total_active: journey.total_active,
//       }, { status: 400 });
//     }

//     // Delete journey (CASCADE will handle related records)
//     const { error: deleteError } = await supabase
//       .from('journeys')
//       .delete()
//       .eq('id', journeyId);

//     if (deleteError) {
//       console.error('[DELETE] Error deleting journey:', deleteError);
//       return NextResponse.json({ error: 'Failed to delete journey' }, { status: 500 });
//     }

//     console.log('✅ [DELETE] Journey deleted successfully');

//     return NextResponse.json({
//       success: true,
//       message: 'Journey deleted successfully',
//     });

//   } catch (error: any) {
//     console.error('[API] Error in DELETE /api/journeys/[id]:', error);
//     return NextResponse.json({ 
//       error: error.message || 'Internal server error',
//       success: false,
//     }, { status: 500 });
//   }
// }











// app/api/journeys/[id]/route.ts - FINAL FIX
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/journeys/[id]
 * FIXED: Proper TypeScript casting for settings.goal
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: journeyId } = await params;

    const { data: journey, error } = await supabase
      .from('journeys')
      .select(`
        *,
        website:websites!journeys_website_id_fkey(id, name, domain)
      `)
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (error || !journey) {
      console.error('[API] Journey not found:', journeyId, error);
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    // ✅ FIX: Cast settings to proper type
    const settings = (journey.settings || {}) as Record<string, any>;

    // Ensure all fields have safe defaults
    const responseJourney = {
      ...journey,
      name: journey.name || '',
      description: journey.description || '',
      entry_trigger: journey.entry_trigger || { type: 'event', event_name: '' },
      flow_definition: journey.flow_definition || { nodes: [], edges: [] },
      exit_rules: journey.exit_rules || [],
      re_entry_settings: journey.re_entry_settings || {
        allow_re_entry: false,
        cooldown_days: 0,
        max_entries: 1,
      },
      settings,
      // ✅ Now TypeScript knows settings is an object
      goal: settings.goal || null,
    };

    return NextResponse.json({
      success: true,
      journey: responseJourney,
    });

  } catch (error: any) {
    console.error('[API] Error in GET /api/journeys/[id]:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      success: false,
    }, { status: 500 });
  }
}

/**
 * PUT /api/journeys/[id]
 * FIXED: Proper TypeScript casting for settings
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: journeyId } = await params;
    const body = await req.json();

    // Verify ownership
    const { data: existing, error: checkError } = await supabase
      .from('journeys')
      .select('id, status, settings')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Journey not found or access denied' }, { status: 404 });
    }

    // Prepare update data
    const allowedFields = [
      'name',
      'description',
      'status',
      'entry_trigger',
      'flow_definition',
      'exit_rules',
      're_entry_settings',
      'settings',
    ];

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    // ✅ FIX: Handle goal with proper type casting
    if (body.goal !== undefined) {
      const currentSettings = (existing.settings || {}) as Record<string, any>;
      const bodySettings = (body.settings || {}) as Record<string, any>;
      
      updates.settings = {
        ...currentSettings,
        ...bodySettings,
        goal: body.goal,
      };
    }

    console.log('[API] Updating journey:', journeyId, 'with fields:', Object.keys(updates));

    // Update journey
    const { data: journey, error: updateError } = await supabase
      .from('journeys')
      .update(updates)
      .eq('id', journeyId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error updating journey:', updateError);
      return NextResponse.json({ error: 'Failed to update journey' }, { status: 500 });
    }

    // ✅ FIX: Cast settings when reading response
    const journeySettings = (journey.settings || {}) as Record<string, any>;

    // Return with goal at top level for consistency
    const responseJourney = {
      ...journey,
      goal: journeySettings.goal || null,
    };

    return NextResponse.json({
      success: true,
      journey: responseJourney,
      message: 'Journey updated successfully',
    });

  } catch (error: any) {
    console.error('[API] Error in PUT /api/journeys/[id]:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      success: false,
    }, { status: 500 });
  }
}

/**
 * DELETE /api/journeys/[id]
 * No changes needed
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: journeyId } = await params;

    console.log('[DELETE] Attempting to delete journey:', journeyId, 'for user:', user.id);

    // Verify ownership and get status
    const { data: journey, error: checkError } = await supabase
      .from('journeys')
      .select('id, status, total_active')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (checkError || !journey) {
      console.error('[DELETE] Journey not found:', journeyId);
      return NextResponse.json({ error: 'Journey not found or access denied' }, { status: 404 });
    }

    console.log('✅ [DELETE] Ownership verified');

    // Prevent deletion if active with users in it
    if (journey.status === 'active' && journey.total_active && journey.total_active > 0) {
      console.log('⚠️ [DELETE] Journey has active users, cannot delete');
      return NextResponse.json({ 
        error: `Cannot delete active journey with ${journey.total_active} active users. Please pause it first.`,
        total_active: journey.total_active,
      }, { status: 400 });
    }

    // Delete journey (CASCADE will handle related records)
    const { error: deleteError } = await supabase
      .from('journeys')
      .delete()
      .eq('id', journeyId);

    if (deleteError) {
      console.error('[DELETE] Error deleting journey:', deleteError);
      return NextResponse.json({ error: 'Failed to delete journey' }, { status: 500 });
    }

    console.log('✅ [DELETE] Journey deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Journey deleted successfully',
    });

  } catch (error: any) {
    console.error('[API] Error in DELETE /api/journeys/[id]:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      success: false,
    }, { status: 500 });
  }
}