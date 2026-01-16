// // FILE: app/api/subscribers/[id]/route.ts
// // Individual subscriber operations
// // ============================================================

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';

// interface RouteParams {
//   params: {
//     id: string;
//   };
// }

// // DELETE - Unsubscribe
// export async function DELETE(req: NextRequest, { params }: RouteParams) {
//   try {
//     const supabase = await createClient();


//     const { data: { user }, error: authError } = await supabase.auth.getUser();
//     if (authError || !user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // Get subscriber and verify ownership
//     const { data: subscriber } = await supabase
//       .from('subscribers')
//       // .select('*, websites!inner(user_id)')
//       .select(`
//   id,
//   website_id,
//   websites (
//     user_id
//   )
// `)
//       .eq('id', params.id)
//       .single();



//     if (!subscriber || subscriber.websites.user_id !== user.id) {
//       return NextResponse.json(
//         { error: 'Subscriber not found or access denied' },
//         { status: 404 }
//       );
//     }

//     // Soft delete by setting status to inactive
//     const { error } = await supabase
//       .from('subscribers')
//       .update({
//         status: 'inactive',
//         updated_at: new Date().toISOString(),
//       })
//       .eq('id', params.id);

//     if (error) {
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }

//     return NextResponse.json({
//       success: true,
//       message: 'Subscriber unsubscribed successfully',
//     });
//   } catch (error: any) {
//     console.error('[Subscriber DELETE] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE - Unsubscribe a subscriber
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔑 REQUIRED in Next.js 14+
    const { id } = await params;

    const supabase = await createClient();

    // 1️⃣ Auth check
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

    // 2️⃣ Fetch subscriber and verify ownership
    const { data: subscriber, error: fetchError } = await supabase
      .from('subscribers')
      .select(`
        id,
        website_id,
        websites (
          user_id
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    if (subscriber.websites.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // 3️⃣ Soft delete
    const { error: updateError } = await supabase
      .from('subscribers')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscriber unsubscribed successfully',
    });

  } catch (error) {
    console.error('[Subscriber DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
