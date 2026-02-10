// app/api/subscribers/locations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

async function handleGet(req: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('website_id') || searchParams.get('websiteId');

    if (!websiteId) {
      return NextResponse.json(
        { success: false, error: 'Website ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getAuthenticatedClient(req);

    // ✅ Verify website ownership
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (websiteError || !website) {
      return NextResponse.json(
        { success: false, error: 'Website not found or unauthorized' },
        { status: 404 }
      );
    }

    // 🔥 Fetch all active subscribers with location data
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select('country, city')
      .eq('website_id', websiteId)
      .eq('status', 'active')
      .not('country', 'is', null)
      .not('country', 'eq', '');

    if (error) {
      console.error('[API] Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch subscribers' },
        { status: 500 }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        locations: {
          countries: [],
          cities: [],
        },
        total_subscribers: 0,
      });
    }

    // 🔥 Aggregate countries and cities
    const countryMap = new Map<string, number>();
    const cityMap = new Map<string, number>();

    subscribers.forEach((sub) => {
      // Count countries
      if (sub.country) {
        const country = sub.country.trim();
        countryMap.set(country, (countryMap.get(country) || 0) + 1);
      }

      // Count cities
      if (sub.city) {
        const city = sub.city.trim();
        cityMap.set(city, (cityMap.get(city) || 0) + 1);
      }
    });

    // 🔥 Convert to sorted arrays (most popular first)
    const countries = Array.from(countryMap.entries())
      .map(([country, count]) => ({ country, city: '', count }))
      .sort((a, b) => b.count - a.count);

    const cities = Array.from(cityMap.entries())
      .map(([city, count]) => ({ country: '', city, count }))
      .sort((a, b) => b.count - a.count);

    console.log(`[API] Found ${countries.length} countries and ${cities.length} cities for website ${websiteId}`);

    return NextResponse.json({
      success: true,
      locations: {
        countries,
        cities,
      },
      total_subscribers: subscribers.length,
    });

  } catch (error: any) {
    console.error('[API] Error fetching subscriber locations:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscribers/locations?website_id=xxx
 * Returns unique countries and cities from active subscribers
 */
export async function GET(req: NextRequest) {
  return withAuth(handleGet)(req);
}