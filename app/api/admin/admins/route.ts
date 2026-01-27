// app/api/admin/admins/route.ts
import { withSuperAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';
import { NextRequest, NextResponse } from 'next/server';
export const GET = withSuperAdmin(async (req, user) => {
  const supabase = getAdminClient();

  try {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    
    // Filter for admins
    const admins = users?.filter(u => 
      ['admin', 'super_admin'].includes(u.user_metadata?.role || 'user')
    );

    // Get profiles
    const adminIds = admins?.map(a => a.id) || [];
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', adminIds);

    const adminsWithProfiles = admins?.map(admin => ({
      id: admin.id,
      email: admin.email,
      role: admin.user_metadata?.role || 'user',
      first_name: profiles?.find(p => p.id === admin.id)?.first_name,
      last_name: profiles?.find(p => p.id === admin.id)?.last_name,
      created_at: admin.created_at,
    }));

    // Log activity
    await logAdminActivity(user.id, 'LIST_ADMINS', 'admin');

    return NextResponse.json({ admins: adminsWithProfiles });
  } catch (error: any) {
    console.error('Error fetching admins:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admins' },
      { status: 500 }
    );
  }
});

// app/api/admin/admins/promote/[userId]/route.ts
export const POST = withSuperAdmin(async (req, user, { params }: { params: { userId: string } }) => {
  const { userId } = params;
  const supabase = getAdminClient();

  try {
    // Check admin limit
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const adminCount = users?.filter(u => u.user_metadata?.role === 'admin').length || 0;
    
    if (adminCount >= 3) {
      return NextResponse.json(
        { error: 'Maximum of 3 admins allowed' },
        { status: 400 }
      );
    }

    // Get user
    const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(userId);
    
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update role
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...targetUser.user_metadata,
        role: 'admin',
      },
    });

    // Log activity
    await logAdminActivity(user.id, 'PROMOTE_ADMIN', 'admin', userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error promoting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to promote user' },
      { status: 500 }
    );
  }
});