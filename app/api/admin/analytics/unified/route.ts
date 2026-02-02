// // app/api/admin/analytics/unified/route.ts
// // Unified Analytics API - Replaces both /overview and /analytics endpoints

// import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';
// import { NextRequest, NextResponse } from 'next/server';

// interface TimeRange {
//   start: Date;
//   end: Date;
//   interval: 'hour' | 'day' | 'month';
// }

// function parseTimeRange(timeRange: string): TimeRange {
//   const end = new Date();
//   let start: Date;
//   let interval: 'hour' | 'day' | 'month';

//   switch (timeRange) {
//     case '24h':
//       start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
//       interval = 'hour';
//       break;
//     case '7d':
//       start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
//       interval = 'day';
//       break;
//     case '30d':
//       start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
//       interval = 'day';
//       break;
//     case '90d':
//       start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
//       interval = 'month';
//       break;
//     case '1y':
//       start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
//       interval = 'month';
//       break;
//     default:
//       start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
//       interval = 'day';
//   }

//   return { start, end, interval };
// }

// export const GET = withSuperAdmin(async (req, user) => {
//   const supabase = getAdminClient();

//   try {
//     const { searchParams } = new URL(req.url);
//     const timeRangeParam = searchParams.get('timeRange') || '30d';
//     const timeRange = parseTimeRange(timeRangeParam);

//     console.log('[Unified Analytics] Fetching for time range:', timeRangeParam);

//     // ===========================================
//     // SECTION 1: OVERVIEW METRICS
//     // ===========================================

//     // Get all users
//     const { data: { users: allUsers } } = await supabase.auth.admin.listUsers();
    
//     const totalUsers = allUsers?.filter(u => 
//       !['admin', 'super_admin'].includes(u.user_metadata?.role || 'user')
//     ).length || 0;

//     // Get users from previous period for comparison
//     const previousPeriodStart = new Date(
//       timeRange.start.getTime() - (timeRange.end.getTime() - timeRange.start.getTime())
//     );
    
//     const newUsersThisPeriod = allUsers?.filter(u => {
//       const created = new Date(u.created_at);
//       return created >= timeRange.start && created <= timeRange.end;
//     }).length || 0;

//     const newUsersPreviousPeriod = allUsers?.filter(u => {
//       const created = new Date(u.created_at);
//       return created >= previousPeriodStart && created < timeRange.start;
//     }).length || 0;

//     const userGrowthPercent = newUsersPreviousPeriod > 0
//       ? ((newUsersThisPeriod - newUsersPreviousPeriod) / newUsersPreviousPeriod * 100).toFixed(1)
//       : 0;

//     // Revenue metrics
//     const { data: billingData } = await supabase
//       .from('billing_history')
//       .select('amount, created_at')
//       .gte('created_at', timeRange.start.toISOString())
//       .lte('created_at', timeRange.end.toISOString());

//     const totalRevenue = billingData?.reduce((sum, r) => sum + r.amount, 0) || 0;

//     const { data: previousBillingData } = await supabase
//       .from('billing_history')
//       .select('amount')
//       .gte('created_at', previousPeriodStart.toISOString())
//       .lt('created_at', timeRange.start.toISOString());

//     const previousRevenue = previousBillingData?.reduce((sum, r) => sum + r.amount, 0) || 0;
//     const revenueChange = previousRevenue > 0
//       ? ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
//       : 0;

//     // ARPU (Average Revenue Per User)
//     const { count: paidUsers } = await supabase
//       .from('user_subscriptions')
//       .select('*', { count: 'exact', head: true })
//       .neq('plan_tier', 'free')
//       .eq('status', 'active');

//     const arpu = paidUsers && paidUsers > 0 ? (totalRevenue / paidUsers).toFixed(2) : 0;

//     // Website metrics
//     const { count: totalWebsites } = await supabase
//       .from('websites')
//       .select('*', { count: 'exact', head: true });

//     const { count: newWebsites } = await supabase
//       .from('websites')
//       .select('*', { count: 'exact', head: true })
//       .gte('created_at', timeRange.start.toISOString());

//     // Subscriber metrics
//     const { count: totalSubscribers } = await supabase
//       .from('subscribers')
//       .select('*', { count: 'exact', head: true });

//     // ===========================================
//     // SECTION 2: USER GROWTH TREND (REAL DATA!)
//     // ===========================================

//     const { data: userGrowthData } = await supabase.rpc('get_user_growth', {
//       p_interval: timeRange.interval,
//       p_start_date: timeRange.start.toISOString(),
//       p_end_date: timeRange.end.toISOString(),
//     });

//     // ===========================================
//     // SECTION 3: PLAN DISTRIBUTION (REAL DATA!)
//     // ===========================================

//     const { data: planDistributionData } = await supabase.rpc('get_plan_distribution');

//     // ===========================================
//     // SECTION 4: GEOGRAPHY DATA
//     // ===========================================

//     const { data: geoData } = await supabase.rpc('get_user_geography');

//     const countryMap = new Map<string, number>();
//     const cityMap = new Map<string, { country: string; count: number }>();

//     if (geoData) {
//       geoData.forEach((row: any) => {
//         const country = row.country || 'Unknown';
//         countryMap.set(country, (countryMap.get(country) || 0) + 1);

//         const city = row.city || 'Unknown';
//         const cityKey = `${city}, ${country}`;
//         if (!cityMap.has(cityKey)) {
//           cityMap.set(cityKey, { country, count: 0 });
//         }
//         cityMap.get(cityKey)!.count++;
//       });
//     }

//     const totalGeoUsers = geoData?.length || 1;
//     const countries = Array.from(countryMap.entries())
//       .map(([country, count]) => ({
//         country,
//         user_count: count,
//         percentage: parseFloat(((count / totalGeoUsers) * 100).toFixed(1)),
//       }))
//       .sort((a, b) => b.user_count - a.user_count);

//     const cities = Array.from(cityMap.entries())
//       .map(([cityKey, data]) => ({
//         city: cityKey.split(',')[0],
//         country: data.country,
//         user_count: data.count,
//       }))
//       .sort((a, b) => b.user_count - a.user_count);

//     // ===========================================
//     // SECTION 5: DEVICE DATA
//     // ===========================================

//     const { data: deviceData } = await supabase.rpc('get_user_devices');

//     const deviceTypeMap = new Map<string, number>();
//     const browserMap = new Map<string, number>();
//     const osMap = new Map<string, number>();

//     if (deviceData) {
//       deviceData.forEach((row: any) => {
//         const deviceType = row.device_type || 'unknown';
//         deviceTypeMap.set(deviceType, (deviceTypeMap.get(deviceType) || 0) + 1);

//         const browser = row.browser || 'Unknown';
//         browserMap.set(browser, (browserMap.get(browser) || 0) + 1);

//         const os = row.os || 'Unknown';
//         osMap.set(os, (osMap.get(os) || 0) + 1);
//       });
//     }

//     const totalDevices = deviceData?.length || 1;
//     const deviceTypes = Array.from(deviceTypeMap.entries())
//       .map(([type, count]) => ({
//         type,
//         count,
//         percentage: parseFloat(((count / totalDevices) * 100).toFixed(1)),
//       }))
//       .sort((a, b) => b.count - a.count);

//     const browsers = Array.from(browserMap.entries())
//       .map(([name, count]) => ({
//         name,
//         count,
//         percentage: parseFloat(((count / totalDevices) * 100).toFixed(1)),
//       }))
//       .sort((a, b) => b.count - a.count);

//     const operatingSystems = Array.from(osMap.entries())
//       .map(([name, count]) => ({
//         name,
//         count,
//         percentage: parseFloat(((count / totalDevices) * 100).toFixed(1)),
//       }))
//       .sort((a, b) => b.count - a.count);

//     // ===========================================
//     // SECTION 6: SYSTEM HEALTH
//     // ===========================================

//     const { count: totalNotifications } = await supabase
//       .from('notification_logs')
//       .select('*', { count: 'exact', head: true })
//       .gte('sent_at', timeRange.start.toISOString());

//     const { count: activeCampaigns } = await supabase
//       .from('campaigns')
//       .select('*', { count: 'exact', head: true })
//       .eq('status', 'active');

//     const { count: totalJourneys } = await supabase
//       .from('journeys')
//       .select('*', { count: 'exact', head: true })
//       .eq('status', 'active');

//     // Log activity
//     await logAdminActivity(user.id, 'VIEW_ANALYTICS', 'analytics', null, {
//       timeRange: timeRangeParam,
//     });

//     // ===========================================
//     // RETURN UNIFIED RESPONSE
//     // ===========================================

//     return NextResponse.json({
//       success: true,
      
//       // Overview metrics with trends
//       overview: {
//         total_users: totalUsers,
//         new_users_this_period: newUsersThisPeriod,
//         user_growth_percent: parseFloat(userGrowthPercent),
//         total_revenue: totalRevenue,
//         revenue_change: parseFloat(revenueChange),
//         arpu: parseFloat(arpu),
//         total_websites: totalWebsites || 0,
//         new_websites_this_period: newWebsites || 0,
//         total_subscribers: totalSubscribers || 0,
//       },

//       // Real user growth data (not hardcoded!)
//       trends: {
//         user_growth: userGrowthData || [],
//         plan_distribution: planDistributionData || [],
//       },

//       // Geography insights
//       geography: {
//         total_countries: countries.length,
//         total_cities: cities.length,
//         countries,
//         cities,
//       },

//       // Device insights
//       devices: {
//         total_devices: deviceTypes.reduce((sum, d) => sum + d.count, 0),
//         most_common: deviceTypes[0]?.type || 'unknown',
//         types: deviceTypes,
//         browsers,
//         operating_systems: operatingSystems,
//       },

//       // System health
//       system_health: {
//         total_notifications: totalNotifications || 0,
//         active_campaigns: activeCampaigns || 0,
//         active_journeys: totalJourneys || 0,
//       },

//       // Metadata
//       metadata: {
//         time_range: timeRangeParam,
//         start_date: timeRange.start.toISOString(),
//         end_date: timeRange.end.toISOString(),
//         interval: timeRange.interval,
//       },
//     });

//   } catch (error: any) {
//     console.error('[Unified Analytics] Error:', error);
//     return NextResponse.json(
//       { success: false, error: error.message || 'Failed to fetch analytics' },
//       { status: 500 }
//     );
//   }
// });





// app/api/admin/analytics/unified/route.ts
// Unified Analytics API - Replaces both /overview and /analytics endpoints
// FIXED: TypeScript type errors

import { withSuperAdmin, logAdminActivity, getAdminClient } from '@/lib/admin-middleware';
import { NextRequest, NextResponse } from 'next/server';

interface TimeRange {
  start: Date;
  end: Date;
  interval: 'hour' | 'day' | 'month';
}

function parseTimeRange(timeRange: string): TimeRange {
  const end = new Date();
  let start: Date;
  let interval: 'hour' | 'day' | 'month';

  switch (timeRange) {
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      interval = 'hour';
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      interval = 'day';
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      interval = 'day';
      break;
    case '90d':
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      interval = 'month';
      break;
    case '1y':
      start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
      interval = 'month';
      break;
    default:
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      interval = 'day';
  }

  return { start, end, interval };
}

export const GET = withSuperAdmin(async (req, user) => {
  const supabase = getAdminClient();

  try {
    const { searchParams } = new URL(req.url);
    const timeRangeParam = searchParams.get('timeRange') || '30d';
    const timeRange = parseTimeRange(timeRangeParam);

    console.log('[Unified Analytics] Fetching for time range:', timeRangeParam);

    // ===========================================
    // SECTION 1: OVERVIEW METRICS
    // ===========================================

    // Get all users
    const { data: { users: allUsers } } = await supabase.auth.admin.listUsers();
    
    const totalUsers = allUsers?.filter(u => 
      !['admin', 'super_admin'].includes(u.user_metadata?.role || 'user')
    ).length || 0;

    // Get users from previous period for comparison
    const previousPeriodStart = new Date(
      timeRange.start.getTime() - (timeRange.end.getTime() - timeRange.start.getTime())
    );
    
    const newUsersThisPeriod = allUsers?.filter(u => {
      const created = new Date(u.created_at);
      return created >= timeRange.start && created <= timeRange.end;
    }).length || 0;

    const newUsersPreviousPeriod = allUsers?.filter(u => {
      const created = new Date(u.created_at);
      return created >= previousPeriodStart && created < timeRange.start;
    }).length || 0;

    //  FIX: Ensure result is always a number
    const userGrowthPercent = newUsersPreviousPeriod > 0
      ? Number(((newUsersThisPeriod - newUsersPreviousPeriod) / newUsersPreviousPeriod * 100).toFixed(1))
      : 0;

    // Revenue metrics
    const { data: billingData } = await supabase
      .from('billing_history')
      .select('amount, created_at')
      .gte('created_at', timeRange.start.toISOString())
      .lte('created_at', timeRange.end.toISOString());

    const totalRevenue = billingData?.reduce((sum, r) => sum + r.amount, 0) || 0;

    const { data: previousBillingData } = await supabase
      .from('billing_history')
      .select('amount')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', timeRange.start.toISOString());

    const previousRevenue = previousBillingData?.reduce((sum, r) => sum + r.amount, 0) || 0;
    
    //  FIX: Ensure result is always a number
    const revenueChange = previousRevenue > 0
      ? Number(((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1))
      : 0;

    // ARPU (Average Revenue Per User)
    const { count: paidUsers } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .neq('plan_tier', 'free')
      .eq('status', 'active');

    //  FIX: Ensure result is always a number
    const arpu = paidUsers && paidUsers > 0 
      ? Number((totalRevenue / paidUsers).toFixed(2))
      : 0;

    // Website metrics
    const { count: totalWebsites } = await supabase
      .from('websites')
      .select('*', { count: 'exact', head: true });

    const { count: newWebsites } = await supabase
      .from('websites')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', timeRange.start.toISOString());

    // Subscriber metrics
    const { count: totalSubscribers } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true });

    // ===========================================
    // SECTION 2: USER GROWTH TREND (REAL DATA!)
    // ===========================================

    const { data: userGrowthData } = await supabase.rpc('get_user_growth', {
      p_interval: timeRange.interval,
      p_start_date: timeRange.start.toISOString(),
      p_end_date: timeRange.end.toISOString(),
    });

    // ===========================================
    // SECTION 3: PLAN DISTRIBUTION (REAL DATA!)
    // ===========================================

    const { data: planDistributionData } = await supabase.rpc('get_plan_distribution');

    // ===========================================
    // SECTION 4: GEOGRAPHY DATA
    // ===========================================

    const { data: geoData } = await supabase.rpc('get_user_geography');

    const countryMap = new Map<string, number>();
    const cityMap = new Map<string, { country: string; count: number }>();

    if (geoData) {
      geoData.forEach((row: any) => {
        const country = row.country || 'Unknown';
        countryMap.set(country, (countryMap.get(country) || 0) + 1);

        const city = row.city || 'Unknown';
        const cityKey = `${city}, ${country}`;
        if (!cityMap.has(cityKey)) {
          cityMap.set(cityKey, { country, count: 0 });
        }
        cityMap.get(cityKey)!.count++;
      });
    }

    const totalGeoUsers = geoData?.length || 1;
    const countries = Array.from(countryMap.entries())
      .map(([country, count]) => ({
        country,
        user_count: count,
        //  FIX: Already returns a number
        percentage: Number(((count / totalGeoUsers) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.user_count - a.user_count);

    const cities = Array.from(cityMap.entries())
      .map(([cityKey, data]) => ({
        city: cityKey.split(',')[0],
        country: data.country,
        user_count: data.count,
      }))
      .sort((a, b) => b.user_count - a.user_count);

    // ===========================================
    // SECTION 5: DEVICE DATA
    // ===========================================

    const { data: deviceData } = await supabase.rpc('get_user_devices');

    const deviceTypeMap = new Map<string, number>();
    const browserMap = new Map<string, number>();
    const osMap = new Map<string, number>();

    if (deviceData) {
      deviceData.forEach((row: any) => {
        const deviceType = row.device_type || 'unknown';
        deviceTypeMap.set(deviceType, (deviceTypeMap.get(deviceType) || 0) + 1);

        const browser = row.browser || 'Unknown';
        browserMap.set(browser, (browserMap.get(browser) || 0) + 1);

        const os = row.os || 'Unknown';
        osMap.set(os, (osMap.get(os) || 0) + 1);
      });
    }

    const totalDevices = deviceData?.length || 1;
    const deviceTypes = Array.from(deviceTypeMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        //  FIX: Already returns a number
        percentage: Number(((count / totalDevices) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    const browsers = Array.from(browserMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        //  FIX: Already returns a number
        percentage: Number(((count / totalDevices) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    const operatingSystems = Array.from(osMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        //  FIX: Already returns a number
        percentage: Number(((count / totalDevices) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    // ===========================================
    // SECTION 6: SYSTEM HEALTH
    // ===========================================

    const { count: totalNotifications } = await supabase
      .from('notification_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', timeRange.start.toISOString());

    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: totalJourneys } = await supabase
      .from('journeys')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    //  FIX: Provide default empty object for details if null
    await logAdminActivity(
      user.id, 
      'VIEW_ANALYTICS', 
      'analytics', 
      undefined, // target_id can be undefined
      {
        timeRange: timeRangeParam,
      }
    );

    // ===========================================
    // RETURN UNIFIED RESPONSE
    // ===========================================

    return NextResponse.json({
      success: true,
      
      // Overview metrics with trends
      overview: {
        total_users: totalUsers,
        new_users_this_period: newUsersThisPeriod,
        user_growth_percent: userGrowthPercent, // Now always a number
        total_revenue: totalRevenue,
        revenue_change: revenueChange, // Now always a number
        arpu: arpu, // Now always a number
        total_websites: totalWebsites || 0,
        new_websites_this_period: newWebsites || 0,
        total_subscribers: totalSubscribers || 0,
      },

      // Real user growth data (not hardcoded!)
      trends: {
        user_growth: userGrowthData || [],
        plan_distribution: planDistributionData || [],
      },

      // Geography insights
      geography: {
        total_countries: countries.length,
        total_cities: cities.length,
        countries,
        cities,
      },

      // Device insights
      devices: {
        total_devices: deviceTypes.reduce((sum, d) => sum + d.count, 0),
        most_common: deviceTypes[0]?.type || 'unknown',
        types: deviceTypes,
        browsers,
        operating_systems: operatingSystems,
      },

      // System health
      system_health: {
        total_notifications: totalNotifications || 0,
        active_campaigns: activeCampaigns || 0,
        active_journeys: totalJourneys || 0,
      },

      // Metadata
      metadata: {
        time_range: timeRangeParam,
        start_date: timeRange.start.toISOString(),
        end_date: timeRange.end.toISOString(),
        interval: timeRange.interval,
      },
    });

  } catch (error: any) {
    console.error('[Unified Analytics] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
});