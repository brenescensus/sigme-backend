import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';

// PUT /api/admin/users/[id]
export const PUT = withSuperAdmin(async (req, user, { params }: { params: { userId: string } }) => {
  const { userId } = params;
  const body = await req.json();
  const { first_name, last_name, email, role } = body;

  const supabase = getAdminClient();

  try {
    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.admin.getUserById(userId);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent modifying super admin
    if (currentUser.user_metadata?.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Cannot modify super admin' },
        { status: 403 }
      );
    }

    // Update auth user
    const updates: any = {};
    if (email) updates.email = email;
    if (role) {
      updates.user_metadata = { 
        ...currentUser.user_metadata, 
        role 
      };
    }

    if (Object.keys(updates).length > 0) {
      await supabase.auth.admin.updateUserById(userId, updates);
    }

    // Update profile
    if (first_name || last_name) {
      await supabase
        .from('user_profiles')
        .update({ first_name, last_name })
        .eq('id', userId);
    }

    // Log activity
    await logAdminActivity(user.id, 'UPDATE_USER', 'user', userId, body);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
});

// DELETE /api/admin/users/[userId]
export const DELETE = withSuperAdmin(async (req, user, { params }: { params: { userId: string } }) => {
  const { userId } = params;
  const supabase = getAdminClient();

  try {
    // Get user to check role
    const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(userId);
    
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting super admin
    if (targetUser.user_metadata?.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Cannot delete super admin' },
        { status: 403 }
      );
    }

    // Delete user (cascades to related tables)
    await supabase.auth.admin.deleteUser(userId);

    // Log activity
    await logAdminActivity(user.id, 'DELETE_USER', 'user', userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
});