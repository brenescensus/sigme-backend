// // // // // app/api/settings/team/route.ts
// // // // // ============================================
// // // // import { NextRequest, NextResponse } from 'next/server';
// // // // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // // // export const GET = withAuth(
// // // //   async (req: NextRequest, user: AuthUser) => {
// // // //     try {
// // // //       const supabase = await getAuthenticatedClient(req);

// // // //       const { data: members, error } = await supabase
// // // //         .from('team_members')
// // // //         .select(`
// // // //           id,
// // // //           email,
// // // //           role,
// // // //           status,
// // // //           invited_at,
// // // //           accepted_at,
// // // //           user_id,
// // // //           user_profiles!team_members_user_id_fkey (
// // // //             first_name,
// // // //             last_name
// // // //           )
// // // //         `)
// // // //         .eq('organization_id', user.id)
// // // //         .order('created_at', { ascending: false });

// // // //       if (error) throw error;

// // // //       // Format the response
// // // //       const formattedMembers = members?.map((member: any) => ({
// // // //         id: member.id,
// // // //         email: member.email,
// // // //         role: member.role,
// // // //         status: member.status,
// // // //         invited_at: member.invited_at,
// // // //         accepted_at: member.accepted_at,
// // // //         first_name: member.user_profiles?.first_name || '',
// // // //         last_name: member.user_profiles?.last_name || '',
// // // //       }));

// // // //       return NextResponse.json({
// // // //         success: true,
// // // //         members: formattedMembers || [],
// // // //       });
// // // //     } catch (error: any) {
// // // //       console.error('[Team Members] Error:', error);
// // // //       return NextResponse.json(
// // // //         { error: 'Failed to fetch team members', details: error.message },
// // // //         { status: 500 }
// // // //       );
// // // //     }
// // // //   }
// // // // );


// // // // app/api/settings/team/route.ts
// // // import { NextRequest, NextResponse } from 'next/server';
// // // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // // export const GET = withAuth(
// // //   async (req: NextRequest, user: AuthUser) => {
// // //     try {
// // //       const supabase = await getAuthenticatedClient(req);

// // //       // ✅ FIX: Use the correct view name 'user_with_profile' instead of 'user_profiles'
// // //       const { data: members, error } = await supabase
// // //         .from('team_members')
// // //         .select(`
// // //           id,
// // //           email,
// // //           role,
// // //           status,
// // //           invited_at,
// // //           accepted_at,
// // //           user_id,
// // //           user_with_profile!team_members_user_id_fkey (
// // //             first_name,
// // //             last_name,
// // //             avatar_url
// // //           )
// // //         `)
// // //         .eq('organization_id', user.id)
// // //         .order('created_at', { ascending: false });

// // //       if (error) {
// // //         console.error('[Team Members] Error:', error);
// // //         throw error;
// // //       }

// // //       // Format the response
// // //       const formattedMembers = members?.map((member: any) => ({
// // //         id: member.id,
// // //         email: member.email,
// // //         role: member.role,
// // //         status: member.status,
// // //         invited_at: member.invited_at,
// // //         accepted_at: member.accepted_at,
// // //         first_name: member.user_with_profile?.first_name || '',
// // //         last_name: member.user_with_profile?.last_name || '',
// // //         avatar_url: member.user_with_profile?.avatar_url || null,
// // //       }));

// // //       return NextResponse.json({
// // //         success: true,
// // //         members: formattedMembers || [],
// // //       });
// // //     } catch (error: any) {
// // //       console.error('[Team Members] Error:', error);
// // //       return NextResponse.json(
// // //         { error: 'Failed to fetch team members', details: error.message },
// // //         { status: 500 }
// // //       );
// // //     }
// // //   }
// // // );

// // // export const POST = withAuth(
// // //   async (req: NextRequest, user: AuthUser) => {
// // //     try {
// // //       const supabase = await getAuthenticatedClient(req);
// // //       const { email, role } = await req.json();

// // //       // Validate input
// // //       if (!email || !role) {
// // //         return NextResponse.json(
// // //           { error: 'Email and role are required' },
// // //           { status: 400 }
// // //         );
// // //       }

// // //       // Check if member already exists
// // //       const { data: existing } = await supabase
// // //         .from('team_members')
// // //         .select('id')
// // //         .eq('organization_id', user.id)
// // //         .eq('email', email)
// // //         .single();

// // //       if (existing) {
// // //         return NextResponse.json(
// // //           { error: 'Member already invited' },
// // //           { status: 400 }
// // //         );
// // //       }

// // //       // Create team member invitation
// // //       const { data: member, error } = await supabase
// // //         .from('team_members')
// // //         .insert({
// // //           organization_id: user.id,
// // //           email,
// // //           role,
// // //           status: 'pending',
// // //           invited_by: user.id,
// // //           invited_at: new Date().toISOString(),
// // //         })
// // //         .select()
// // //         .single();

// // //       if (error) throw error;

// // //       // TODO: Send invitation email here

// // //       return NextResponse.json({
// // //         success: true,
// // //         member,
// // //       });
// // //     } catch (error: any) {
// // //       console.error('[Team Invite] Error:', error);
// // //       return NextResponse.json(
// // //         { error: 'Failed to invite team member', details: error.message },
// // //         { status: 500 }
// // //       );
// // //     }
// // //   }
// // // );




// // // ============================================
// // // app/api/settings/team/route.ts
// // // ============================================
// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
// // export const GET_TEAM = withAuth(
// //   async (req: NextRequest, user: AuthUser) => {
// //     try {
// //       const supabase = await getAuthenticatedClient(req);

// //       const { data: members, error } = await supabase
// //         .from('team_members')
// //         .select('*, user_profiles(*)')
// //         .eq('organization_id', user.id)
// //         .order('created_at', { ascending: false });

// //       if (error) throw error;

// //       return NextResponse.json({
// //         success: true,
// //         members: members || [],
// //       });
// //     } catch (error: any) {
// //       console.error('[Team Members] Error:', error);
// //       return NextResponse.json(
// //         { error: 'Failed to fetch team members', details: error.message },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );

// // export { GET_TEAM as GET };


// // ============================================
// // app/api/settings/team/route.ts - OPTIMIZED VERSION
// // Uses database function for better performance
// // ============================================


// // ============================================
// // app/api/settings/team/route.ts - SIMPLE FIX
// // Works with your existing database schema
// // ============================================
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// /**
//  * GET - Fetch team members using the database function
//  */
// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       const supabase = await getAuthenticatedClient(req);

//       console.log('📋 [Team] Fetching team members for user:', user.id);

//       // Use the RPC function from your database
//       const { data: members, error } = await supabase
//         .rpc('get_team_members_with_profiles', { 
//           org_id: user.id 
//         });

//       if (error) {
//         console.error('🔴 [Team] RPC error:', error);
//         throw error;
//       }

//       console.log('✅ [Team] Found', members?.length || 0, 'members');

//       return NextResponse.json({
//         success: true,
//         members: members || [],
//       });

//     } catch (error: any) {
//       console.error('🔴 [Team Members] Error:', error);
//       return NextResponse.json(
//         { 
//           success: false,
//           error: 'Failed to fetch team members', 
//           details: error.message 
//         },
//         { status: 500 }
//       );
//     }
//   }
// );

// /**
//  * POST - Invite a new team member
//  */
// export const POST = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       const body = await req.json();
//       const { email, role = 'viewer' } = body;

//       if (!email || !email.includes('@')) {
//         return NextResponse.json(
//           { success: false, error: 'Valid email is required' },
//           { status: 400 }
//         );
//       }

//       const validRoles = ['owner', 'admin', 'member', 'viewer'];
//       if (!validRoles.includes(role)) {
//         return NextResponse.json(
//           { success: false, error: 'Invalid role' },
//           { status: 400 }
//         );
//       }

//       const supabase = await getAuthenticatedClient(req);

//       console.log('📨 [Team] Inviting user:', email, 'as', role);

//       // Check if already invited
//       const { data: existing } = await supabase
//         .from('team_members')
//         .select('id, status')
//         .eq('organization_id', user.id)
//         .eq('email', email.toLowerCase())
//         .single();

//       if (existing) {
//         if (existing.status === 'active') {
//           return NextResponse.json(
//             { success: false, error: 'User is already an active team member' },
//             { status: 400 }
//           );
//         }

//         // Resend invitation
//         const { data: updated, error: updateError } = await supabase
//           .from('team_members')
//           .update({
//             role,
//             invited_at: new Date().toISOString(),
//           })
//           .eq('id', existing.id)
//           .select()
//           .single();

//         if (updateError) throw updateError;

//         return NextResponse.json({
//           success: true,
//           invitation: updated,
//           message: 'Invitation resent successfully'
//         });
//       }

//       // Create new invitation
//       const { data: invitation, error: inviteError } = await supabase
//         .from('team_members')
//         .insert({
//           organization_id: user.id,
//           email: email.toLowerCase(),
//           role: role,
//           status: 'pending',
//           invited_by: user.id,
//           invited_at: new Date().toISOString()
//         })
//         .select()
//         .single();

//       if (inviteError) throw inviteError;

//       console.log('✅ [Team] Invitation created:', invitation.id);

//       return NextResponse.json({
//         success: true,
//         invitation,
//         message: 'Invitation sent successfully'
//       });

//     } catch (error: any) {
//       console.error('🔴 [Team Invite] Error:', error);
//       return NextResponse.json(
//         { 
//           success: false,
//           error: 'Failed to invite team member', 
//           details: error.message 
//         },
//         { status: 500 }
//       );
//     }
//   }
// );

// /**
//  * PATCH - Update team member role or status
//  */
// export const PATCH = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       const body = await req.json();
//       const { memberId, role, status } = body;

//       if (!memberId) {
//         return NextResponse.json(
//           { success: false, error: 'Member ID is required' },
//           { status: 400 }
//         );
//       }

//       const supabase = await getAuthenticatedClient(req);

//       // Validate role
//       if (role) {
//         const validRoles = ['owner', 'admin', 'member', 'viewer'];
//         if (!validRoles.includes(role)) {
//           return NextResponse.json(
//             { success: false, error: 'Invalid role' },
//             { status: 400 }
//           );
//         }
//       }

//       // Validate status
//       if (status) {
//         const validStatuses = ['pending', 'active', 'suspended'];
//         if (!validStatuses.includes(status)) {
//           return NextResponse.json(
//             { success: false, error: 'Invalid status' },
//             { status: 400 }
//           );
//         }
//       }

//       // Get current member
//       const { data: member } = await supabase
//         .from('team_members')
//         .select('user_id, role')
//         .eq('id', memberId)
//         .eq('organization_id', user.id)
//         .single();

//       if (!member) {
//         return NextResponse.json(
//           { success: false, error: 'Team member not found' },
//           { status: 404 }
//         );
//       }

//       // Prevent self-role-change
//       if (member.user_id === user.id && role && role !== member.role) {
//         return NextResponse.json(
//           { success: false, error: 'You cannot change your own role' },
//           { status: 403 }
//         );
//       }

//       const updates: any = {};
//       if (role) updates.role = role;
//       if (status) updates.status = status;

//       const { data, error } = await supabase
//         .from('team_members')
//         .update(updates)
//         .eq('id', memberId)
//         .eq('organization_id', user.id)
//         .select()
//         .single();

//       if (error) throw error;

//       console.log('✅ [Team] Member updated:', memberId);

//       return NextResponse.json({
//         success: true,
//         member: data,
//         message: 'Team member updated successfully'
//       });

//     } catch (error: any) {
//       console.error('🔴 [Team Update] Error:', error);
//       return NextResponse.json(
//         { 
//           success: false,
//           error: 'Failed to update team member', 
//           details: error.message 
//         },
//         { status: 500 }
//       );
//     }
//   }
// );

// /**
//  * DELETE - Remove team member
//  */
// export const DELETE = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       const { searchParams } = new URL(req.url);
//       const memberId = searchParams.get('memberId');

//       if (!memberId) {
//         return NextResponse.json(
//           { success: false, error: 'Member ID is required' },
//           { status: 400 }
//         );
//       }

//       const supabase = await getAuthenticatedClient(req);

//       // Get member details
//       const { data: member } = await supabase
//         .from('team_members')
//         .select('user_id')
//         .eq('id', memberId)
//         .eq('organization_id', user.id)
//         .single();

//       if (!member) {
//         return NextResponse.json(
//           { success: false, error: 'Team member not found' },
//           { status: 404 }
//         );
//       }

//       // Prevent self-removal
//       if (member.user_id === user.id) {
//         return NextResponse.json(
//           { success: false, error: 'You cannot remove yourself from the team' },
//           { status: 403 }
//         );
//       }

//       const { error } = await supabase
//         .from('team_members')
//         .delete()
//         .eq('id', memberId)
//         .eq('organization_id', user.id);

//       if (error) throw error;

//       console.log('✅ [Team] Member removed:', memberId);

//       return NextResponse.json({
//         success: true,
//         message: 'Team member removed successfully'
//       });

//     } catch (error: any) {
//       console.error('🔴 [Team Delete] Error:', error);
//       return NextResponse.json(
//         { 
//           success: false,
//           error: 'Failed to remove team member', 
//           details: error.message 
//         },
//         { status: 500 }
//       );
//     }
//   }
// );





// ============================================
// app/api/settings/team/route.ts - FINAL FIX
// Matches your exact database schema
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

/**
 * Team Member type matching your database
 */
interface TeamMember {
  id: string;
  organization_id: string;
  user_id: string | null;
  email: string;
  role: string;
  status: string | null;
  invited_at: string | null;
  invited_by: string | null;
  accepted_at: string | null;  // Your schema has accepted_at, not joined_at
  created_at: string | null;
  updated_at: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  timezone: string | null;
}

/**
 * GET - Fetch team members using the database function
 */
export const GET = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const supabase = await getAuthenticatedClient(req);

      console.log('📋 [Team] Fetching team members for user:', user.id);

      // Use the RPC function from your database
      const { data: members, error } = await supabase
        .rpc('get_team_members_with_profiles', { 
          org_id: user.id 
        });

      if (error) {
        console.error('🔴 [Team] RPC error:', error);
        throw error;
      }

      console.log('✅ [Team] Found', members?.length || 0, 'members');

      // Map the response to match frontend expectations
      const formattedMembers = (members || []).map((member: any) => ({
        id: member.id,
        organization_id: member.organization_id,
        user_id: member.user_id,
        email: member.email,
        role: member.role,
        status: member.status || 'pending',
        invited_at: member.invited_at,
        invited_by: member.invited_by,
        joined_at: member.accepted_at, // Map accepted_at to joined_at for frontend
        created_at: member.created_at,
        updated_at: member.updated_at,
        first_name: member.first_name,
        last_name: member.last_name,
        avatar_url: member.avatar_url,
        timezone: member.timezone,
      }));

      return NextResponse.json({
        success: true,
        members: formattedMembers,
      });

    } catch (error: any) {
      console.error('🔴 [Team Members] Error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch team members', 
          details: error.message 
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST - Invite a new team member
 */
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

      console.log('📨 [Team] Inviting user:', email, 'as', role);

      // Check if already invited
      const { data: existing } = await supabase
        .from('team_members')
        .select('id, status')
        .eq('organization_id', user.id)
        .eq('email', email.toLowerCase())
        .single();

      if (existing) {
        if (existing.status === 'active') {
          return NextResponse.json(
            { success: false, error: 'User is already an active team member' },
            { status: 400 }
          );
        }

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
          invitation: updated,
          message: 'Invitation resent successfully'
        });
      }

      // Create new invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('team_members')
        .insert({
          organization_id: user.id,
          email: email.toLowerCase(),
          role: role,
          status: 'pending',
          invited_by: user.id,
          invited_at: new Date().toISOString()
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      console.log('✅ [Team] Invitation created:', invitation.id);

      return NextResponse.json({
        success: true,
        invitation,
        message: 'Invitation sent successfully'
      });

    } catch (error: any) {
      console.error('🔴 [Team Invite] Error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to invite team member', 
          details: error.message 
        },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH - Update team member role or status
 */
export const PATCH = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const body = await req.json();
      const { memberId, role, status } = body;

      if (!memberId) {
        return NextResponse.json(
          { success: false, error: 'Member ID is required' },
          { status: 400 }
        );
      }

      const supabase = await getAuthenticatedClient(req);

      // Validate role
      if (role) {
        const validRoles = ['owner', 'admin', 'member', 'viewer'];
        if (!validRoles.includes(role)) {
          return NextResponse.json(
            { success: false, error: 'Invalid role' },
            { status: 400 }
          );
        }
      }

      // Validate status
      if (status) {
        const validStatuses = ['pending', 'active', 'suspended'];
        if (!validStatuses.includes(status)) {
          return NextResponse.json(
            { success: false, error: 'Invalid status' },
            { status: 400 }
          );
        }
      }

      // Get current member
      const { data: member } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('id', memberId)
        .eq('organization_id', user.id)
        .single();

      if (!member) {
        return NextResponse.json(
          { success: false, error: 'Team member not found' },
          { status: 404 }
        );
      }

      // Prevent self-role-change
      if (member.user_id === user.id && role && role !== member.role) {
        return NextResponse.json(
          { success: false, error: 'You cannot change your own role' },
          { status: 403 }
        );
      }

      const updates: any = {};
      if (role) updates.role = role;
      if (status) updates.status = status;

      const { data, error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', memberId)
        .eq('organization_id', user.id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ [Team] Member updated:', memberId);

      return NextResponse.json({
        success: true,
        member: data,
        message: 'Team member updated successfully'
      });

    } catch (error: any) {
      console.error('🔴 [Team Update] Error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to update team member', 
          details: error.message 
        },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE - Remove team member
 */
export const DELETE = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const { searchParams } = new URL(req.url);
      const memberId = searchParams.get('memberId');

      if (!memberId) {
        return NextResponse.json(
          { success: false, error: 'Member ID is required' },
          { status: 400 }
        );
      }

      const supabase = await getAuthenticatedClient(req);

      // Get member details
      const { data: member } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('id', memberId)
        .eq('organization_id', user.id)
        .single();

      if (!member) {
        return NextResponse.json(
          { success: false, error: 'Team member not found' },
          { status: 404 }
        );
      }

      // Prevent self-removal
      if (member.user_id === user.id) {
        return NextResponse.json(
          { success: false, error: 'You cannot remove yourself from the team' },
          { status: 403 }
        );
      }

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)
        .eq('organization_id', user.id);

      if (error) throw error;

      console.log('✅ [Team] Member removed:', memberId);

      return NextResponse.json({
        success: true,
        message: 'Team member removed successfully'
      });

    } catch (error: any) {
      console.error('🔴 [Team Delete] Error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to remove team member', 
          details: error.message 
        },
        { status: 500 }
      );
    }
  }
);