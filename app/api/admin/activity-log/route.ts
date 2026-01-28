// // app/api/admin/activity-log/route.ts

// import { NextRequest, NextResponse } from 'next/server';
// import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';
// export const GET = withSuperAdmin(async (req, user) => {
//   const { searchParams } = new URL(req.url);
//   const adminId = searchParams.get('admin_id');
//   const page = parseInt(searchParams.get('page') || '1');
//   const limit = parseInt(searchParams.get('limit') || '50');
//   const offset = (page - 1) * limit;

//   const supabase = getAdminClient();

//   try {
//     let query = supabase
//       .from('admin_activity_log')
//       .select('*')
//       .order('created_at', { ascending: false })
//       .range(offset, offset + limit - 1);

//     if (adminId) {
//       query = query.eq('admin_id', adminId);
//     }

//     const { data: logs, error } = await query;

//     if (error) throw error;

//     // Get admin details for each log
//     const adminIds = [...new Set(logs?.map(l => l.admin_id))];
//     const { data: { users: admins } } = await supabase.auth.admin.listUsers();
    
//     const formattedLogs = logs?.map(log => ({
//       ...log,
//       admin_email: admins?.find(a => a.id === log.admin_id)?.email || 'Unknown',
//     }));

//     return NextResponse.json({ logs: formattedLogs });
//   } catch (error: any) {
//     console.error('Error fetching activity log:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to fetch activity log' },
//       { status: 500 }
//     );
//   }
// });



// app/api/admin/activity-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, getAdminClient } from '@/lib/admin-middleware';

export const GET = withSuperAdmin(async (req, user) => {
  const supabase = getAdminClient();
  
  try {
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get('admin_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const offset = (page - 1) * limit;
    
    // Build query
    let query = supabase
      .from('admin_activity_log')
      .select(`
        *,
        admin:admin_id (
          email,
          user_profiles (
            first_name,
            last_name
          )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    //  FIX: Only filter by admin_id if it's provided and not "undefined"
    if (adminId && adminId !== 'undefined' && adminId !== 'null') {
      query = query.eq('admin_id', adminId);
    }
    
    const { data: logs, error, count } = await query;
    
    if (error) {
      console.error('Error fetching activity log:', error);
      throw error;
    }
    
    return NextResponse.json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error(' Activity log error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity log' },
      { status: 500 }
    );
  }
});