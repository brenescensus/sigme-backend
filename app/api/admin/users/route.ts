// // app/api/admin/users/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';

// // GET /api/admin/users - List all users
// export const GET = withSuperAdmin(async (req, user) => {
//   const { searchParams } = new URL(req.url);
//   const search = searchParams.get('search') || '';
//   const role = searchParams.get('role');
//   const page = parseInt(searchParams.get('page') || '1');
//   const limit = parseInt(searchParams.get('limit') || '50');

//   const supabase = getAdminClient();

//   try {
//     // Get all users from Supabase Auth
//     const { data: { users }, error } = await supabase.auth.admin.listUsers({
//       page,
//       perPage: limit,
//     });

//     if (error) throw error;

//     // Filter by search
//     let filteredUsers = users || [];
    
//     if (search) {
//       const searchLower = search.toLowerCase();
//       filteredUsers = filteredUsers.filter(u => 
//         u.email?.toLowerCase().includes(searchLower) ||
//         u.user_metadata?.first_name?.toLowerCase().includes(searchLower) ||
//         u.user_metadata?.last_name?.toLowerCase().includes(searchLower)
//       );
//     }

//     // Filter by role
//     if (role) {
//       filteredUsers = filteredUsers.filter(u => 
//         (u.user_metadata?.role || 'user') === role
//       );
//     }

//     // Get profiles for these users
//     const userIds = filteredUsers.map(u => u.id);
//     const { data: profiles } = await supabase
//       .from('user_profiles')
//       .select('*')
//       .in('id', userIds);

//     // Merge data
//     const usersWithProfiles = filteredUsers.map(u => ({
//       id: u.id,
//       email: u.email,
//       role: u.user_metadata?.role || 'user',
//       first_name: profiles?.find(p => p.id === u.id)?.first_name,
//       last_name: profiles?.find(p => p.id === u.id)?.last_name,
//       created_at: u.created_at,
//     }));

//     // Log activity
//     await logAdminActivity(user.id, 'LIST_USERS', 'user');

//     return NextResponse.json({
//       users: usersWithProfiles,
//       pagination: {
//         page,
//         limit,
//         total: filteredUsers.length,
//       },
//     });
//   } catch (error: any) {
//     console.error('Error fetching users:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to fetch users' },
//       { status: 500 }
//     );
//   }
// });

// // POST /api/admin/users - Create new user
// export const POST = withSuperAdmin(async (req, user) => {
//   const body = await req.json();
//   const { email, password, first_name, last_name, role = 'user' } = body;

//   if (!email || !password) {
//     return NextResponse.json(
//       { error: 'Email and password are required' },
//       { status: 400 }
//     );
//   }

//   if (!['user', 'admin'].includes(role)) {
//     return NextResponse.json(
//       { error: 'Invalid role. Must be "user" or "admin"' },
//       { status: 400 }
//     );
//   }

//   const supabase = getAdminClient();

//   try {
//     // Check admin limit
//     if (role === 'admin') {
//       const { data: { users } } = await supabase.auth.admin.listUsers();
//       const adminCount = users?.filter(u => u.user_metadata?.role === 'admin').length || 0;
      
//       if (adminCount >= 3) {
//         return NextResponse.json(
//           { error: 'Maximum of 3 admins allowed' },
//           { status: 400 }
//         );
//       }
//     }

//     // Create user
//     const { data, error } = await supabase.auth.admin.createUser({
//       email,
//       password,
//       email_confirm: true,
//       user_metadata: {
//         role,
//         first_name,
//         last_name,
//       },
//     });

//     if (error) throw error;
    
//     // Add null check for newUser
//     if (!data.user) {
//       throw new Error('Failed to create user: User object is null');
//     }

//     const newUser = data.user;

//     // Create profile
//     await supabase.from('user_profiles').insert({
//       id: newUser.id,
//       first_name,
//       last_name,
//     });

//     // Create subscription
//     await supabase.from('user_subscriptions').insert({
//       user_id: newUser.id,
//       plan_tier: 'free',
//       plan_name: 'Free',
//       websites_limit: 1,
//       notifications_limit: 10000,
//       recurring_limit: 0,
//     });

//     // Log activity
//     await logAdminActivity(user.id, 'CREATE_USER', 'user', newUser.id, { email, role });

//     return NextResponse.json({
//       success: true,
//       user: {
//         id: newUser.id,
//         email: newUser.email,
//         role,
//         first_name,
//         last_name,
//       },
//     });
//   } catch (error: any) {
//     console.error('Error creating user:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to create user' },
//       { status: 500 }
//     );
//   }
// });


// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';

// GET /api/admin/users - List all users
export const GET = withSuperAdmin(async (req, user) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const supabase = getAdminClient();

  try {
    // Get all users from Supabase Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: limit,
    });

    if (error) throw error;

    // Filter by search
    let filteredUsers = users || [];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(u => 
        u.email?.toLowerCase().includes(searchLower) ||
        u.user_metadata?.first_name?.toLowerCase().includes(searchLower) ||
        u.user_metadata?.last_name?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by role
    if (role) {
      filteredUsers = filteredUsers.filter(u => 
        (u.user_metadata?.role || 'user') === role
      );
    }

    // Get profiles for these users
    const userIds = filteredUsers.map(u => u.id);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', userIds);

    // Merge data
    const usersWithProfiles = filteredUsers.map(u => ({
      id: u.id,
      email: u.email,
      role: u.user_metadata?.role || 'user',
      first_name: profiles?.find(p => p.id === u.id)?.first_name,
      last_name: profiles?.find(p => p.id === u.id)?.last_name,
      created_at: u.created_at,
    }));

    // Log activity
    await logAdminActivity(user.id, 'LIST_USERS', 'user');

    return NextResponse.json({
      users: usersWithProfiles,
      pagination: {
        page,
        limit,
        total: filteredUsers.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
});

// POST /api/admin/users - Create new user
export const POST = withSuperAdmin(async (req, user) => {
  const body = await req.json();
  const { email, password, first_name, last_name, role = 'user' } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    );
  }

  //  Allow 'user', 'admin', or 'super_admin'
  if (!['user', 'admin', 'super_admin'].includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be "user", "admin", or "super_admin"' },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();

  try {
    //  Check admin limit (count both 'admin' and 'super_admin')
    if (role === 'admin' || role === 'super_admin') {
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
    }

    // Create user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        first_name,
        last_name,
      },
    });

    if (error) throw error;
    
    if (!data.user) {
      throw new Error('Failed to create user: User object is null');
    }

    const newUser = data.user;

    // Create profile
    await supabase.from('user_profiles').insert({
      id: newUser.id,
      first_name,
      last_name,
    });

    // Create subscription
    await supabase.from('user_subscriptions').insert({
      user_id: newUser.id,
      plan_tier: 'free',
      plan_name: 'Free',
      websites_limit: 1,
      notifications_limit: 10000,
      recurring_limit: 0,
    });

    // Log activity
    await logAdminActivity(user.id, 'CREATE_USER', 'user', newUser.id, { email, role });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role,
        first_name,
        last_name,
      },
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
});

// DELETE /api/admin/users/[id] - Delete user
export const DELETE = withSuperAdmin(async (req, user) => {
  const userId = req.url.split('/').pop();

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();

  try {
    //  Prevent deleting yourself
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Get user to check role before deleting
    const { data: { user: userToDelete }, error: fetchError } = 
      await supabase.auth.admin.getUserById(userId);

    if (fetchError || !userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = userToDelete.user_metadata?.role || 'user';

    // Delete user from Supabase Auth (cascades to related tables via RLS)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) throw deleteError;

    // Log activity
    await logAdminActivity(
      user.id, 
      'DELETE_USER', 
      'user', 
      userId, 
      { email: userToDelete.email, role: userRole }
    );

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
});