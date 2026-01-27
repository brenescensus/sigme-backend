// app/api/admin/admins/promote/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';

export const POST = withSuperAdmin(async (req, user, { params }: { params: { id: string } }) => {
  const userId = params.id;
  const supabase = getAdminClient();

  try {
    // Check current admin count
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const adminCount = users?.filter(u => 
      u.user_metadata?.role === 'admin' || 
      u.user_metadata?.role === 'super_admin'
    ).length || 0;

    if (adminCount >= 3) {
      return NextResponse.json(
        { error: 'Maximum of 3 admins allowed (including super admins)' },
        { status: 400 }
      );
    }

    // Get target user
    const { data: { user: targetUser }, error: getUserError } = 
      await supabase.auth.admin.getUserById(userId);

    if (getUserError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update role to admin
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...targetUser.user_metadata,
        role: 'admin',
      },
    });

    // Log activity
    await logAdminActivity(
      user.id, 
      'PROMOTE_TO_ADMIN', 
      'admin', 
      userId,
      { email: targetUser.email }
    );

    return NextResponse.json({
      success: true,
      message: `${targetUser.email} promoted to admin`,
    });
  } catch (error: any) {
    console.error('Error promoting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to promote user' },
      { status: 500 }
    );
  }
});