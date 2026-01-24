// // BONUS: app/api/websites/[id]/device-stats/route.ts
// // GET device distribution statistics
// // ============================================
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser, context: any) => {
//     try {
//       const params = await context.params;
//       const websiteId = params.id;

//       const supabase = await getAuthenticatedClient(req);

//       console.log('[Device Stats] Fetching device stats for website:', websiteId);

//       // Verify ownership
//       const { data: website, error: websiteError } = await supabase
//         .from('websites')
//         .select('id, user_id')
//         .eq('id', websiteId)
//         .eq('user_id', user.id)
//         .single();

//       if (websiteError || !website) {
//         console.error('[Device Stats] Website not found:', websiteError);
//         return NextResponse.json(
//           { error: 'Website not found or access denied' },
//           { status: 404 }
//         );
//       }

//       // Fetch active subscribers with device info
//       const { data: subscribers, error: subsError } = await supabase
//         .from('subscribers')
//         .select('device_type, browser, os, platform')
//         .eq('website_id', websiteId)
//         .eq('status', 'active');

//       if (subsError) {
//         console.error('[Device Stats] Error fetching subscribers:', subsError);
//         throw subsError;
//       }

//       // Calculate device distribution
//       const deviceCounts = { Desktop: 0, Mobile: 0, Tablet: 0 };
//       const browserCounts = new Map<string, number>();
//       const osCounts = new Map<string, number>();

//       subscribers?.forEach(sub => {
//         // Device type
//         const deviceType = sub.device_type?.toLowerCase() || 'desktop';
//         if (deviceType.includes('mobile') || deviceType.includes('phone')) {
//           deviceCounts.Mobile++;
//         } else if (deviceType.includes('tablet')) {
//           deviceCounts.Tablet++;
//         } else {
//           deviceCounts.Desktop++;
//         }

//         // Browser
//         const browser = sub.browser || 'Other';
//         browserCounts.set(browser, (browserCounts.get(browser) || 0) + 1);

//         // OS
//         const os = sub.os || 'Other';
//         osCounts.set(os, (osCounts.get(os) || 0) + 1);
//       });

//       const total = subscribers?.length || 1;

//       // Format device data
//       const deviceData = [
//         { 
//           name: 'Desktop', 
//           value: Math.round((deviceCounts.Desktop / total) * 100),
//           count: deviceCounts.Desktop,
//           color: 'hsl(199, 89%, 48%)' 
//         },
//         { 
//           name: 'Mobile', 
//           value: Math.round((deviceCounts.Mobile / total) * 100),
//           count: deviceCounts.Mobile,
//           color: 'hsl(142, 71%, 45%)' 
//         },
//         { 
//           name: 'Tablet', 
//           value: Math.round((deviceCounts.Tablet / total) * 100),
//           count: deviceCounts.Tablet,
//           color: 'hsl(38, 92%, 50%)' 
//         },
//       ];

//       // Format browser data (top 5)
//       const browserData = Array.from(browserCounts.entries())
//         .sort((a, b) => b[1] - a[1])
//         .slice(0, 5)
//         .map(([name, users]) => ({ name, users }));

//       // Format OS data (top 5)
//       const osData = Array.from(osCounts.entries())
//         .sort((a, b) => b[1] - a[1])
//         .slice(0, 5)
//         .map(([name, users]) => ({ name, users }));

//       console.log('[Device Stats] Stats:', {
//         total_subscribers: total,
//         devices: deviceData,
//         browsers: browserData.length,
//         operating_systems: osData.length
//       });

//       return NextResponse.json({
//         success: true,
//         total_subscribers: total,
//         devices: deviceData,
//         browsers: browserData,
//         operating_systems: osData
//       });

//     } catch (error: any) {
//       console.error('[Device Stats] Error:', error);
//       return NextResponse.json(
//         { error: 'Internal server error', details: error.message },
//         { status: 500 }
//       );
//     }
//   }
// );

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get device and browser statistics for a website
 * GET /api/websites/[id]/device-stats
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } 
) {
  try {
    // const { id: websiteId } = params;
    const { id: websiteId } = await context.params; 

    // Get all subscribers for this website
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select('browser, os, platform')
      .eq('website_id', websiteId)
      .eq('status', 'active');

    if (error) {
      console.error('[Device Stats] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch device stats' },
        { status: 500 }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        devices: [],
        browsers: []
      });
    }

    // Count devices (based on OS or platform)
    const deviceCounts: Record<string, number> = {};
    const browserCounts: Record<string, number> = {};

    subscribers.forEach(sub => {
      // Determine device type from OS
      let deviceType = 'Desktop';
      if (sub.os) {
        const os = sub.os.toLowerCase();
        if (os.includes('android') || os.includes('ios')) {
          deviceType = 'Mobile';
        } else if (os.includes('ipad')) {
          deviceType = 'Tablet';
        }
      }
      deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1;

      // Count browsers
      if (sub.browser) {
        browserCounts[sub.browser] = (browserCounts[sub.browser] || 0) + 1;
      }
    });

    const total = subscribers.length;

    // Format device data for pie chart
    const deviceColors: Record<string, string> = {
      'Desktop': 'hsl(199, 89%, 48%)',
      'Mobile': 'hsl(142, 71%, 45%)',
      'Tablet': 'hsl(38, 92%, 50%)'
    };

    const devices = Object.entries(deviceCounts).map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
      count,
      color: deviceColors[name] || 'hsl(0, 0%, 50%)'
    }));

    // Format browser data for bar chart
    const browsers = Object.entries(browserCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, users]) => ({
        name,
        users
      }));

    return NextResponse.json({
      success: true,
      devices,
      browsers
    });

  } catch (error: any) {
    console.error('[Device Stats] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch device stats'
      },
      { status: 500 }
    );
  }
}