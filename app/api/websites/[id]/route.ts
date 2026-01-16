// // Individual website operations
// // ============================================================

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';

// interface RouteParams {
//   params: {
//     id: string;
//   };
// }

// // GET - Get specific website
// export async function GET(req: NextRequest, { params }: RouteParams) {
//   try {
//     const supabase = await createClient();


//     const { data: { user }, error: authError } = await supabase.auth.getUser();
//     if (authError || !user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { data, error } = await supabase
//       .from('websites')
//       .select('*')
//       .eq('id', params.id)
//       .eq('user_id', user.id)
//       .single();

//     if (error) {
//       return NextResponse.json({ error: 'Website not found' }, { status: 404 });
//     }

//     return NextResponse.json({
//       success: true,
//       website: data,
//     });
//   } catch (error: any) {
//     console.error('[Website GET] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// // PUT - Update website
// export async function PUT(req: NextRequest, { params }: RouteParams) {
//   try {
//     const supabase = await createClient();


//     const { data: { user }, error: authError } = await supabase.auth.getUser();
//     if (authError || !user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const body = await req.json();
//     const { name, url, domain, status } = body;

//     const { data, error } = await supabase
//       .from('websites')
//       .update({
//         ...(name && { name }),
//         ...(url && { url }),
//         ...(domain && { domain }),
//         ...(status && { status }),
//         updated_at: new Date().toISOString(),
//       })
//       .eq('id', params.id)
//       .eq('user_id', user.id)
//       .select()
//       .single();

//     if (error) {
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }

//     return NextResponse.json({
//       success: true,
//       website: data,
//     });
//   } catch (error: any) {
//     console.error('[Website PUT] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// // DELETE - Delete website (soft delete)
// export async function DELETE(req: NextRequest, { params }: RouteParams) {
//   try {
//     const supabase = await createClient();


//     const { data: { user }, error: authError } = await supabase.auth.getUser();
//     if (authError || !user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { error } = await supabase
//       .from('websites')
//       .update({
//         status: 'deleted',
//         updated_at: new Date().toISOString(),
//       })
//       .eq('id', params.id)
//       .eq('user_id', user.id);

//     if (error) {
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }

//     return NextResponse.json({
//       success: true,
//       message: 'Website deleted successfully',
//     });
//   } catch (error: any) {
//     console.error('[Website DELETE] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }
// Individual website operations
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/* ============================================================
   GET - Get specific website
============================================================ */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔑 REQUIRED: await params
    const { id } = await params;

    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      website: data,
    });
  } catch (error) {
    console.error('[Website GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/* ============================================================
   PUT - Update website
============================================================ */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, url, domain, status } = body;

    const { data, error } = await supabase
      .from('websites')
      .update({
        ...(name && { name }),
        ...(url && { url }),
        ...(domain && { domain }),
        ...(status && { status }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      website: data,
    });
  } catch (error) {
    console.error('[Website PUT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/* ============================================================
   DELETE - Soft delete website
============================================================ */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('websites')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Website deleted successfully',
    });
  } catch (error) {
    console.error('[Website DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
