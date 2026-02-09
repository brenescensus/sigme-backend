// // app/api/admin/payments/route.ts

// import { NextRequest, NextResponse } from 'next/server';
// import { withSuperAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';

// export const GET = withSuperAdmin(async (req, user) => {
//   const supabase = getAdminClient();

//   try {
//     // Get all payment intents with user info
//     const { data: payments, error } = await supabase
//       .from('payment_intents')
//       .select(`
//         *,
//         user:user_id (
//           email,
//           id
//         )
//       `)
//       .order('created_at', { ascending: false });

//     if (error) throw error;

//     // Format the response to include user email
//     const formattedPayments = payments?.map((payment: any) => ({
//       ...payment,
//       user_email: payment.user?.email || 'Unknown',
//     })) || [];

//     // Log activity
//     await logAdminActivity(user.id, 'VIEW_PAYMENTS', 'payment');

//     return NextResponse.json({
//       success: true,
//       payments: formattedPayments,
//     });
//   } catch (error: any) {
//     console.error('❌ Error fetching payments:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to fetch payments' },
//       { status: 500 }
//     );
//   }
// });










// app/api/admin/payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, getAdminClient, logAdminActivity } from '@/lib/admin-middleware';

export const GET = withSuperAdmin(async (req, user) => {
  const supabase = getAdminClient();

  try {
    // Get all payment intents
    const { data: payments, error } = await supabase
      .from('payment_intents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get user emails separately using user_with_profile view
    const userIds = [...new Set((payments || []).map(p => p.user_id).filter(Boolean))];
    
    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        payments: [],
      });
    }

    const { data: users, error: usersError } = await supabase
      .from('user_with_profile')
      .select('id, email, first_name, last_name')
      .in('id', userIds);

    if (usersError) throw usersError;

    // Create a map of user_id to user data
    const userMap = new Map((users || []).map(u => [u.id, u]));

    // Format the response to include user email
    const formattedPayments = (payments || []).map((payment: any) => {
      const userData = userMap.get(payment.user_id);
      return {
        ...payment,
        user_email: userData?.email || 'Unknown',
        user_name: userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() : null,
      };
    });

    // Log activity
    await logAdminActivity(user.id, 'VIEW_PAYMENTS', 'payment');

    return NextResponse.json({
      success: true,
      payments: formattedPayments,
    });
  } catch (error: any) {
    console.error('❌ Error fetching payments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payments' },
      { status: 500 }
    );
  }
});