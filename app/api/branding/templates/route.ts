// // // // ============================================
// // // // 3. app/api/branding/templates/route.ts
// // // // ============================================
// // // import { NextRequest, NextResponse } from 'next/server';
// // // import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
// // // import { cookies } from 'next/headers';

// // // // GET /api/branding/templates
// // // export async function GET(request: NextRequest) {
// // //   try {
// // //     const supabase = createRouteHandlerClient({ cookies });
    
// // //     // Get current user (optional for public templates)
// // //     const { data: { user }, error: authError } = await supabase.auth.getUser();
// // //     if (authError || !user) {
// // //       return NextResponse.json(
// // //         { success: false, error: 'Unauthorized' },
// // //         { status: 401 }
// // //       );
// // //     }

// // //     // Get query params
// // //     const searchParams = request.nextUrl.searchParams;
// // //     const category = searchParams.get('category');

// // //     // Query templates
// // //     let query = supabase
// // //       .from('branding_templates')
// // //       .select('*')
// // //       .eq('is_public', true);

// // //     if (category) {
// // //       query = query.eq('category', category);
// // //     }

// // //     const { data: templates, error: templatesError } = await query;

// // //     if (templatesError) {
// // //       console.error('[Templates] Query error:', templatesError);
// // //       return NextResponse.json(
// // //         { success: false, error: 'Failed to fetch templates' },
// // //         { status: 500 }
// // //       );
// // //     }

// // //     return NextResponse.json({
// // //       success: true,
// // //       templates: templates || [],
// // //     });
// // //   } catch (error: any) {
// // //     console.error('[Templates] Error:', error);
// // //     return NextResponse.json(
// // //       { success: false, error: error.message || 'Internal server error' },
// // //       { status: 500 }
// // //     );
// // //   }
// // // }


// // import { NextRequest, NextResponse } from 'next/server';
// // import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
// // import { cookies } from 'next/headers';

// // // GET /api/branding/templates
// // export async function GET(request: NextRequest) {
// //   try {
// //     const supabase = createRouteHandlerClient({ cookies });

// //     // Auth optional – but recommended
// //     const { data: { user } } = await supabase.auth.getUser();
// //     if (!user) {
// //       return NextResponse.json(
// //         { success: false, error: 'Unauthorized' },
// //         { status: 401 }
// //       );
// //     }

// //     const category = request.nextUrl.searchParams.get('category');

// //     let query = supabase
// //       .from('branding_templates')
// //       .select('*')
// //       .eq('is_public', true);

// //     if (category) {
// //       query = query.eq('category', category);
// //     }

// //     const { data, error } = await query;

// //     if (error) {
// //       console.error('[Branding Templates]', error);
// //       return NextResponse.json(
// //         { success: false, error: 'Failed to fetch templates' },
// //         { status: 500 }
// //       );
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       templates: data ?? [],
// //     });
// //   } catch (err: any) {
// //     console.error('[Branding Templates]', err);
// //     return NextResponse.json(
// //       { success: false, error: 'Internal server error' },
// //       { status: 500 }
// //     );
// //   }
// // }


// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient } from '@/lib/auth-middleware';

// // GET /api/branding/templates
// export const GET = withAuth(async (req: NextRequest, user) => {
//   try {
//     const supabase = await getAuthenticatedClient(req);

//     const category = new URL(req.url).searchParams.get('category');

//     let query = supabase
//       .from('branding_templates')
//       .select('*')
//       .eq('is_public', true);

//     if (category) {
//       query = query.eq('category', category);
//     }

//     const { data, error } = await query;

//     if (error) {
//       console.error('[Branding Templates]', error);
//       return NextResponse.json(
//         { success: false, error: 'Failed to fetch templates' },
//         { status: 500 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       templates: data ?? [],
//     });
//   } catch (err: any) {
//     console.error('[Branding Templates]', err);
//     return NextResponse.json(
//       { success: false, error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// });
// ============================================
// STEP 4: API Route - Templates
// app/api/branding/templates/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient } from '@/lib/auth-middleware';

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const supabase = await getAuthenticatedClient(req);

      const { data, error } = await supabase
        .from('branding_templates')
        .select('*')
        .eq('is_public', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('[Templates GET] Error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch templates' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        templates: data || []
      });
    } catch (err: any) {
      console.error('[Templates GET] Error:', err);
      return NextResponse.json(
        { success: false, error: err.message || 'Server error' },
        { status: 500 }
      );
    }
  }
);
