// // ============================================
// // app/api/settings/password/route.ts
// // ============================================
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// export const PATCH = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       const body = await req.json();
//       const { current_password, new_password } = body;

//       if (!current_password || !new_password) {
//         return NextResponse.json(
//           { error: 'Current and new password are required' },
//           { status: 400 }
//         );
//       }

//       if (new_password.length < 8) {
//         return NextResponse.json(
//           { error: 'New password must be at least 8 characters' },
//           { status: 400 }
//         );
//       }

//       const supabase = await getAuthenticatedClient(req);

//       // Verify current password by attempting to sign in
//       const { error: signInError } = await supabase.auth.signInWithPassword({
//         email: user.email,
//         password: current_password,
//       });

//       if (signInError) {
//         return NextResponse.json(
//           { error: 'Current password is incorrect' },
//           { status: 401 }
//         );
//       }

//       // Update password
//       const { error: updateError } = await supabase.auth.updateUser({
//         password: new_password,
//       });

//       if (updateError) throw updateError;

//       return NextResponse.json({
//         success: true,
//         message: 'Password updated successfully',
//       });
//     } catch (error: any) {
//       console.error('[Settings Password] Error:', error);
//       return NextResponse.json(
//         { error: 'Failed to update password', details: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );


// ============================================
// app/api/settings/password/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

export const PATCH_PASSWORD = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const body = await req.json();
      const { current_password, new_password } = body;

      if (!current_password || !new_password) {
        return NextResponse.json(
          { error: 'Current password and new password are required' },
          { status: 400 }
        );
      }

      const supabase = await getAuthenticatedClient(req);

      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: new_password,
      });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error: any) {
      console.error('[Settings Password] Error:', error);
      return NextResponse.json(
        { error: 'Failed to update password', details: error.message },
        { status: 500 }
      );
    }
  }
);

export { PATCH_PASSWORD as PATCH };
