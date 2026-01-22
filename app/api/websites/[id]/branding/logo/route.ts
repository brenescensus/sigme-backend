
// // // ============================================
// // // STEP 3: API Route - Logo Upload (FIX YOUR EXISTING ROUTE)
// // // app/api/websites/[id]/branding/logo/route.ts
// // // ============================================

// // import { NextRequest, NextResponse } from 'next/server';
// // import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';
// // import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';

// // export const POST = withAuth(
// //     async (req: NextRequest, user: AuthUser, context: any) => {
// //         try {
// //             const { websiteId } = context.params;

// //             //   const { websiteId } = await context.params;
// //             const supabase = await getAuthenticatedClient(req);

// //             // Verify website ownership
// //             const { data: website, error: websiteError } = await supabase
// //                 .from('websites')
// //                 .select('notification_branding')
// //                 .eq('id', websiteId)
// //                 .eq('user_id', user.id)
// //                 .single();
// // console.log('websiteId:', websiteId);
// // console.log('user.id:', user.id);
// // console.log('websiteError:', websiteError);
// // console.log('website:', website);

// //             if (websiteError || !website) {
// //                 return NextResponse.json(
// //                     { success: false, error: 'Website not found or access denied' },
// //                     { status: 403 }
// //                 );
// //             }

// //             // Parse file
// //             const formData = await req.formData();
// //             const file = formData.get('logo') as File | null;

// //             if (!file) {
// //                 return NextResponse.json(
// //                     { success: false, error: 'No logo file provided' },
// //                     { status: 400 }
// //                 );
// //             }

// //             // Validate
// //             const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
// //             if (!allowedTypes.includes(file.type)) {
// //                 return NextResponse.json(
// //                     { success: false, error: `Invalid file type: ${file.type}` },
// //                     { status: 400 }
// //                 );
// //             }

// //             if (file.size > 5 * 1024 * 1024) {
// //                 return NextResponse.json(
// //                     { success: false, error: 'File too large (>5MB)' },
// //                     { status: 400 }
// //                 );
// //             }

// //             // Upload to Cloudinary if configured
// //             if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
// //                 const buffer = Buffer.from(await file.arrayBuffer());
// //                 const filename = `${websiteId}-${Date.now()}`;

// //                 // Delete old logo
// //                 const branding = website.notification_branding as any;
// //                 const oldPublicId = branding?.cloudinary_public_id;
// //                 if (oldPublicId) {
// //                     await deleteFromCloudinary(oldPublicId).catch(console.warn);
// //                 }

// //                 // Upload new logo
// //                 const { url, publicId } = await uploadToCloudinary(buffer, filename, 'logos');

// //                 // Update database
// //                 const updatedBranding = {
// //                     ...(branding || {}),
// //                     logo_url: url,
// //                     cloudinary_public_id: publicId,
// //                 };

// //                 const { error: updateError } = await supabase
// //                     .from('websites')
// //                     .update({
// //                         notification_branding: updatedBranding,
// //                         updated_at: new Date().toISOString(),
// //                     })
// //                     .eq('id', websiteId)
// //                     .eq('user_id', user.id);

// //                 if (updateError) {
// //                     await deleteFromCloudinary(publicId).catch(console.warn);
// //                     return NextResponse.json(
// //                         { success: false, error: 'Failed to save branding' },
// //                         { status: 500 }
// //                     );
// //                 }

// //                 return NextResponse.json({
// //                     success: true,
// //                     logo_url: url,
// //                     message: 'Logo uploaded successfully'
// //                 });
// //             }

// //             // Fallback: base64 (< 500KB)
// //             if (file.size > 500 * 1024) {
// //                 return NextResponse.json(
// //                     { success: false, error: 'File too large for fallback (<500KB required). Configure Cloudinary.' },
// //                     { status: 400 }
// //                 );
// //             }

// //             const buffer = Buffer.from(await file.arrayBuffer());
// //             const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

// //             const branding = website.notification_branding as any;
// //             const updatedBranding = {
// //                 ...(branding || {}),
// //                 logo_url: dataUri,
// //             };

// //             const { error: updateError } = await supabase
// //                 .from('websites')
// //                 .update({
// //                     notification_branding: updatedBranding,
// //                     updated_at: new Date().toISOString(),
// //                 })
// //                 .eq('id', websiteId)
// //                 .eq('user_id', user.id)


// //             if (updateError) {
// //                 return NextResponse.json(
// //                     { success: false, error: 'Failed to save logo' },
// //                     { status: 500 }
// //                 );
// //             }

// //             return NextResponse.json({
// //                 success: true,
// //                 logo_url: dataUri,
// //                 message: 'Logo saved (fallback mode)',
// //                 warning: 'Configure Cloudinary for production'
// //             });
// //         } catch (err: any) {
// //             console.error('[Branding Logo POST] Error:', err);
// //             return NextResponse.json(
// //                 { success: false, error: err.message || 'Server error' },
// //                 { status: 500 }
// //             );
// //         }
// //     }
// // );

// // // Delete Logo
// // export const DELETE = withAuth(
// //     async (req: NextRequest, user: AuthUser, context: any) => {
// //         try {
// //             //   const { websiteId } = await context.params;
// //             const { websiteId } = context.params;

// //             const supabase = await getAuthenticatedClient(req);

// //             const { data: website, error: websiteError } = await supabase
// //                 .from('websites')
// //                 .select('notification_branding')
// //                 .eq('id', websiteId)
// //                 .eq('user_id', user.id)
// //                 .single();

// //             if (websiteError || !website) {
// //                 return NextResponse.json(
// //                     { success: false, error: 'Website not found' },
// //                     { status: 403 }
// //                 );
// //             }

// //             // Delete from Cloudinary
// //             const branding = website.notification_branding as any;
// //             const publicId = branding?.cloudinary_public_id;
// //             if (publicId) {
// //                 await deleteFromCloudinary(publicId).catch(console.warn);
// //             }

// //             // Remove logo
// //             const updatedBranding = {
// //                 ...(branding || {}),
// //                 logo_url: null,
// //                 cloudinary_public_id: null,
// //             };

// //             const { error: updateError } = await supabase
// //                 .from('websites')
// //                 .update({
// //                     notification_branding: updatedBranding,
// //                     updated_at: new Date().toISOString(),
// //                 })
// //                 .eq('id', websiteId)
// //                 .eq('user_id', user.id);

// //             if (updateError) {
// //                 return NextResponse.json(
// //                     { success: false, error: 'Failed to remove logo' },
// //                     { status: 500 }
// //                 );
// //             }

// //             return NextResponse.json({
// //                 success: true,
// //                 message: 'Logo removed successfully'
// //             });
// //         } catch (err: any) {
// //             console.error('[Branding Logo DELETE] Error:', err);
// //             return NextResponse.json(
// //                 { success: false, error: err.message || 'Server error' },
// //                 { status: 500 }
// //             );
// //         }
// //     }
// // );




// import { NextRequest, NextResponse } from "next/server";
// import { withAuth, getAuthenticatedClient, AuthUser } from "@/lib/auth-middleware";
// import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

// export const runtime = "nodejs";

// /**
//  * POST /api/websites/[id]/branding/logo
//  */
// export const POST = withAuth(
//   async (req: NextRequest, user: AuthUser, context: { params: { id: string } }) => {
//     try {
//       // ✅ FIX: read params from context
//       const websiteId = context.params.id;

//       if (!websiteId) {
//         return NextResponse.json(
//           { success: false, error: "Missing website id" },
//           { status: 400 }
//         );
//       }

//       const supabase = await getAuthenticatedClient(req);

//       // ✅ Verify ownership
//       const { data: website, error } = await supabase
//         .from("websites")
//         .select("notification_branding")
//         .eq("id", websiteId)
//         .eq("user_id", user.id)
//         .single();

//       if (error || !website) {
//         return NextResponse.json(
//           { success: false, error: "Website not found or access denied" },
//           { status: 403 }
//         );
//       }

//       // Parse file
//       const formData = await req.formData();
//       const file = formData.get("file") as File | null;

//       if (!file) {
//         return NextResponse.json(
//           { success: false, error: "No file uploaded" },
//           { status: 400 }
//         );
//       }

//       // Validate
//       if (!file.type.startsWith("image/")) {
//         return NextResponse.json(
//           { success: false, error: "Invalid file type" },
//           { status: 400 }
//         );
//       }

//       if (file.size > 5 * 1024 * 1024) {
//         return NextResponse.json(
//           { success: false, error: "File too large (max 5MB)" },
//           { status: 400 }
//         );
//       }

//       const buffer = Buffer.from(await file.arrayBuffer());
//       const filename = `${websiteId}-${Date.now()}`;

//       const branding = (website.notification_branding || {}) as any;

//       // Delete old logo if exists
//       if (branding.cloudinary_public_id) {
//         await deleteFromCloudinary(branding.cloudinary_public_id).catch(console.warn);
//       }

//       // Upload new logo
//       const { url, publicId } = await uploadToCloudinary(buffer, filename, "logos");

//       const updatedBranding = {
//         ...branding,
//         logo_url: url,
//         cloudinary_public_id: publicId,
//       };

//       // Save to DB
//       const { error: updateError } = await supabase
//         .from("websites")
//         .update({
//           notification_branding: updatedBranding,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", websiteId)
//         .eq("user_id", user.id);

//       if (updateError) {
//         await deleteFromCloudinary(publicId).catch(console.warn);
//         throw updateError;
//       }

//       return NextResponse.json({
//         success: true,
//         logo_url: url,
//       });
//     } catch (err: any) {
//       console.error("[Logo Upload Error]", err);
//       return NextResponse.json(
//         { success: false, error: err.message || "Upload failed" },
//         { status: 500 }
//       );
//     }
//   }
// );

// /**
//  * DELETE /api/websites/[id]/branding/logo
//  */
// export const DELETE = withAuth(
//   async (req: NextRequest, user: AuthUser, context: { params: { id: string } }) => {
//     try {
//       const websiteId = context.params.id;
//       const supabase = await getAuthenticatedClient(req);

//       const { data: website } = await supabase
//         .from("websites")
//         .select("notification_branding")
//         .eq("id", websiteId)
//         .eq("user_id", user.id)
//         .single();

//       if (!website) {
//         return NextResponse.json(
//           { success: false, error: "Website not found" },
//           { status: 404 }
//         );
//       }

//       const branding = (website.notification_branding || {}) as any;

//       if (branding.cloudinary_public_id) {
//         await deleteFromCloudinary(branding.cloudinary_public_id).catch(console.warn);
//       }

//       const { error } = await supabase
//         .from("websites")
//         .update({
//           notification_branding: {
//             ...branding,
//             logo_url: null,
//             cloudinary_public_id: null,
//           },
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", websiteId)
//         .eq("user_id", user.id);

//       if (error) throw error;

//       return NextResponse.json({ success: true });
//     } catch (err: any) {
//       return NextResponse.json(
//         { success: false, error: err.message || "Delete failed" },
//         { status: 500 }
//       );
//     }
//   }
// );

import { NextRequest, NextResponse } from "next/server";
import { withAuth, getAuthenticatedClient, AuthUser } from "@/lib/auth-middleware";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

/**
 * POST /api/websites/[id]/branding/logo
 */
export const POST = withAuth(
  async (
    req: NextRequest,
    user: AuthUser,
    context: { params: Promise<{ id: string }> }
  ) => {
    try {
      // ✅ FIX: await params (Next.js 15+ requirement)
      const { id: websiteId } = await context.params;

      if (!websiteId) {
        return NextResponse.json(
          { success: false, error: "Missing website id" },
          { status: 400 }
        );
      }

      const supabase = await getAuthenticatedClient(req);

      // Verify ownership
      const { data: website, error } = await supabase
        .from("websites")
        .select("notification_branding")
        .eq("id", websiteId)
        .eq("user_id", user.id)
        .single();

      if (error || !website) {
        return NextResponse.json(
          { success: false, error: "Website not found or access denied" },
          { status: 403 }
        );
      }

      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file uploaded" },
          { status: 400 }
        );
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { success: false, error: "Invalid file type" },
          { status: 400 }
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: "File too large (max 5MB)" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${websiteId}-${Date.now()}`;

      const branding = (website.notification_branding || {}) as any;

      if (branding.cloudinary_public_id) {
        await deleteFromCloudinary(branding.cloudinary_public_id).catch(console.warn);
      }

      const { url, publicId } = await uploadToCloudinary(buffer, filename, "logos");

      const updatedBranding = {
        ...branding,
        logo_url: url,
        cloudinary_public_id: publicId,
      };

      const { error: updateError } = await supabase
        .from("websites")
        .update({
          notification_branding: updatedBranding,
          updated_at: new Date().toISOString(),
        })
        .eq("id", websiteId)
        .eq("user_id", user.id);

      if (updateError) {
        await deleteFromCloudinary(publicId).catch(console.warn);
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        logo_url: url,
      });
    } catch (err: any) {
      console.error("[Logo Upload Error]", err);
      return NextResponse.json(
        { success: false, error: err.message || "Upload failed" },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/websites/[id]/branding/logo
 */
export const DELETE = withAuth(
  async (
    req: NextRequest,
    user: AuthUser,
    context: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id: websiteId } = await context.params;
      const supabase = await getAuthenticatedClient(req);

      const { data: website } = await supabase
        .from("websites")
        .select("notification_branding")
        .eq("id", websiteId)
        .eq("user_id", user.id)
        .single();

      if (!website) {
        return NextResponse.json(
          { success: false, error: "Website not found" },
          { status: 404 }
        );
      }

      const branding = (website.notification_branding || {}) as any;

      if (branding.cloudinary_public_id) {
        await deleteFromCloudinary(branding.cloudinary_public_id).catch(console.warn);
      }

      const { error } = await supabase
        .from("websites")
        .update({
          notification_branding: {
            ...branding,
            logo_url: null,
            cloudinary_public_id: null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", websiteId)
        .eq("user_id", user.id);

      if (error) throw error;

      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Delete failed" },
        { status: 500 }
      );
    }
  }
);
