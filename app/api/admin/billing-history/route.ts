// // app/api/admin/billing-history/route.ts

// import { NextRequest, NextResponse } from 'next/server';
// import { withSuperAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';

// export const GET = withSuperAdmin(async (req, user) => {
//   const supabase = getAdminClient();

//   try {
//     // Get all billing history with user info
//     const { data: history, error } = await supabase
//       .from('billing_history')
//       .select(`
//         *,
//         user:user_id (
//           email,
//           id
//         )
//       `)
//       .order('date', { ascending: false })
//       .limit(1000); // Get last 1000 records

//     if (error) throw error;

//     // Format the response
//     const formattedHistory = history?.map((record: any) => ({
//       ...record,
//       user_email: record.user?.email || 'Unknown',
//     })) || [];

//     // Log activity
//     await logAdminActivity(user.id, 'VIEW_BILLING_HISTORY', 'billing');

//     return NextResponse.json({
//       success: true,
//       history: formattedHistory,
//     });
//   } catch (error: any) {
//     console.error(' Error fetching billing history:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to fetch billing history' },
//       { status: 500 }
//     );
//   }
// });


// app/api/admin/billing-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';

export const GET = withSuperAdmin(async (req, user) => {
  const supabase = getAdminClient();

  try {
    // Get all billing history
    const { data: history, error } = await supabase
      .from('billing_history')
      .select('*')
      .order('date', { ascending: false })
      .limit(1000);

    if (error) throw error;

    // Get user emails separately
    const userIds = [...new Set((history || []).map(h => h.user_id).filter(Boolean))];
    
    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        history: [],
      });
    }

    const { data: users, error: usersError } = await supabase
      .from('user_with_profile')
      .select('id, email, first_name, last_name')
      .in('id', userIds);

    if (usersError) throw usersError;

    // Create a map of user_id to user data
    const userMap = new Map((users || []).map(u => [u.id, u]));

    // Format the response
    const formattedHistory = (history || []).map((record: any) => {
      const userData = userMap.get(record.user_id);
      return {
        ...record,
        user_email: userData?.email || 'Unknown',
        user_name: userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() : null,
      };
    });

    // Log activity
    await logAdminActivity(user.id, 'VIEW_BILLING_HISTORY', 'billing');

    return NextResponse.json({
      success: true,
      history: formattedHistory,
    });
  } catch (error: any) {
    console.error(' Error fetching billing history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch billing history' },
      { status: 500 }
    );
  }
});