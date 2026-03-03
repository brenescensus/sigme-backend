// // app/api/auth/forgot-password/route.ts

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// export async function POST(req: NextRequest) {
//   try {
//     const { email } = await req.json();

//     console.log('[Forgot Password] Request received for email:', email);

//     if (!email) {
//       return NextResponse.json(
//         { error: 'Email is required' },
//         { status: 400 }
//       );
//     }

//     // Validate email format
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return NextResponse.json(
//         { error: 'Invalid email format' },
//         { status: 400 }
//       );
//     }

//     // Create Supabase client with service role
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

//     console.log('[Forgot Password] Supabase client created');

//     // IMPORTANT: Send reset email using Supabase Auth
//     // This will work even if user doesn't exist (for security)
//     const { data, error } = await supabase.auth.resetPasswordForEmail(
//       email.toLowerCase(),
//       {
//         redirectTo: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:8080'}/reset-password`,
//       }
//     );

//     if (error) {
//       console.error('[Forgot Password] Supabase error:', error);
      
//       // Even on error, return success to prevent email enumeration
//       return NextResponse.json({
//         success: true,
//         message: 'If an account exists with this email, you will receive password reset instructions',
//       });
//     }

//     console.log('[Forgot Password] Reset email sent successfully to:', email);
//     console.log('[Forgot Password] Response data:', data);

//     return NextResponse.json({
//       success: true,
//       message: 'Password reset instructions sent to your email',
//     });

//   } catch (error: any) {
//     console.error('[Forgot Password] Unexpected error:', error);
    
//     // Always return success to prevent email enumeration
//     return NextResponse.json({
//       success: true,
//       message: 'If an account exists with this email, you will receive password reset instructions',
//     });
//   }
// }




// app/api/auth/forgot-password/route.ts
// Uses Resend (via lib/email.ts) instead of Supabase's built-in SMTP,
// which requires additional SMTP configuration in the Supabase dashboard.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

const SUCCESS_RESPONSE = NextResponse.json({
  success: true,
  message: 'If an account exists with this email, you will receive password reset instructions.',
});

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    console.log('[Forgot Password] Request for:', email);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Check if user exists — don't reveal if they don't
    const { data: userList } = await supabase.auth.admin.listUsers();
    const user = userList?.users?.find(u => u.email === email.toLowerCase());

    if (!user) {
      console.log('[Forgot Password] No user found for:', email, '— returning silent success');
      return SUCCESS_RESPONSE;
    }

    // 2. Generate a Supabase password-reset link (does NOT send email — we send it ourselves)
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:8080';

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${frontendUrl}/reset-password`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[Forgot Password] Failed to generate reset link:', linkError);
      // Return success anyway — don't expose internal errors
      return SUCCESS_RESPONSE;
    }

    const resetLink = linkData.properties.action_link;
    console.log('[Forgot Password] Reset link generated for:', email);

    // 3. Send the link ourselves via Resend
    const appName = process.env.APP_NAME || 'Sigme360';

    const emailText = `
Hi,

You requested a password reset for your ${appName} account.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour.

If you did not request a password reset, you can safely ignore this email. Your password will not be changed.

Best regards,
The ${appName} Team
    `.trim();

    const emailHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
  <h2 style="margin-bottom: 8px;">Reset your password</h2>
  <p>You requested a password reset for your <strong>${appName}</strong> account.</p>
  <p>Click the button below to choose a new password:</p>
  <a href="${resetLink}"
     style="display: inline-block; margin: 16px 0; padding: 12px 24px;
            background: #6366f1; color: white; border-radius: 8px;
            text-decoration: none; font-weight: 600;">
    Reset Password
  </a>
  <p style="color: #888; font-size: 13px;">This link expires in 1 hour.</p>
  <p style="color: #888; font-size: 13px;">
    If you didn't request this, you can safely ignore this email.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} ${appName}</p>
</body>
</html>
    `.trim();

    try {
      await sendEmail({
        to: email.toLowerCase(),
        subject: `Reset your ${appName} password`,
        text: emailText,
        html: emailHtml,
      });
      console.log('[Forgot Password] ✓ Reset email sent to:', email);
    } catch (emailError: any) {
      console.error('[Forgot Password] ✗ Failed to send email:', emailError.message);
      // Still return success — don't reveal email delivery failures
    }

    return SUCCESS_RESPONSE;

  } catch (error: any) {
    console.error('[Forgot Password] Unexpected error:', error);
    return SUCCESS_RESPONSE; // Always return success to prevent email enumeration
  }
}