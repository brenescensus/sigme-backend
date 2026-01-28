// // app/api/admin/admins/demote/[id]/route.ts   Correct path
// import { NextRequest, NextResponse } from 'next/server';
// import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';

// export const POST = withSuperAdmin(async (req, user, { params }: { params: { id: string } }) => {
//   const adminId = params.id;  //  Changed from params.adminId
//   const supabase = getAdminClient();
  
//   try {
//     // Get admin
//     const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(adminId);
    
//     if (!targetUser) {
//       return NextResponse.json({ error: 'User not found' }, { status: 404 });
//     }
    
//     // Prevent demoting super admin
//     if (targetUser.user_metadata?.role === 'super_admin') {
//       return NextResponse.json(
//         { error: 'Cannot demote super admin' },
//         { status: 403 }
//       );
//     }
    
//     // Prevent demoting yourself
//     if (adminId === user.id) {
//       return NextResponse.json(
//         { error: 'Cannot demote yourself' },
//         { status: 403 }
//       );
//     }
    
//     // Update role
//     await supabase.auth.admin.updateUserById(adminId, {
//       user_metadata: {
//         ...targetUser.user_metadata,
//         role: 'user',
//       },
//     });
    
//     // Log activity
//     await logAdminActivity(user.id, 'DEMOTE_ADMIN', 'admin', adminId);
    
//     return NextResponse.json({ success: true });
//   } catch (error: any) {
//     console.error('Error demoting admin:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to demote admin' },
//       { status: 500 }
//     );
//   }
// });\






// app/api/admin/admins/demote/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';

export const POST = withSuperAdmin(async (req, user, context: { params: Promise<{ id: string }> }) => {
  const supabase = getAdminClient();
  
  try {
    //  FIX: Await params in Next.js 15+
    const params = await context.params;
    const adminId = params.id;
    
    // Get admin
    const { data: { user: targetUser }, error: getUserError } = await supabase.auth.admin.getUserById(adminId);
    
    if (getUserError) {
      console.error('Error getting user:', getUserError);
      throw getUserError;
    }
    
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Prevent demoting super admin
    if (targetUser.user_metadata?.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Cannot demote super admin' },
        { status: 403 }
      );
    }
    
    // Prevent demoting yourself
    if (adminId === user.id) {
      return NextResponse.json(
        { error: 'Cannot demote yourself' },
        { status: 403 }
      );
    }
    
    // Update role to user
    const { error: updateError } = await supabase.auth.admin.updateUserById(adminId, {
      user_metadata: {
        ...targetUser.user_metadata,
        role: 'user',
      },
    });
    
    if (updateError) {
      console.error('Error updating user:', updateError);
      throw updateError;
    }
    
    // Log activity
    await logAdminActivity(user.id, 'DEMOTE_ADMIN', 'admin', adminId);
    
    console.log(` Admin demoted: ${targetUser.email}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Admin successfully demoted to user',
    });
  } catch (error: any) {
    console.error(' Error demoting admin:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to demote admin' },
      { status: 500 }
    );
  }
});