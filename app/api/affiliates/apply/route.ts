// // // app/api/affiliates/apply/route.ts
// // // Affiliate application endpoint (authenticated)

// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth } from '@/lib/auth-middleware';
// // import { createClient } from '@supabase/supabase-js';

// // const supabase = createClient(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!
// // );

// // export const POST = withAuth(async (req: NextRequest, user) => {
// //   try {
// //     const userId = user.id;
// //     const body = await req.json();
// //     const {
// //       company_name,
// //       website_url,
// //       promotion_methods,
// //       monthly_visitors
// //     } = body;

// //     // Check if user already has an affiliate account
// //     const { data: existing } = await supabase
// //       .from('affiliates')
// //       .select('id, status')
// //       .eq('user_id', userId)
// //       .single();

// //     if (existing) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           error: `You already have an affiliate account (${existing.status})`
// //         },
// //         { status: 400 }
// //       );
// //     }

// //     // Get settings
// //     const { data: settings } = await supabase
// //       .from('affiliate_settings')
// //       .select('auto_approve, default_commission_rate, cookie_duration')
// //       .single();

// //     // Generate unique affiliate code
// //     const affiliateCode = await generateAffiliateCode();

// //     // Create affiliate account
// //     const { data: affiliate, error } = await supabase
// //       .from('affiliates')
// //       .insert({
// //         user_id: userId,
// //         affiliate_code: affiliateCode,
// //         company_name,
// //         website_url,
// //         promotion_methods,
// //         monthly_visitors,
// //         status: settings?.auto_approve ? 'active' : 'pending',
// //         commission_rate: settings?.default_commission_rate || 20,
// //         cookie_duration: settings?.cookie_duration || 30
// //       })
// //       .select()
// //       .single();

// //     if (error) throw error;

// //     return NextResponse.json({
// //       success: true,
// //       message: settings?.auto_approve 
// //         ? 'Your affiliate account has been approved!' 
// //         : 'Your application has been submitted for review',
// //       affiliate
// //     });

// //   } catch (error: any) {
// //     console.error('Apply error:', error);
// //     return NextResponse.json(
// //       { success: false, error: error.message },
// //       { status: 500 }
// //     );
// //   }
// // });

// // async function generateAffiliateCode(): Promise<string> {
// //   let code: string;
// //   let exists = true;

// //   while (exists) {
// //     code = 'AFF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
// //     const { data } = await supabase
// //       .from('affiliates')
// //       .select('id')
// //       .eq('affiliate_code', code)
// //       .single();

// //     exists = !!data;
// //   }

// //   return code!;
// // }



// // app/api/affiliates/apply/route.ts
// // PUBLIC affiliate application endpoint (NO auth required)
// // Creates both user account AND affiliate account in one step

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// /**
//  * POST /api/affiliates/apply
//  * Public endpoint - creates user account + affiliate application
//  */
// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const {
//       email,
//       password,
//       full_name,
//       company_name,
//       website_url,
//       promotion_methods,
//       monthly_visitors
//     } = body;

//     // Validate required fields
//     if (!email || !password || !full_name) {
//       return NextResponse.json(
//         { success: false, error: 'Email, password, and full name are required' },
//         { status: 400 }
//       );
//     }

//     if (!company_name || !website_url || !promotion_methods) {
//       return NextResponse.json(
//         { success: false, error: 'Please fill in all affiliate application fields' },
//         { status: 400 }
//       );
//     }

//     // Check if email already exists
//     const { data: existingUser } = await supabase.auth.admin.listUsers();
//     const userExists = existingUser?.users?.some(u => u.email === email);

//     if (userExists) {
//       return NextResponse.json(
//         { success: false, error: 'Email already registered. Please sign in instead.' },
//         { status: 400 }
//       );
//     }

//     // 1. Create user account
//     const { data: authData, error: authError } = await supabase.auth.admin.createUser({
//       email,
//       password,
//       email_confirm: true, // Auto-confirm email for affiliates
//       user_metadata: {
//         full_name,
//         is_affiliate_applicant: true
//       }
//     });

//     if (authError) {
//       console.error('Auth error:', authError);
//       return NextResponse.json(
//         { success: false, error: authError.message },
//         { status: 400 }
//       );
//     }

//     const userId = authData.user.id;

//     // 2. Create user profile
//     await supabase
//       .from('user_profiles')
//       .insert({
//         id: userId,
//         first_name: full_name.split(' ')[0],
//         last_name: full_name.split(' ').slice(1).join(' ') || null
//       });

//     // 3. Create default subscription (free plan)
//     await supabase
//       .from('user_subscriptions')
//       .insert({
//         user_id: userId,
//         plan_name: 'Free',
//         plan_tier: 'free',
//         status: 'active',
//         websites_limit: 1,
//         notifications_limit: 1000
//       });

//     // 4. Get affiliate settings
//     const { data: settings } = await supabase
//       .from('affiliate_settings')
//       .select('auto_approve, default_commission_rate, cookie_duration')
//       .single();

//     // 5. Generate unique affiliate code
//     const affiliateCode = await generateAffiliateCode();

//     // 6. Create affiliate account
//     const { data: affiliate, error: affiliateError } = await supabase
//       .from('affiliates')
//       .insert({
//         user_id: userId,
//         affiliate_code: affiliateCode,
//         company_name,
//         website_url,
//         promotion_methods,
//         monthly_visitors: monthly_visitors ? parseInt(monthly_visitors) : null,
//         status: settings?.auto_approve ? 'active' : 'pending',
//         commission_rate: settings?.default_commission_rate || 20,
//         cookie_duration: settings?.cookie_duration || 30
//       })
//       .select()
//       .single();

//     if (affiliateError) {
//       console.error('Affiliate creation error:', affiliateError);
//       // Don't fail - user account was created successfully
//     }

//     // 7. Send welcome email (TODO: implement)
//     // await sendAffiliateWelcomeEmail(email, full_name, affiliateCode);

//     return NextResponse.json({
//       success: true,
//       message: settings?.auto_approve 
//         ? 'Account created! Your affiliate application has been approved.' 
//         : 'Account created! Your application is pending approval.',
//       user: {
//         id: userId,
//         email: authData.user.email
//       },
//       affiliate: {
//         status: affiliate?.status || 'pending',
//         affiliate_code: affiliateCode
//       }
//     });

//   } catch (error: any) {
//     console.error('Apply error:', error);
//     return NextResponse.json(
//       { success: false, error: error.message || 'Application failed' },
//       { status: 500 }
//     );
//   }
// }

// async function generateAffiliateCode(): Promise<string> {
//   let code: string;
//   let exists = true;
//   let attempts = 0;
//   const maxAttempts = 10;

//   while (exists && attempts < maxAttempts) {
//     code = 'AFF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
//     const { data } = await supabase
//       .from('affiliates')
//       .select('id')
//       .eq('affiliate_code', code)
//       .single();

//     exists = !!data;
//     attempts++;
//   }

//   if (attempts >= maxAttempts) {
//     throw new Error('Failed to generate unique affiliate code');
//   }

//   return code!;
// }















// app/api/affiliates/apply/route.ts
// Handles BOTH logged-in users AND new user signups
// - Logged-in users: Just creates affiliate account
// - New users: Creates user account + affiliate account

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/affiliates/apply
 * 
 * Dual-purpose endpoint:
 * 1. For logged-in users: Creates affiliate account only
 * 2. For new users: Creates both user account AND affiliate account
 * 
 * How it works:
 * - Checks Authorization header for existing user token
 * - If token exists → Use existing user account
 * - If no token → Create new user account first
 * - Then creates affiliate account for both cases
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Get auth token from request headers
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let userId: string | null = null;
    let isNewUser = false;
    let userEmail: string | null = null;

    console.log('[Affiliate Apply] Request received');
    console.log('[Affiliate Apply] Has token:', !!token);

    // ============================================================================
    // CASE 1: User is LOGGED IN (has authentication token)
    // ============================================================================
    if (token) {
      console.log('[Affiliate Apply] Verifying authentication token...');
      
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        
        if (user && !error) {
          userId = user.id;
          userEmail = user.email || null;
          console.log('[Affiliate Apply] ✅ Authenticated user:', userId);
        } else {
          console.log('[Affiliate Apply] ❌ Invalid token:', error?.message);
          // Token invalid, will fall through to new user creation
        }
      } catch (error) {
        console.error('[Affiliate Apply] Token verification error:', error);
        // Will fall through to new user creation
      }
    }

    // ============================================================================
    // CASE 2: User is NOT logged in (no valid token) - Create new account
    // ============================================================================
    if (!userId) {
      console.log('[Affiliate Apply] No authenticated user - creating new account');
      
      const { email, password, full_name } = body;

      // Validate account creation fields
      if (!email || !password || !full_name) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Email, password, and full name are required to create an account' 
          },
          { status: 400 }
        );
      }

      // Validate password strength
      if (password.length < 8) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 8 characters' },
          { status: 400 }
        );
      }

      console.log('[Affiliate Apply] Checking if email already exists:', email);

      // Check if email is already registered
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const emailExists = existingUsers?.users?.some(u => u.email === email);

      if (emailExists) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'This email is already registered. Please sign in to apply.' 
          },
          { status: 400 }
        );
      }

      console.log('[Affiliate Apply] Creating new user account...');

      // Create user account with Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for affiliate applicants
        user_metadata: {
          full_name,
          is_affiliate_applicant: true
        }
      });

      if (authError) {
        console.error('[Affiliate Apply] Auth creation error:', authError);
        return NextResponse.json(
          { success: false, error: authError.message },
          { status: 400 }
        );
      }

      if (!authData.user) {
        return NextResponse.json(
          { success: false, error: 'Failed to create user account' },
          { status: 500 }
        );
      }

      userId = authData.user.id;
      userEmail = authData.user.email || email;
      isNewUser = true;

      console.log('[Affiliate Apply] ✅ New user created:', userId);

      // Create user profile in database
      try {
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: userId,
            first_name: full_name.split(' ')[0],
            last_name: full_name.split(' ').slice(1).join(' ') || null
          });

        if (profileError) {
          console.error('[Affiliate Apply] Profile creation error:', profileError);
          // Non-fatal, continue
        }
      } catch (error) {
        console.error('[Affiliate Apply] Profile creation failed:', error);
        // Non-fatal, continue
      }

      // Create default free subscription
      try {
        const { error: subError } = await supabaseAdmin
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_name: 'Free',
            plan_tier: 'free',
            status: 'active',
            websites_limit: 1,
            notifications_limit: 1000
          });

        if (subError) {
          console.error('[Affiliate Apply] Subscription creation error:', subError);
          // Non-fatal, continue
        }
      } catch (error) {
        console.error('[Affiliate Apply] Subscription creation failed:', error);
        // Non-fatal, continue
      }
    }

    // ============================================================================
    // COMMON: Create affiliate account (both logged-in and new users)
    // ============================================================================
    
    console.log('[Affiliate Apply] Creating affiliate account for user:', userId);

    const {
      company_name,
      website_url,
      promotion_methods,
      monthly_visitors
    } = body;

    // Validate affiliate application fields
    if (!company_name || !website_url || !promotion_methods) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please complete all required fields: company name, website URL, and promotion methods' 
        },
        { status: 400 }
      );
    }

    // Check if user already has an affiliate account
    const { data: existingAffiliate } = await supabaseAdmin
      .from('affiliates')
      .select('id, status, affiliate_code')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingAffiliate) {
      console.log('[Affiliate Apply] User already has affiliate account:', existingAffiliate.status);
      return NextResponse.json(
        {
          success: false,
          error: `You already have an affiliate account with status: ${existingAffiliate.status}`,
          affiliate: {
            status: existingAffiliate.status,
            affiliate_code: existingAffiliate.affiliate_code
          }
        },
        { status: 400 }
      );
    }

    // Get affiliate program settings
    const { data: settings } = await supabaseAdmin
      .from('affiliate_settings')
      .select('auto_approve, default_commission_rate, cookie_duration')
      .single();

    console.log('[Affiliate Apply] Program settings:', {
      auto_approve: settings?.auto_approve,
      commission_rate: settings?.default_commission_rate,
      cookie_duration: settings?.cookie_duration
    });

    // Generate unique affiliate code
    const affiliateCode = await generateAffiliateCode();
    console.log('[Affiliate Apply] Generated affiliate code:', affiliateCode);

    // Determine initial status
    const initialStatus = settings?.auto_approve ? 'active' : 'pending';

    // Create affiliate account in database
    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .insert({
        user_id: userId,
        affiliate_code: affiliateCode,
        company_name,
        website_url,
        promotion_methods,
        monthly_visitors: monthly_visitors ? parseInt(monthly_visitors) : null,
        status: initialStatus,
        commission_rate: settings?.default_commission_rate || 20,
        cookie_duration: settings?.cookie_duration || 30
      })
      .select()
      .single();

    if (affiliateError) {
      console.error('[Affiliate Apply] Affiliate account creation error:', affiliateError);
      
      // If user was just created, this is a critical error
      if (isNewUser) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Account created but affiliate application failed. Please contact support.',
            details: affiliateError.message
          },
          { status: 500 }
        );
      }
      
      throw affiliateError;
    }

    console.log('[Affiliate Apply] ✅ Affiliate account created:', affiliate.id);

    // ============================================================================
    // Success Response
    // ============================================================================

    // Prepare success message based on scenario
    let message: string;
    
    if (isNewUser && settings?.auto_approve) {
      message = 'Welcome! Your account has been created and your affiliate application has been approved. You can start promoting immediately!';
    } else if (isNewUser) {
      message = 'Account created successfully! Your affiliate application is pending review. We\'ll notify you once it\'s approved.';
    } else if (settings?.auto_approve) {
      message = 'Congratulations! Your affiliate application has been approved. You can start promoting immediately!';
    } else {
      message = 'Application submitted successfully! Your application is pending review. We\'ll notify you once it\'s approved.';
    }

    return NextResponse.json({
      success: true,
      message,
      affiliate: {
        id: affiliate.id,
        status: affiliate.status,
        affiliate_code: affiliate.affiliate_code,
        commission_rate: affiliate.commission_rate,
        cookie_duration: affiliate.cookie_duration
      },
      ...(isNewUser && {
        user: {
          id: userId,
          email: userEmail
        }
      })
    });

  } catch (error: any) {
    console.error('[Affiliate Apply] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Application failed. Please try again.' 
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a unique affiliate code
 * Format: AFF-XXXXXXXX (where X is alphanumeric)
 */
async function generateAffiliateCode(): Promise<string> {
  let code: string;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 10;

  while (exists && attempts < maxAttempts) {
    // Generate random 8-character alphanumeric code
    code = 'AFF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Check if code already exists
    const { data } = await supabaseAdmin
      .from('affiliates')
      .select('id')
      .eq('affiliate_code', code)
      .maybeSingle();

    exists = !!data;
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique affiliate code after 10 attempts');
  }

  return code!;
}