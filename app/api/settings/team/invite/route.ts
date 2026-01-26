// // ============================================
// // app/api/settings/team/invite/route.ts
// // ============================================
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// export const POST = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       const body = await req.json();
//       const { email, role } = body;

//       if (!email || !role) {
//         return NextResponse.json(
//           { error: 'Email and role are required' },
//           { status: 400 }
//         );
//       }

//       if (!['admin', 'editor', 'viewer'].includes(role)) {
//         return NextResponse.json(
//           { error: 'Invalid role' },
//           { status: 400 }
//         );
//       }

//       const supabase = await getAuthenticatedClient(req);

//       // Check if already invited
//       const { data: existing } = await supabase
//         .from('team_members')
//         .select('id')
//         .eq('organization_id', user.id)
//         .eq('email', email)
//         .single();

//       if (existing) {
//         return NextResponse.json(
//           { error: 'User already invited' },
//           { status: 400 }
//         );
//       }

//       const { data: member, error } = await supabase
//         .from('team_members')
//         .insert({
//           organization_id: user.id,
//           email,
//           role,
//           invited_by: user.id,
//           status: 'pending',
//         })
//         .select()
//         .single();

//       if (error) throw error;

//       // TODO: Send invitation email here
//       console.log(`[Team Invite] Send email to ${email} with role ${role}`);

//       return NextResponse.json({
//         success: true,
//         member,
//       });
//     } catch (error: any) {
//       console.error('[Invite Team Member] Error:', error);
//       return NextResponse.json(
//         { error: 'Failed to invite team member', details: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );


// ============================================
// 1. FIXED: app/api/settings/team/invite/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// ❌ REMOVE THIS - withAuth already handles OPTIONS
// export async function OPTIONS(request: NextRequest) { ... }

// ✅ Just use withAuth - it handles OPTIONS automatically
export const POST = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const body = await req.json();
      const { email, role = 'viewer' } = body;

      if (!email || !email.includes('@')) {
        return NextResponse.json(
          { success: false, error: 'Valid email is required' },
          { status: 400 }
        );
      }

      const validRoles = ['owner', 'admin', 'member', 'viewer'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { success: false, error: 'Invalid role' },
          { status: 400 }
        );
      }

      const supabase = await getAuthenticatedClient(req);

      // Check if already exists
      const { data: existing } = await supabase
        .from('team_members')
        .select('id, status')
        .eq('organization_id', user.id)
        .eq('email', email.toLowerCase())
        .single();

      if (existing?.status === 'active') {
        return NextResponse.json(
          { success: false, error: 'User is already an active team member' },
          { status: 400 }
        );
      }

      if (existing) {
        // Resend invitation
        const { data: updated, error: updateError } = await supabase
          .from('team_members')
          .update({
            role,
            invited_at: new Date().toISOString(),
            invited_by: user.id,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;

        return NextResponse.json({
          success: true,
          member: updated,
          message: 'Invitation resent successfully'
        });
      }

      // Create new invitation
      const { data: member, error: insertError } = await supabase
        .from('team_members')
        .insert({
          organization_id: user.id,
          email: email.toLowerCase(),
          role,
          status: 'pending',
          invited_by: user.id,
          invited_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('✅ [Team Invite] Member invited:', member.id);

      return NextResponse.json({
        success: true,
        member,
        message: 'Invitation sent successfully'
      });

    } catch (error: any) {
      console.error(' [Team Invite] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to invite team member', details: error.message },
        { status: 500 }
      );
    }
  }
);
