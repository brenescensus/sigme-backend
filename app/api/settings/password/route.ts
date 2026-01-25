
// // // ============================================
// // // app/api/settings/password/route.ts
// // // ============================================
// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // export const PATCH_PASSWORD = withAuth(
// //   async (req: NextRequest, user: AuthUser) => {
// //     try {
// //       const body = await req.json();
// //       const { current_password, new_password } = body;

// //       if (!current_password || !new_password) {
// //         return NextResponse.json(
// //           { error: 'Current password and new password are required' },
// //           { status: 400 }
// //         );
// //       }

// //       const supabase = await getAuthenticatedClient(req);

// //       // Update password using Supabase Auth
// //       const { error } = await supabase.auth.updateUser({
// //         password: new_password,
// //       });

// //       if (error) throw error;

// //       return NextResponse.json({
// //         success: true,
// //         message: 'Password updated successfully',
// //       });
// //     } catch (error: any) {
// //       console.error('[Settings Password] Error:', error);
// //       return NextResponse.json(
// //         { error: 'Failed to update password', details: error.message },
// //         { status: 500 }
// //       );
// //     }
// //   }
// // );

// // export { PATCH_PASSWORD as PATCH };


// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, AuthUser } from '@/lib/auth-middleware';
// import { createClient } from '@supabase/supabase-js';

// export const PATCH = withAuth(async (req: NextRequest, user: AuthUser) => {
//   try {
//     const body = await req.json();
//     const { current_password, new_password } = body;

//     console.log('[Settings Password] Request from user:', user.email);

//     if (!current_password || !new_password) {
//       return NextResponse.json(
//         { error: 'Current password and new password are required' },
//         { status: 400 }
//       );
//     }

//     // Validate new password strength
//     if (new_password.length < 8) {
//       return NextResponse.json(
//         { error: 'New password must be at least 8 characters long' },
//         { status: 400 }
//       );
//     }

//     // Create admin client for password update
//     const supabaseAdmin = createClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.SUPABASE_SERVICE_ROLE_KEY!,
//       {
//         auth: {
//           autoRefreshToken: false,
//           persistSession: false,
//         },
//       }
//     );

//     // First verify current password by attempting to sign in
//     const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
//       email: user.email,
//       password: current_password,
//     });

//     if (verifyError) {
//       console.error('[Settings Password] Current password verification failed:', verifyError);
//       return NextResponse.json(
//         { error: 'Current password is incorrect' },
//         { status: 401 }
//       );
//     }

//     // Update password using admin client
//     const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
//       user.id,
//       { password: new_password }
//     );

//     if (updateError) {
//       console.error('[Settings Password] Update error:', updateError);
//       throw updateError;
//     }

//     console.log('[Settings Password] Password updated successfully for:', user.email);

//     return NextResponse.json({
//       success: true,
//       message: 'Password updated successfully',
//     });
//   } catch (error: any) {
//     console.error('[Settings Password] Error:', error);
//     return NextResponse.json(
//       { error: 'Failed to update password', details: error.message },
//       { status: 500 }
//     );
//   }
// });


import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth-middleware';
import { createClient } from '@supabase/supabase-js';

export const PATCH = withAuth(async (req: NextRequest, user: AuthUser) => {
  try {
    const body = await req.json();
    const { current_password, new_password } = body;

    console.log('[Settings Password] Request from user:', user.email);

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Validate new password strength
    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Create admin client for password update
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // First verify current password by attempting to sign in
    const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    });

    if (verifyError) {
      console.error('[Settings Password] Current password verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Update password using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    );

    if (updateError) {
      console.error('[Settings Password] Update error:', updateError);
      throw updateError;
    }

    // ✅ Sign out all sessions for this user (invalidate all tokens)
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(user.id);
    
    if (signOutError) {
      console.warn('[Settings Password] Failed to sign out user sessions:', signOutError);
      // Continue anyway - password was updated
    }

    console.log('[Settings Password] Password updated and sessions invalidated for:', user.email);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. Please log in again.',
      require_reauth: true, // ✅ Signal to frontend to log out
    });
  } catch (error: any) {
    console.error('[Settings Password] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update password', details: error.message },
      { status: 500 }
    );
  }
});