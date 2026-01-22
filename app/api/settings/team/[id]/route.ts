// // ============================================
// // app/api/settings/team/[id]/route.ts
// // ============================================
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// export const PATCH = withAuth(
//   async (req: NextRequest, user: AuthUser, context: any) => {
//     try {
//       const params = await context.params;
//       const memberId = params.id;
//       const body = await req.json();
//       const { role } = body;

//       if (!['admin', 'editor', 'viewer'].includes(role)) {
//         return NextResponse.json(
//           { error: 'Invalid role' },
//           { status: 400 }
//         );
//       }

//       const supabase = await getAuthenticatedClient(req);

//       const { data, error } = await supabase
//         .from('team_members')
//         .update({ role })
//         .eq('id', memberId)
//         .eq('organization_id', user.id)
//         .select()
//         .single();

//       if (error) throw error;

//       return NextResponse.json({
//         success: true,
//         member: data,
//       });
//     } catch (error: any) {
//       console.error('[Update Team Member] Error:', error);
//       return NextResponse.json(
//         { error: 'Failed to update team member', details: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );

// export const DELETE = withAuth(
//   async (req: NextRequest, user: AuthUser, context: any) => {
//     try {
//       const params = await context.params;
//       const memberId = params.id;

//       const supabase = await getAuthenticatedClient(req);

//       const { error } = await supabase
//         .from('team_members')
//         .delete()
//         .eq('id', memberId)
//         .eq('organization_id', user.id);

//       if (error) throw error;

//       return NextResponse.json({
//         success: true,
//         message: 'Team member removed',
//       });
//     } catch (error: any) {
//       console.error('[Remove Team Member] Error:', error);
//       return NextResponse.json(
//         { error: 'Failed to remove team member', details: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );

// ============================================
// app/api/settings/team/[memberId]/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
export const DELETE_MEMBER = withAuth(
  async (req: NextRequest, user: AuthUser, { params }: { params: { memberId: string } }) => {
    try {
      const { memberId } = params;
      const supabase = await getAuthenticatedClient(req);

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)
        .eq('organization_id', user.id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Team member removed',
      });
    } catch (error: any) {
      console.error('[Remove Team Member] Error:', error);
      return NextResponse.json(
        { error: 'Failed to remove team member', details: error.message },
        { status: 500 }
      );
    }
  }
);

export const PATCH_MEMBER = withAuth(
  async (req: NextRequest, user: AuthUser, { params }: { params: { memberId: string } }) => {
    try {
      const { memberId } = params;
      const body = await req.json();
      const { role } = body;

      const supabase = await getAuthenticatedClient(req);

      const { data, error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('id', memberId)
        .eq('organization_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        member: data,
      });
    } catch (error: any) {
      console.error('[Update Team Member] Error:', error);
      return NextResponse.json(
        { error: 'Failed to update team member', details: error.message },
        { status: 500 }
      );
    }
  }
);

export { DELETE_MEMBER as DELETE, PATCH_MEMBER as PATCH };
