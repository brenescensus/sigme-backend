// ============================================
// BONUS: app/api/websites/[id]/geo-stats/route.ts
// GET geographic distribution statistics
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

export const GET = withAuth(
  async (req: NextRequest, user: AuthUser, context: any) => {
    try {
      const params = await context.params;
      const websiteId = params.id;
      const { searchParams } = new URL(req.url);
      const topN = parseInt(searchParams.get('top') || '10');

      const supabase = await getAuthenticatedClient(req);

      console.log('[Geo Stats] Fetching geo stats for website:', websiteId);

      // Verify ownership
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('id, user_id')
        .eq('id', websiteId)
        .eq('user_id', user.id)
        .single();

      if (websiteError || !website) {
        console.error('[Geo Stats] Website not found:', websiteError);
        return NextResponse.json(
          { error: 'Website not found or access denied' },
          { status: 404 }
        );
      }

      // Fetch active subscribers with location info
      const { data: subscribers, error: subsError } = await supabase
        .from('subscribers')
        .select('country, city')
        .eq('website_id', websiteId)
        .eq('status', 'active');

      if (subsError) {
        console.error('[Geo Stats] Error fetching subscribers:', subsError);
        throw subsError;
      }

      // Calculate country distribution
      const countryCounts = new Map<string, number>();
      const cityCounts = new Map<string, number>();

      subscribers?.forEach(sub => {
        const country = sub.country || 'Unknown';
        countryCounts.set(country, (countryCounts.get(country) || 0) + 1);

        if (sub.city) {
          const cityKey = `${sub.city}, ${country}`;
          cityCounts.set(cityKey, (cityCounts.get(cityKey) || 0) + 1);
        }
      });

      const total = subscribers?.length || 1;

      // Format country data
      const countryData = Array.from(countryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([country, count]) => ({
          country,
          subscribers: count,
          percentage: Math.round((count / total) * 100)
        }));

      // Format city data
      const cityData = Array.from(cityCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([city, count]) => ({
          city,
          subscribers: count,
          percentage: Math.round((count / total) * 100)
        }));

      console.log('[Geo Stats] Stats:', {
        total_subscribers: total,
        countries: countryData.length,
        cities: cityData.length
      });

      return NextResponse.json({
        success: true,
        total_subscribers: total,
        countries: countryData,
        cities: cityData
      });

    } catch (error: any) {
      console.error('[Geo Stats] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  }
);