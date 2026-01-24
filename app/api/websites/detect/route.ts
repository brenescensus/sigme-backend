// // app/api/websites/detect/route.ts
// // Public endpoint - no auth required (called from external websites)
// // FIXED: Returns most recent website when multiple domains match

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import { withCors } from '@/lib/auth-middleware';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export const GET = withCors(async (req: NextRequest) => {
//   try {
//     const domain = req.nextUrl.searchParams.get('domain');
    
//     if (!domain) {
//       console.log('🔴 [Detect Website] Missing domain parameter');
//       return NextResponse.json(
//         { success: false, error: 'Domain parameter required' },
//         { status: 400 }
//       );
//     }

//     // Normalize domain (remove www, but KEEP port numbers for localhost)
//     let normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    
//     // Only remove port for non-localhost domains
//     if (!normalizedDomain.startsWith('localhost')) {
//       normalizedDomain = normalizedDomain.replace(/:\d+$/, '');
//     }

//     console.log('🔍 [Detect Website] Normalized domain:', normalizedDomain);

//     // Find ALL matching websites, ordered by most recent first
//     const { data: websites, error } = await supabase
//       .from('websites')
//       .select('id, name, url, domain, notification_branding, created_at')
//       .or(`domain.eq.${normalizedDomain},url.ilike.%${normalizedDomain}%`)
//       .eq('status', 'active')
//       .order('created_at', { ascending: false }); // Most recent first

//     if (error) {
//       console.error('🔴 [Detect Website] Database error:', error);
//       return NextResponse.json(
//         { success: false, error: 'Database error' },
//         { status: 500 }
//       );
//     }

//     if (!websites || websites.length === 0) {
//       console.log('🔴 [Detect Website] Not found:', normalizedDomain);
//       return NextResponse.json(
//         { success: false, error: 'Website not found or inactive' },
//         { status: 404 }
//       );
//     }

//     // Use the most recent website (first in the list)
//     const website = websites[0];

//     if (websites.length > 1) {
//       console.log(`⚠️ [Detect Website] Found ${websites.length} websites with domain "${normalizedDomain}", using most recent: ${website.name} (${website.id})`);
//     } else {
//       console.log('✅ [Detect Website] Found website:', website.name);
//     }

//     // ⭐ FIX: Use NEXT_PUBLIC_ prefix instead of VITE_
//     const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
//     const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

//     // Log for debugging
//     console.log('🔑 [Detect Website] VAPID Public Key available:', !!vapidPublicKey);
//     console.log('🌐 [Detect Website] API URL:', apiUrl);

//     if (!vapidPublicKey) {
//       console.error('🔴 [Detect Website] VAPID public key not configured!');
//     }

//     // Return configuration
//     return NextResponse.json({
//       success: true,
//       config: {
//         websiteId: website.id,
//         websiteName: website.name,
//         vapidPublicKey: vapidPublicKey,
//         apiUrl: apiUrl,
//         branding: website.notification_branding || {
//           primary_color: '#3b82f6',
//           secondary_color: '#1d4ed8',
//           logo_url: null,
//           font_family: 'system-ui',
//           button_style: 'rounded',
//           notification_position: 'top-right',
//           animation_style: 'slide',
//           show_logo: true,
//           show_branding: false,
//         }
//       }
//     });

//   } catch (err: any) {
//     console.error('🔴 [Detect Website] Error:', err);
//     return NextResponse.json(
//       { success: false, error: err.message || 'Server error' },
//       { status: 500 }
//     );
//   }
// });

// app/api/websites/detect/route.ts
// Public endpoint - no auth required (called from external websites)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withPublicCors } from '@/lib/auth-middleware';
import type { Database } from '@/types/database';

async function handler(req: NextRequest) {
  try {
    const domain = req.nextUrl.searchParams.get('domain');

    if (!domain) {
      console.log('🔴 [Detect Website] Missing domain parameter');
      return NextResponse.json(
        { success: false, error: 'Domain parameter required' },
        { status: 400 }
      );
    }

    // Use service role for public access
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Normalize domain (remove www, but KEEP port numbers for localhost)
    let normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    
    // Only remove port for non-localhost domains
    if (!normalizedDomain.startsWith('localhost')) {
      normalizedDomain = normalizedDomain.replace(/:\d+$/, '');
    }

    console.log('🔍 [Detect Website] Looking for domain:', normalizedDomain);

    // Find ALL matching websites, ordered by most recent first
    const { data: websites, error } = await supabase
      .from('websites')
      .select('id, name, url, domain, notification_branding, created_at')
      .or(`domain.eq.${normalizedDomain},url.ilike.%${normalizedDomain}%`)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🔴 [Detect Website] Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    if (!websites || websites.length === 0) {
      console.log('🔴 [Detect Website] Not found:', normalizedDomain);
      return NextResponse.json(
        { success: false, error: 'Website not found or inactive' },
        { status: 404 }
      );
    }

    // Use the most recent website (first in the list)
    const website = websites[0];

    if (websites.length > 1) {
      console.log(`⚠️ [Detect Website] Found ${websites.length} websites, using most recent: ${website.name}`);
    } else {
      console.log('✅ [Detect Website] Found:', website.name);
    }

    // Get VAPID public key from environment
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_APP_URL;

    if (!vapidPublicKey) {
      console.error('🔴 [Detect Website] VAPID public key not configured!');
      return NextResponse.json(
        { success: false, error: 'Server configuration error - VAPID key missing' },
        { status: 500 }
      );
    }

    console.log('✅ [Detect Website] Sending config for:', website.name);

    // Return configuration
    return NextResponse.json({
      success: true,
      config: {
        websiteId: website.id,
        websiteName: website.name,
        vapidPublicKey: vapidPublicKey,
        apiUrl: apiUrl,
        branding: website.notification_branding || {
          primary_color: '#3b82f6',
          secondary_color: '#1d4ed8',
          logo_url: null,
          font_family: 'system-ui',
          button_style: 'rounded',
          notification_position: 'top-right',
          animation_style: 'slide',
          show_logo: true,
          show_branding: false,
        }
      }
    });

  } catch (err: any) {
    console.error('🔴 [Detect Website] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}

// Export with public CORS (allows ANY origin)
export const GET = withPublicCors(handler);