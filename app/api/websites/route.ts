
// // app/api/websites/route.ts 
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // ==========================================
// // GET - List all websites for authenticated user
// // ==========================================
// export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
//   try {
//     console.log('[Websites GET] User authenticated:', user.id);
    
//     //  Get authenticated Supabase client from request
//     const supabase = await getAuthenticatedClient(req);
    
//     const { data, error } = await supabase
//       .from('websites')
//       .select('*')
//       .eq('user_id', user.id)
//       .order('created_at', { ascending: false });

//     if (error) {
//       console.error('[Websites GET] Database error:', error);
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }

//     console.log('[Websites GET] Success, count:', data?.length || 0);
    
//     return NextResponse.json({
//       success: true,
//       websites: data || [],
//     });
//   } catch (error: any) {
//     console.error('[Websites GET] Error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// });

// // ==========================================
// // POST - Create new website
// // ==========================================
// export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
//   try {
//     console.log('[Websites POST] User authenticated:', user.id);
    
//     const body = await req.json();
//     const { name, url, description } = body;
    
//     console.log('[Websites POST] Request body:', { name, url, description });

//     if (!name || !url) {
//       return NextResponse.json(
//         { error: 'Name and URL are required' },
//         { status: 400 }
//       );
//     }

//     // Validate URL format
//     let domain: string;
//     try {
//       const urlObj = new URL(url);
//       domain = urlObj.hostname;
//     } catch {
//       return NextResponse.json(
//         { error: 'Invalid URL format' },
//         { status: 400 }
//       );
//     }

//     // Use the VAPID keys from environment
//     const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
//     const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

//     //  Get authenticated Supabase client from request
//     const supabase = await getAuthenticatedClient(req);
    
//     const { data, error } = await supabase
//       .from('websites')
//       .insert({
//         user_id: user.id,
//         name,
//         url,
//         domain,
//         description: description || null,
//         vapid_public_key: vapidPublicKey,
//         vapid_private_key: vapidPrivateKey,
//         notifications_sent: 0,
//         active_subscribers: 0,
//         status: 'active',
//       })
//       .select()
//       .single();

//     if (error) {
//       console.error('[Websites POST] Database error:', error);
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }

//     console.log('[Websites POST] Success:', data.id);
    
//     return NextResponse.json({
//       success: true,
//       website: data,
//     }, { status: 201 });
//   } catch (error: any) {
//     console.error('[Websites POST] Error:', error);
//     return NextResponse.json(
//       { error: error.message || 'Internal server error' },
//       { status: 500 }
//     );
//   }


// app/api/websites/route.ts
// FIXED: Added custom plan limit checking

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
import { checkCustomPlanLimit, incrementCustomPlanUsage } from '@/lib/custom-plans/enforce-limits';

// ==========================================
// GET - List all websites for authenticated user
// ==========================================
export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
  try {
    console.log('[Websites GET] User authenticated:', user.id);
    
    const supabase = await getAuthenticatedClient(req);
    
    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('[Websites GET] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[Websites GET] Success, count:', data?.length || 0);
    
    return NextResponse.json({
      success: true,
      websites: data || [],
    });
  } catch (error: any) {
    console.error('[Websites GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// ==========================================
// POST - Create new website
// ==========================================
export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
  try {
    console.log('[Websites POST] User authenticated:', user.id);
    
    const body = await req.json();
    const { name, url, description } = body;
    
    console.log('[Websites POST] Request body:', { name, url, description });
    
    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }
    
    //  CHECK CUSTOM PLAN LIMIT BEFORE CREATING WEBSITE
    console.log('[Websites POST] Checking website limit...');
    const limitCheck = await checkCustomPlanLimit(user.id, 'websites');
    
    console.log('[Websites POST] Limit check result:', {
      allowed: limitCheck.allowed,
      used: limitCheck.used,
      limit: limitCheck.limit,
      planType: limitCheck.planType,
      isUnlimited: limitCheck.isUnlimited,
    });
    
    if (!limitCheck.allowed) {
      console.warn('[Websites POST] Website limit reached');
      return NextResponse.json(
        { 
          error: limitCheck.isUnlimited 
            ? 'Cannot create website at this time' 
            : `Website limit reached. You have ${limitCheck.used} of ${limitCheck.limit} websites.`,
          limit: limitCheck.limit,
          used: limitCheck.used,
          remaining: limitCheck.remaining,
          planType: limitCheck.planType,
        },
        { status: 403 }
      );
    }
    
    console.log('[Websites POST] Limit check passed, creating website...');
    
    // Validate URL format
    let domain: string;
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname;
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    // Use the VAPID keys from environment
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
    
    const supabase = await getAuthenticatedClient(req);
    
    const { data, error } = await supabase
      .from('websites')
      .insert({
        user_id: user.id,
        name,
        url,
        domain,
        description: description || null,
        vapid_public_key: vapidPublicKey,
        vapid_private_key: vapidPrivateKey,
        notifications_sent: 0,
        active_subscribers: 0,
        status: 'active',
      })
      .select()
      .single();
      
    if (error) {
      console.error('[Websites POST] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[Websites POST] Website created:', data.id);
    
    //  INCREMENT USAGE COUNTER FOR CUSTOM PLAN
    if (limitCheck.planType === 'custom') {
      console.log('[Websites POST] Incrementing custom plan usage...');
      const incrementSuccess = await incrementCustomPlanUsage(user.id, 'websites');
      if (incrementSuccess) {
        console.log('[Websites POST]  Custom plan usage incremented');
      } else {
        console.warn('[Websites POST] Failed to increment custom plan usage');
      }
    }
    
    // Also increment standard subscription counter
    await supabase.rpc('increment_website_usage', {
      p_user_id: user.id
    });
    
    console.log('[Websites POST]  Success:', data.id);
    
    return NextResponse.json({
      success: true,
      website: data,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Websites POST] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});