// lib/geolocation-service.ts
// Reusable geolocation service for IP-based location lookup

interface GeoLocation {
  country: string | null;
  city: string | null;
  countryName?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

/**
 * In-memory cache for geolocation results
 * Prevents hitting the API multiple times for the same IP
 */
class GeoCache {
  private cache: Map<string, { data: GeoLocation; timestamp: number }>;
  private readonly TTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.cache = new Map();
  }

  get(ip: string): GeoLocation | null {
    const cached = this.cache.get(ip);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.data;
    }
    return null;
  }

  set(ip: string, data: GeoLocation): void {
    this.cache.set(ip, { data, timestamp: Date.now() });
    this.cleanOldEntries();
  }

  private cleanOldEntries(): void {
    const now = Date.now();
    for (const [ip, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(ip);
      }
    }
  }
}

const geoCache = new GeoCache();

/**
 * Check if IP is private/local
 */
function isPrivateIP(ip: string): boolean {
  return (
    ip === 'unknown' ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.20.') ||
    ip.startsWith('172.21.') ||
    ip.startsWith('172.22.') ||
    ip.startsWith('172.23.') ||
    ip.startsWith('172.24.') ||
    ip.startsWith('172.25.') ||
    ip.startsWith('172.26.') ||
    ip.startsWith('172.27.') ||
    ip.startsWith('172.28.') ||
    ip.startsWith('172.29.') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.')
  );
}

/**
 * Get mock data for development/testing
 */
function getMockGeoData(): GeoLocation {
  // Return Kenya for development testing
  return {
    country: 'KE',
    city: 'Nairobi',
    countryName: 'Kenya',
    latitude: -1.2921,
    longitude: 36.8219,
    timezone: 'Africa/Nairobi'
  };
}

/**
 * Fetch geolocation from ip-api.com (Free service)
 * Rate limit: 45 requests/minute for non-commercial use
 */
async function fetchFromIPAPI(ip: string): Promise<GeoLocation> {
  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon,timezone`,
      {
        headers: {
          'User-Agent': 'Sigme-Push-Notification-Service'
        },
        // Add timeout
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'success') {
      return {
        country: data.countryCode || null,
        city: data.city || null,
        countryName: data.country || null,
        latitude: data.lat || null,
        longitude: data.lon || null,
        timezone: data.timezone || null
      };
    }

    throw new Error('IP API returned unsuccessful status');
  } catch (error) {
    console.error('[Geolocation Service] ip-api.com error:', error);
    throw error;
  }
}

/**
 * Fetch geolocation from ipapi.co (Freemium service)
 * Free tier: 30,000 requests/month, HTTPS support
 * Uncomment and set API key if you want to use this service
 */
async function fetchFromIPAPICo(ip: string): Promise<GeoLocation> {
  try {
    const apiKey = process.env.IPAPI_CO_API_KEY; // Optional
    const url = apiKey 
      ? `https://ipapi.co/${ip}/json/?key=${apiKey}`
      : `https://ipapi.co/${ip}/json/`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.reason || 'API error');
    }

    return {
      country: data.country_code || null,
      city: data.city || null,
      countryName: data.country_name || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      timezone: data.timezone || null
    };
  } catch (error) {
    console.error('[Geolocation Service] ipapi.co error:', error);
    throw error;
  }
}

/**
 * Main geolocation function
 * Attempts to get location with caching and fallback
 */
export async function getGeolocation(ip: string): Promise<GeoLocation> {
  // Check cache first
  const cached = geoCache.get(ip);
  if (cached) {
    console.log('[Geolocation Service] Cache hit for:', ip);
    return cached;
  }

  // Handle private/local IPs
  if (isPrivateIP(ip)) {
    console.log('[Geolocation Service] Private IP detected:', ip);
    
    if (process.env.NODE_ENV === 'development') {
      const mockData = getMockGeoData();
      geoCache.set(ip, mockData);
      return mockData;
    }
    
    return { country: null, city: null };
  }

  console.log('[Geolocation Service] Fetching geo data for:', ip);

  try {
    // Primary: Use ip-api.com (free, reliable)
    const geoData = await fetchFromIPAPI(ip);
    geoCache.set(ip, geoData);
    return geoData;
  } catch (error) {
    console.error('[Geolocation Service] Primary service failed:', error);
    
    // Fallback: Try ipapi.co if available
    if (process.env.IPAPI_CO_API_KEY) {
      try {
        const geoData = await fetchFromIPAPICo(ip);
        geoCache.set(ip, geoData);
        return geoData;
      } catch (fallbackError) {
        console.error('[Geolocation Service] Fallback service failed:', fallbackError);
      }
    }
    
    // Return null if all services fail
    return { country: null, city: null };
  }
}

/**
 * Extract IP address from Next.js request
 */
export function getClientIP(headers: Headers): string {
  // Priority order for IP detection
  return (
    headers.get('cf-connecting-ip') ||        // CloudFlare
    headers.get('x-real-ip') ||               // Nginx
    headers.get('x-forwarded-for')?.split(',')[0].trim() || // Load balancer
    headers.get('x-client-ip') ||             // Apache
    'unknown'
  );
}

/**
 * Get device type from user agent
 */
export function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  if (/iPad/i.test(userAgent)) return 'tablet';
  if (/Mobile|Android|iPhone/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

/**
 * Parse browser from user agent
 */
export function getBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown';
}

/**
 * Parse OS from user agent
 */
export function getOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}

/**
 * Get complete subscriber metadata from request
 */
export async function getSubscriberMetadata(
  ip: string,
  userAgent: string
): Promise<{
  country: string | null;
  city: string | null;
  device_type: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
}> {
  const geoData = await getGeolocation(ip);
  
  return {
    country: geoData.country,
    city: geoData.city,
    device_type: getDeviceType(userAgent),
    browser: getBrowser(userAgent),
    os: getOS(userAgent)
  };
}

// Export default
export default {
  getGeolocation,
  getClientIP,
  getDeviceType,
  getBrowser,
  getOS,
  getSubscriberMetadata
};