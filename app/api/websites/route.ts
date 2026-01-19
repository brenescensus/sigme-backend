// // // // // // app/api/websites/route.ts
// // // // // // Website CRUD operations

// // // // // import { NextRequest, NextResponse } from 'next/server';
// // // // // import { createClient } from '@/lib/supabase/server';

// // // // // // GET - List all websites for authenticated user
// // // // // export async function GET(req: NextRequest) {
// // // // //   try {
// // // // //     const supabase = await createClient();

// // // // //     //  Get user from cookies
// // // // //     const { data: { user }, error: authError } = await supabase.auth.getUser();
    
// // // // //     if (authError || !user) {
// // // // //       console.error('[Websites GET] Auth error:', authError);
// // // // //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// // // // //     }

// // // // //     console.log('[Websites GET] User authenticated:', user.id);

// // // // //     const { data, error } = await supabase
// // // // //       .from('websites')
// // // // //       .select('*')
// // // // //       .eq('user_id', user.id)
// // // // //       .eq('status', 'active')
// // // // //       .order('created_at', { ascending: false });

// // // // //     if (error) {
// // // // //       console.error('[Websites GET] Database error:', error);
// // // // //       return NextResponse.json({ error: error.message }, { status: 500 });
// // // // //     }

// // // // //     console.log('[Websites GET] Success, count:', data?.length || 0);

// // // // //     return NextResponse.json({
// // // // //       success: true,
// // // // //       websites: data || [],
// // // // //     });
// // // // //   } catch (error: any) {
// // // // //     console.error('[Websites GET] Error:', error);
// // // // //     return NextResponse.json(
// // // // //       { error: 'Internal server error' },
// // // // //       { status: 500 }
// // // // //     );
// // // // //   }
// // // // // }

// // // // // // POST - Create new website
// // // // // export async function POST(req: NextRequest) {
// // // // //   try {
// // // // //     const supabase = await createClient();

// // // // //     //  Get user from cookies
// // // // //     const { data: { user }, error: authError } = await supabase.auth.getUser();
    
// // // // //     if (authError || !user) {
// // // // //       console.error('[Websites POST] Auth error:', authError);
// // // // //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// // // // //     }

// // // // //     console.log('[Websites POST] User authenticated:', user.id);

// // // // //     const body = await req.json();
// // // // //     const { name, url, description } = body;

// // // // //     console.log('[Websites POST] Request body:', { name, url, description });

// // // // //     if (!name || !url) {
// // // // //       return NextResponse.json(
// // // // //         { error: 'Name and URL are required' },
// // // // //         { status: 400 }
// // // // //       );
// // // // //     }

// // // // //     // Validate URL format
// // // // //     let domain: string;
// // // // //     try {
// // // // //       const urlObj = new URL(url);
// // // // //       domain = urlObj.hostname;
// // // // //     } catch {
// // // // //       return NextResponse.json(
// // // // //         { error: 'Invalid URL format' },
// // // // //         { status: 400 }
// // // // //       );
// // // // //     }

// // // // //     // Use the VAPID keys from environment
// // // // //     const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
// // // // //       "BPB0HWKOKaG0V6xpWcnoaZvnJZCRl1OYfyUXFS7Do7OzJpW6WPoJQyd__u3KVDBDJlINatfLcmNwdF6kS5niPWI";
    
// // // // //     const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'STORED_IN_SECRETS';

// // // // //     const { data, error } = await supabase
// // // // //       .from('websites')
// // // // //       .insert({
// // // // //         user_id: user.id,
// // // // //         name,
// // // // //         url,
// // // // //         domain,
// // // // //         description: description || null,
// // // // //         vapid_public_key: vapidPublicKey,
// // // // //         vapid_private_key: vapidPrivateKey,
// // // // //         notifications_sent: 0,
// // // // //         active_subscribers: 0,
// // // // //         status: 'active',
// // // // //       })
// // // // //       .select()
// // // // //       .single();

// // // // //     if (error) {
// // // // //       console.error('[Websites POST] Database error:', error);
// // // // //       return NextResponse.json({ error: error.message }, { status: 500 });
// // // // //     }

// // // // //     console.log('[Websites POST] Success:', data.id);

// // // // //     return NextResponse.json({
// // // // //       success: true,
// // // // //       website: data,
// // // // //     }, { status: 201 });
// // // // //   } catch (error: any) {
// // // // //     console.error('[Websites POST] Error:', error);
// // // // //     return NextResponse.json(
// // // // //       { error: error.message || 'Internal server error' },
// // // // //       { status: 500 }
// // // // //     );
// // // // //   }
// // // // // }

// // // // // app/api/websites/route.ts
// // // // // Website CRUD operations - Clean version using middleware

// // // // import { NextRequest, NextResponse } from 'next/server';
// // // // import { withAuth, supabase, AuthUser } from '@/lib/auth-middleware';

// // // // // ==========================================
// // // // // GET - List all websites for authenticated user
// // // // // ==========================================
// // // // export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
// // // //   try {
// // // //     console.log('[Websites GET] User authenticated:', user.id);

// // // //     const { data, error } = await supabase
// // // //       .from('websites')
// // // //       .select('*')
// // // //       .eq('user_id', user.id)
// // // //       .order('created_at', { ascending: false });

// // // //     if (error) {
// // // //       console.error('[Websites GET] Database error:', error);
// // // //       return NextResponse.json({ error: error.message }, { status: 500 });
// // // //     }

// // // //     console.log('[Websites GET] Success, count:', data?.length || 0);

// // // //     return NextResponse.json({
// // // //       success: true,
// // // //       websites: data || [],
// // // //     });
// // // //   } catch (error: any) {
// // // //     console.error('[Websites GET] Error:', error);
// // // //     return NextResponse.json(
// // // //       { error: 'Internal server error' },
// // // //       { status: 500 }
// // // //     );
// // // //   }
// // // // });

// // // // // ==========================================
// // // // // POST - Create new website
// // // // // ==========================================
// // // // export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
// // // //   try {
// // // //     console.log('[Websites POST] User authenticated:', user.id);

// // // //     const body = await req.json();
// // // //     const { name, url, description } = body;

// // // //     console.log('[Websites POST] Request body:', { name, url, description });

// // // //     if (!name || !url) {
// // // //       return NextResponse.json(
// // // //         { error: 'Name and URL are required' },
// // // //         { status: 400 }
// // // //       );
// // // //     }

// // // //     // Validate URL format
// // // //     let domain: string;
// // // //     try {
// // // //       const urlObj = new URL(url);
// // // //       domain = urlObj.hostname;
// // // //     } catch {
// // // //       return NextResponse.json(
// // // //         { error: 'Invalid URL format' },
// // // //         { status: 400 }
// // // //       );
// // // //     }

// // // //     // Use the VAPID keys from environment
// // // //     const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
// // // //     const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

// // // //     const { data, error } = await supabase
// // // //       .from('websites')
// // // //       .insert({
// // // //         user_id: user.id,
// // // //         name,
// // // //         url,
// // // //         domain,
// // // //         description: description || null,
// // // //         vapid_public_key: vapidPublicKey,
// // // //         vapid_private_key: vapidPrivateKey,
// // // //         notifications_sent: 0,
// // // //         active_subscribers: 0,
// // // //         status: 'active',
// // // //       })
// // // //       .select()
// // // //       .single();

// // // //     if (error) {
// // // //       console.error('[Websites POST] Database error:', error);
// // // //       return NextResponse.json({ error: error.message }, { status: 500 });
// // // //     }

// // // //     console.log('[Websites POST] Success:', data.id);

// // // //     return NextResponse.json({
// // // //       success: true,
// // // //       website: data,
// // // //     }, { status: 201 });
// // // //   } catch (error: any) {
// // // //     console.error('[Websites POST] Error:', error);
// // // //     return NextResponse.json(
// // // //       { error: error.message || 'Internal server error' },
// // // //       { status: 500 }
// // // //     );
// // // //   }
// // // // });

// // // // app/api/websites/route.ts - FIXED VERSION
// // // import { NextRequest, NextResponse } from 'next/server';
// // // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // // // ==========================================
// // // // GET - List all websites for authenticated user
// // // // ==========================================
// // // export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
// // //   try {
// // //     console.log('[Websites GET] User authenticated:', user.id);
    
// // //     //  Get authenticated Supabase client from request
// // //     const supabase = await getAuthenticatedClient(req);
    
// // //     const { data, error } = await supabase
// // //       .from('websites')
// // //       .select('*')
// // //       .eq('user_id', user.id)
// // //       .order('created_at', { ascending: false });

// // //     if (error) {
// // //       console.error('[Websites GET] Database error:', error);
// // //       return NextResponse.json({ error: error.message }, { status: 500 });
// // //     }

// // //     console.log('[Websites GET] Success, count:', data?.length || 0);
    
// // //     return NextResponse.json({
// // //       success: true,
// // //       websites: data || [],
// // //     });
// // //   } catch (error: any) {
// // //     console.error('[Websites GET] Error:', error);
// // //     return NextResponse.json(
// // //       { error: 'Internal server error' },
// // //       { status: 500 }
// // //     );
// // //   }
// // // });

// // // // ==========================================
// // // // POST - Create new website
// // // // ==========================================
// // // export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
// // //   try {
// // //     console.log('[Websites POST] User authenticated:', user.id);
    
// // //     const body = await req.json();
// // //     const { name, url, description } = body;
    
// // //     console.log('[Websites POST] Request body:', { name, url, description });

// // //     if (!name || !url) {
// // //       return NextResponse.json(
// // //         { error: 'Name and URL are required' },
// // //         { status: 400 }
// // //       );
// // //     }

// // //     // Validate URL format
// // //     let domain: string;
// // //     try {
// // //       const urlObj = new URL(url);
// // //       domain = urlObj.hostname;
// // //     } catch {
// // //       return NextResponse.json(
// // //         { error: 'Invalid URL format' },
// // //         { status: 400 }
// // //       );
// // //     }

// // //     // Use the VAPID keys from environment
// // //     const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
// // //     const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

// // //     //  Get authenticated Supabase client from request
// // //     const supabase = await getAuthenticatedClient(req);
    
// // //     const { data, error } = await supabase
// // //       .from('websites')
// // //       .insert({
// // //         user_id: user.id,
// // //         name,
// // //         url,
// // //         domain,
// // //         description: description || null,
// // //         vapid_public_key: vapidPublicKey,
// // //         vapid_private_key: vapidPrivateKey,
// // //         notifications_sent: 0,
// // //         active_subscribers: 0,
// // //         status: 'active',
// // //       })
// // //       .select()
// // //       .single();

// // //     if (error) {
// // //       console.error('[Websites POST] Database error:', error);
// // //       return NextResponse.json({ error: error.message }, { status: 500 });
// // //     }

// // //     console.log('[Websites POST] Success:', data.id);
    
// // //     return NextResponse.json({
// // //       success: true,
// // //       website: data,
// // //     }, { status: 201 });
// // //   } catch (error: any) {
// // //     console.error('[Websites POST] Error:', error);
// // //     return NextResponse.json(
// // //       { error: error.message || 'Internal server error' },
// // //       { status: 500 }
// // //     );
// // //   }
// // // });



// // // app/api/websites/route.ts
// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// // export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
// //   try {
// //     console.log('📋 [Websites GET] User authenticated:', user.email);
    
// //     const supabase = await getAuthenticatedClient(req);
    
// //     const { data, error } = await supabase
// //       .from('websites')
// //       .select('*')
// //       .eq('user_id', user.id)
// //       .order('created_at', { ascending: false });

// //     if (error) {
// //       console.error(' [Websites GET] Database error:', error);
// //       return NextResponse.json({
// //         success: false,
// //         error: error.message,
// //       }, { status: 500 });
// //     }

// //     console.log(` [Websites GET] Found ${data?.length || 0} websites`);
    
// //     return NextResponse.json({
// //       success: true,
// //       websites: data || [],
// //     });
// //   } catch (error: any) {
// //     console.error(' [Websites GET] Error:', error);
// //     return NextResponse.json({
// //       success: false,
// //       error: 'Internal server error',
// //     }, { status: 500 });
// //   }
// // });

// // export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
// //   try {
// //     console.log('➕ [Websites POST] User authenticated:', user.email);
    
// //     const body = await req.json();
// //     const { name, url, description } = body;

// //     if (!name || !url) {
// //       return NextResponse.json({
// //         success: false,
// //         error: 'Name and URL are required',
// //       }, { status: 400 });
// //     }

// //     let domain: string;
// //     try {
// //       const urlObj = new URL(url);
// //       domain = urlObj.hostname;
// //     } catch {
// //       return NextResponse.json({
// //         success: false,
// //         error: 'Invalid URL format',
// //       }, { status: 400 });
// //     }

// //     const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
// //     const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

// //     const supabase = await getAuthenticatedClient(req);
    
// //     const { data, error } = await supabase
// //       .from('websites')
// //       .insert({
// //         user_id: user.id,
// //         name,
// //         url,
// //         domain,
// //         description: description || null,
// //         vapid_public_key: vapidPublicKey,
// //         vapid_private_key: vapidPrivateKey,
// //         notifications_sent: 0,
// //         active_subscribers: 0,
// //         status: 'active',
// //       })
// //       .select()
// //       .single();

// //     if (error) {
// //       console.error(' [Websites POST] Database error:', error);
// //       return NextResponse.json({
// //         success: false,
// //         error: error.message,
// //       }, { status: 500 });
// //     }

// //     console.log(' [Websites POST] Created:', data.id);
    
// //     return NextResponse.json({
// //       success: true,
// //       website: data,
// //     }, { status: 201 });
// //   } catch (error: any) {
// //     console.error(' [Websites POST] Error:', error);
// //     return NextResponse.json({
// //       success: false,
// //       error: error.message || 'Internal server error',
// //     }, { status: 500 });
// //   }
// // });













// // app/api/websites/route.ts
// import { NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';

// // GET all websites for authenticated user
// export async function GET(req: Request) {
//   try {
//     const supabase = await createClient();

//     //  Get authenticated user
//     const { data: { user }, error: authError } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return NextResponse.json(
//         { error: 'Unauthorized' },
//         { status: 401 }
//       );
//     }

//     // Fetch websites for this user
//     const { data: websites, error } = await supabase
//       .from('websites')
//       .select('*')
//       .eq('user_id', user.id)
//       .order('created_at', { ascending: false });

//     if (error) {
//       console.error('[WEBSITES GET]', error);
//       return NextResponse.json(
//         { error: error.message },
//         { status: 500 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       websites,
//     });

//   } catch (err: any) {
//     console.error('[WEBSITES GET]', err);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// // POST create new website
// export async function POST(req: Request) {
//   try {
//     const supabase = await createClient();

//     //  Get authenticated user from session
//     const { data: { user }, error: authError } = await supabase.auth.getUser();

//     console.log(' [WEBSITES POST] Auth check:', {
//       hasUser: !!user,
//       userId: user?.id,
//       authError: authError?.message
//     });

//     if (authError || !user) {
//       console.error(' [WEBSITES POST] Unauthorized:', authError);
//       return NextResponse.json(
//         { error: 'Unauthorized' },
//         { status: 401 }
//       );
//     }

//     const body = await req.json();
//     const { name, url, domain, description } = body;

//     console.log(' [WEBSITES POST] Request body:', body);

//     if (!name || !url || !domain) {
//       return NextResponse.json(
//         { error: 'Name, URL, and domain are required' },
//         { status: 400 }
//       );
//     }

//     // Generate website ID
//     const websiteId = `ws_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;

//     // Generate API token
//     const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
//     const random = Array.from({ length: 24 }, () => 
//       chars[Math.floor(Math.random() * chars.length)]
//     ).join("");
//     const apiToken = `sigme_${websiteId}_live_${random}`;

//     // VAPID key (from your config)
//     const vapidPublicKey = "BPB0HWKOKaG0V6xpWcnoaZvnJZCRl1OYfyUXFS7Do7OzJpW6WPoJQyd__u3KVDBDJlINatfLcmNwdF6kS5niPWI";

//     // Insert website
//     const { data: website, error } = await supabase
//       .from('websites')
//       .insert({
//         id: websiteId,
//         user_id: user.id,
//         name,
//         url,
//         domain,
//         description: description || null,
//         vapid_public_key: vapidPublicKey,
//         vapid_private_key: 'STORED_IN_SECRETS', // Private key in env
//         api_token: apiToken,
//         status: 'active',
//         is_verified: false,
//       })
//       .select()
//       .single();

//     if (error) {
//       console.error(' [WEBSITES POST] Database error:', error);
//       return NextResponse.json(
//         { error: error.message },
//         { status: 500 }
//       );
//     }

//     console.log(' [WEBSITES POST] Success:', website);

//     return NextResponse.json({
//       success: true,
//       website,
//     });

//   } catch (err: any) {
//     console.error(' [WEBSITES POST] Error:', err);
//     return NextResponse.json(
//       { error: err.message || 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }


// app/api/websites/route.ts - FIXED VERSION WITH JWT AUTH
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// ==========================================
// GET - List all websites for authenticated user
// ==========================================
export const GET = withAuth(async (req: NextRequest, user: AuthUser) => {
  try {
    console.log('[Websites GET] User authenticated:', user.id);
    
    //  Get authenticated Supabase client from request
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

    //  Get authenticated Supabase client from request
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

    console.log('[Websites POST] Success:', data.id);
    
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