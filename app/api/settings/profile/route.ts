// // ============================================
// // app/api/settings/profile/route.ts
// // ============================================
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       const supabase = await getAuthenticatedClient(req);

//       // Get user profile
//       const { data: profile, error: profileError } = await supabase
//         .from('user_profiles')
//         .select('*')
//         .eq('id', user.id)
//         .single();

//       if (profileError && profileError.code !== 'PGRST116') {
//         throw profileError;
//       }

//       // If no profile exists, create one
//       if (!profile) {
//         const { data: newProfile, error: insertError } = await supabase
//           .from('user_profiles')
//           .insert({
//             id: user.id,
//             first_name: '',
//             last_name: '',
//           })
//           .select()
//           .single();

//         if (insertError) throw insertError;

//         return NextResponse.json({
//           success: true,
//           profile: {
//             ...newProfile,
//             email: user.email,
//           },
//         });
//       }

//       return NextResponse.json({
//         success: true,
//         profile: {
//           ...profile,
//           email: user.email,
//         },
//       });
//     } catch (error: any) {
//       console.error('[Settings Profile] Error:', error);
//       return NextResponse.json(
//         { error: 'Failed to fetch profile', details: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );

// export const PATCH = withAuth(
//   async (req: NextRequest, user: AuthUser) => {
//     try {
//       const body = await req.json();
//       const { first_name, last_name, avatar_url, timezone } = body;

//       const supabase = await getAuthenticatedClient(req);

//       const updates: any = {};
//       if (first_name !== undefined) updates.first_name = first_name;
//       if (last_name !== undefined) updates.last_name = last_name;
//       if (avatar_url !== undefined) updates.avatar_url = avatar_url;
//       if (timezone !== undefined) updates.timezone = timezone;

//       const { data, error } = await supabase
//         .from('user_profiles')
//         .update(updates)
//         .eq('id', user.id)
//         .select()
//         .single();

//       if (error) throw error;

//       return NextResponse.json({
//         success: true,
//         profile: {
//           ...data,
//           email: user.email,
//         },
//       });
//     } catch (error: any) {
//       console.error('[Settings Profile Update] Error:', error);
//       return NextResponse.json(
//         { error: 'Failed to update profile', details: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );


// ============================================
// app/api/settings/profile/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// GET - Fetch user profile
export const GET = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const supabase = await getAuthenticatedClient(req);

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            first_name: '',
            last_name: '',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return NextResponse.json({
          success: true,
          profile: { ...newProfile, email: user.email },
        });
      }

      return NextResponse.json({
        success: true,
        profile: { ...profile, email: user.email },
      });
    } catch (error: any) {
      console.error('[Settings Profile] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: error.message },
        { status: 500 }
      );
    }
  }
);

// PATCH - Update user profile
export const PATCH = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const body = await req.json();
      const { first_name, last_name, avatar_url, timezone } = body;

      const supabase = await getAuthenticatedClient(req);

      const updates: any = {};
      if (first_name !== undefined) updates.first_name = first_name;
      if (last_name !== undefined) updates.last_name = last_name;
      if (avatar_url !== undefined) updates.avatar_url = avatar_url;
      if (timezone !== undefined) updates.timezone = timezone;

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        profile: { ...data, email: user.email },
      });
    } catch (error: any) {
      console.error('[Settings Profile Update] Error:', error);
      return NextResponse.json(
        { error: 'Failed to update profile', details: error.message },
        { status: 500 }
      );
    }
  }
);