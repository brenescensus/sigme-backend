// // app/api/auth/forgot-password/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// export async function POST(req: NextRequest) {
//   try {
//     const { email } = await req.json();

//     if (!email) {
//       return NextResponse.json(
//         { error: 'Email is required' },
//         { status: 400 }
//       );
//     }

//     const supabase = createClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.SUPABASE_SERVICE_ROLE_KEY!,
//       {
//         auth: {
//           autoRefreshToken: false,
//           persistSession: false,
//         },
//       }
//     );

//     // Check if user exists
//     const { data: user, error: userError } = await supabase
//       .from('users')
//       .select('id, email')
//       .eq('email', email.toLowerCase())
//       .single();

//     if (userError || !user) {
//       // Don't reveal if email exists or not (security)
//       return NextResponse.json({
//         success: true,
//         message: 'If an account exists with this email, you will receive password reset instructions',
//       });
//     }

//     // Send password reset email using Supabase Auth
//     const { error } = await supabase.auth.resetPasswordForEmail(email, {
//       redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
//     });

//     if (error) {
//       console.error('[Forgot Password] Error:', error);
//       throw error;
//     }

//     console.log('[Forgot Password] Reset email sent to:', email);

//     return NextResponse.json({
//       success: true,
//       message: 'Password reset instructions sent to your email',
//     });

//   } catch (error: any) {
//     console.error('[Forgot Password] Error:', error);
    
//     // Always return success to prevent email enumeration
//     return NextResponse.json({
//       success: true,
//       message: 'If an account exists with this email, you will receive password reset instructions',
//     });
//   }
// }









// app/api/auth/forgot-password/route.ts
// FIXED VERSION - Ensures email is actually sent

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    console.log('[Forgot Password] Request received for email:', email);

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('[Forgot Password] Supabase client created');

    // IMPORTANT: Send reset email using Supabase Auth
    // This will work even if user doesn't exist (for security)
    const { data, error } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:8080'}/reset-password`,
      }
    );

    if (error) {
      console.error('[Forgot Password] Supabase error:', error);
      
      // Even on error, return success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions',
      });
    }

    console.log('[Forgot Password] Reset email sent successfully to:', email);
    console.log('[Forgot Password] Response data:', data);

    return NextResponse.json({
      success: true,
      message: 'Password reset instructions sent to your email',
    });

  } catch (error: any) {
    console.error('[Forgot Password] Unexpected error:', error);
    
    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions',
    });
  }
}