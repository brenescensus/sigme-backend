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
// // // // POST /api/websites/[websiteId]/branding/template
// // // export async function POST(
// // //   request: NextRequest,
// // //   { params }: { params: { websiteId: string } }
// // // ) {
// // //   try {
// // //     const supabase = createRouteHandlerClient({ cookies });
    
// // //     // Get current user
// // //     const { data: { user }, error: authError } = await supabase.auth.getUser();
// // //     if (authError || !user) {
// // //       return NextResponse.json(
// // //         { success: false, error: 'Unauthorized' },
// // //         { status: 401 }
// // //       );
// // //     }

// // //     // Parse request body
// // //     const body = await request.json();
// // //     const { templateId } = body;

// // //     if (!templateId) {
// // //       return NextResponse.json(
// // //         { success: false, error: 'Template ID is required' },
// // //         { status: 400 }
// // //       );
// // //     }

// // //     // Verify website ownership
// // //     const { data: website, error: websiteError } = await supabase
// // //       .from('websites')
// // //       .select('id')
// // //       .eq('id', params.websiteId)
// // //       .eq('user_id', user.id)
// // //       .single();

// // //     if (websiteError || !website) {
// // //       return NextResponse.json(
// // //         { success: false, error: 'Website not found' },
// // //         { status: 404 }
// // //       );
// // //     }

// // //     // Get template
// // //     const { data: template, error: templateError } = await supabase
// // //       .from('branding_templates')
// // //       .select('*')
// // //       .eq('id', templateId)
// // //       .eq('is_public', true)
// // //       .single();

// // //     if (templateError || !template) {
// // //       return NextResponse.json(
// // //         { success: false, error: 'Template not found' },
// // //         { status: 404 }
// // //       );
// // //     }

// // //     // Apply template branding to website
// // //     const { data: updatedWebsite, error: updateError } = await supabase
// // //       .from('websites')
// // //       .update({
// // //         notification_branding: template.branding,
// // //         branding_template_id: template.id,
// // //         updated_at: new Date().toISOString(),
// // //       })
// // //       .eq('id', params.websiteId)
// // //       .eq('user_id', user.id)
// // //       .select()
// // //       .single();

// // //     if (updateError || !updatedWebsite) {
// // //       return NextResponse.json(
// // //         { success: false, error: 'Failed to apply template' },
// // //         { status: 500 }
// // //       );
// // //     }

// // //     return NextResponse.json({
// // //       success: true,
// // //       branding: updatedWebsite.notification_branding,
// // //     });
// // //   } catch (error: any) {
// // //     console.error('[Template Apply] Error:', error);
// // //     return NextResponse.json(
// // //       { success: false, error: error.message || 'Internal server error' },
// // //       { status: 500 }
// // //     );
// // //   }
// // // }


// // // ============================================
// // // 4. app/api/websites/[websiteId]/branding/template/route.ts
// // // ============================================
// // import { NextRequest, NextResponse } from 'next/server';
// // import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
// // import { cookies } from 'next/headers';

// // // POST /api/websites/[websiteId]/branding/template
// // export async function POST(
// //   request: NextRequest,
// //   { params }: { params: { websiteId: string } }
// // ) {
// //   try {
// //     const supabase = createRouteHandlerClient({ cookies });
    
// //     // Get current user
// //     const { data: { user }, error: authError } = await supabase.auth.getUser();
// //     if (authError || !user) {
// //       return NextResponse.json(
// //         { success: false, error: 'Unauthorized' },
// //         { status: 401 }
// //       );
// //     }

// //     // Parse request body
// //     const body = await request.json();
// //     const { templateId } = body;

// //     if (!templateId) {
// //       return NextResponse.json(
// //         { success: false, error: 'Template ID is required' },
// //         { status: 400 }
// //       );
// //     }

// //     // Verify website ownership
// //     const { data: website, error: websiteError } = await supabase
// //       .from('websites')
// //       .select('id')
// //       .eq('id', params.websiteId)
// //       .eq('user_id', user.id)
// //       .single();

// //     if (websiteError || !website) {
// //       return NextResponse.json(
// //         { success: false, error: 'Website not found' },
// //         { status: 404 }
// //       );
// //     }

// //     // Get template
// //     const { data: template, error: templateError } = await supabase
// //       .from('branding_templates')
// //       .select('*')
// //       .eq('id', templateId)
// //       .eq('is_public', true)
// //       .single();

// //     if (templateError || !template) {
// //       return NextResponse.json(
// //         { success: false, error: 'Template not found' },
// //         { status: 404 }
// //       );
// //     }

// //     // Apply template branding to website
// //     const { data: updatedWebsite, error: updateError } = await supabase
// //       .from('websites')
// //       .update({
// //         notification_branding: template.branding,
// //         branding_template_id: template.id,
// //         updated_at: new Date().toISOString(),
// //       })
// //       .eq('id', params.websiteId)
// //       .eq('user_id', user.id)
// //       .select()
// //       .single();

// //     if (updateError || !updatedWebsite) {
// //       return NextResponse.json(
// //         { success: false, error: 'Failed to apply template' },
// //         { status: 500 }
// //       );
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       branding: updatedWebsite.notification_branding,
// //     });
// //   } catch (error: any) {
// //     console.error('[Template Apply] Error:', error);
// //     return NextResponse.json(
// //       { success: false, error: error.message || 'Internal server error' },
// //       { status: 500 }
// //     );
// //   }
// // }

// import { NextRequest, NextResponse } from 'next/server';
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
// import { cookies } from 'next/headers';

// // POST /api/websites/[id]/branding/template
// export async function POST(
//   request: NextRequest,
//   { params }: { params: { websiteId: string } }
// ) {
//   try {
//     const supabase = createRouteHandlerClient({ cookies });

//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) {
//       return NextResponse.json(
//         { success: false, error: 'Unauthorized' },
//         { status: 401 }
//       );
//     }

//     const { templateId } = await request.json();
//     if (!templateId) {
//       return NextResponse.json(
//         { success: false, error: 'Template ID required' },
//         { status: 400 }
//       );
//     }

//     // Verify website ownership
//     const { data: website } = await supabase
//       .from('websites')
//       .select('id')
//       .eq('id', params.websiteId)
//       .eq('user_id', user.id)
//       .single();

//     if (!website) {
//       return NextResponse.json(
//         { success: false, error: 'Website not found' },
//         { status: 404 }
//       );
//     }

//     // Fetch template
//     const { data: template } = await supabase
//       .from('branding_templates')
//       .select('id, branding')
//       .eq('id', templateId)
//       .eq('is_public', true)
//       .single();

//     if (!template) {
//       return NextResponse.json(
//         { success: false, error: 'Template not found' },
//         { status: 404 }
//       );
//     }

//     // Apply branding
//     const { data: updatedWebsite, error } = await supabase
//       .from('websites')
//       .update({
//         notification_branding: template.branding,
//         branding_template_id: template.id,
//         updated_at: new Date().toISOString(),
//       })
//       .eq('id', params.websiteId)
//       .select()
//       .single();

//     if (error) {
//       console.error('[Apply Branding]', error);
//       return NextResponse.json(
//         { success: false, error: 'Failed to apply template' },
//         { status: 500 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       branding: updatedWebsite.notification_branding,
//     });
//   } catch (err: any) {
//     console.error('[Apply Branding]', err);
//     return NextResponse.json(
//       { success: false, error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }


import { NextRequest, NextResponse } from 'next/server';
import {
  withAuth,
  getAuthenticatedClient,
  verifyWebsiteOwnership,
} from '@/lib/auth-middleware';

// POST /api/websites/:websiteId/branding/template
export const POST = withAuth(
  async (req: NextRequest, user, { params }: { params: { websiteId: string } }) => {
    try {
      const { templateId } = await req.json();

      if (!templateId) {
        return NextResponse.json(
          { success: false, error: 'Template ID is required' },
          { status: 400 }
        );
      }

      // Verify ownership
      const ownership = await verifyWebsiteOwnership(
        req,
        params.websiteId,
        user.id
      );

      if (!ownership.success) {
        return NextResponse.json(
          { success: false, error: ownership.error },
          { status: 403 }
        );
      }

      const supabase = await getAuthenticatedClient(req);

      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from('branding_templates')
        .select('id, branding')
        .eq('id', templateId)
        .eq('is_public', true)
        .single();

      if (templateError || !template) {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }

      // Apply branding
      const { data: updatedWebsite, error } = await supabase
        .from('websites')
        .update({
          notification_branding: template.branding,
          branding_template_id: template.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.websiteId)
        .select()
        .single();

      if (error) {
        console.error('[Apply Branding]', error);
        return NextResponse.json(
          { success: false, error: 'Failed to apply template' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        branding: updatedWebsite.notification_branding,
      });
    } catch (err: any) {
      console.error('[Apply Branding]', err);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
