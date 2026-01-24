// // ============================================
// // BONUS: app/api/websites/[id]/geo-stats/route.ts
// // GET geographic distribution statistics
// // ============================================
// import { NextRequest, NextResponse } from 'next/server';
// import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

// export const GET = withAuth(
//   async (req: NextRequest, user: AuthUser, context: any) => {
//     try {
//       const params = await context.params;
//       const websiteId = params.id;
//       const { searchParams } = new URL(req.url);
//       const topN = parseInt(searchParams.get('top') || '10');

//       const supabase = await getAuthenticatedClient(req);

//       console.log('[Geo Stats] Fetching geo stats for website:', websiteId);

//       // Verify ownership
//       const { data: website, error: websiteError } = await supabase
//         .from('websites')
//         .select('id, user_id')
//         .eq('id', websiteId)
//         .eq('user_id', user.id)
//         .single();

//       if (websiteError || !website) {
//         console.error('[Geo Stats] Website not found:', websiteError);
//         return NextResponse.json(
//           { error: 'Website not found or access denied' },
//           { status: 404 }
//         );
//       }

//       // Fetch active subscribers with location info
//       const { data: subscribers, error: subsError } = await supabase
//         .from('subscribers')
//         .select('country, city')
//         .eq('website_id', websiteId)
//         .eq('status', 'active');

//       if (subsError) {
//         console.error('[Geo Stats] Error fetching subscribers:', subsError);
//         throw subsError;
//       }

//       // Calculate country distribution
//       const countryCounts = new Map<string, number>();
//       const cityCounts = new Map<string, number>();

//       subscribers?.forEach(sub => {
//         const country = sub.country || 'Unknown';
//         countryCounts.set(country, (countryCounts.get(country) || 0) + 1);

//         if (sub.city) {
//           const cityKey = `${sub.city}, ${country}`;
//           cityCounts.set(cityKey, (cityCounts.get(cityKey) || 0) + 1);
//         }
//       });

//       const total = subscribers?.length || 1;

//       // Format country data
//       const countryData = Array.from(countryCounts.entries())
//         .sort((a, b) => b[1] - a[1])
//         .slice(0, topN)
//         .map(([country, count]) => ({
//           country,
//           subscribers: count,
//           percentage: Math.round((count / total) * 100)
//         }));

//       // Format city data
//       const cityData = Array.from(cityCounts.entries())
//         .sort((a, b) => b[1] - a[1])
//         .slice(0, topN)
//         .map(([city, count]) => ({
//           city,
//           subscribers: count,
//           percentage: Math.round((count / total) * 100)
//         }));

//       console.log('[Geo Stats] Stats:', {
//         total_subscribers: total,
//         countries: countryData.length,
//         cities: cityData.length
//       });

//       return NextResponse.json({
//         success: true,
//         total_subscribers: total,
//         countries: countryData,
//         cities: cityData
//       });

//     } catch (error: any) {
//       console.error('[Geo Stats] Error:', error);
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
 * Get geographic statistics for a website
 * GET /api/websites/[id]/geo-stats?top=6
 */
export async function GET(
  request: NextRequest,
  // { params }: { params: { id: string } }
    context: { params: Promise<{ id: string }> } 

) {
  try {

    const { id: websiteId } = await context.params; 
    const { searchParams } = new URL(request.url);
    const top = parseInt(searchParams.get('top') || '10');

    // Get all subscribers for this website
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select('country')
      .eq('website_id', websiteId)
      .eq('status', 'active')
      .not('country', 'is', null);

    if (error) {
      console.error('[Geo Stats] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch geo stats' },
        { status: 500 }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        countries: []
      });
    }

    // Count by country
    const countryCounts: Record<string, number> = {};
    subscribers.forEach(sub => {
      if (sub.country) {
        countryCounts[sub.country] = (countryCounts[sub.country] || 0) + 1;
      }
    });

    const total = subscribers.length;

    // Sort and get top countries
    const countries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([country, count]) => ({
        country,
        subscribers: count,
        percentage: Math.round((count / total) * 100)
      }));

    return NextResponse.json({
      success: true,
      countries
    });

  } catch (error: any) {
    console.error('[Geo Stats] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch geo stats'
      },
      { status: 500 }
    );
  }
}