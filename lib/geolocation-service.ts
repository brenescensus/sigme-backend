
// lib/geolocation-service.ts
/**
 * Production-Ready Geolocation Service
 * 
 *  FIXED: Only uses mock data as absolute last resort in development
 *  Fetches real location data for all valid IPs
 *  Accurate device/browser/OS detection
 *  Multi-provider fallback with proper error handling
 */

interface GeoLocation {
  country: string | null;
  city: string | null;
  countryName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  region?: string | null;
}

// ============================================================================
// CACHE IMPLEMENTATION
// ============================================================================

class GeoCache {
  private cache: Map<string, { data: GeoLocation; timestamp: number }>;
  private readonly TTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.cache = new Map();
  }

  get(ip: string): GeoLocation | null {
    const cached = this.cache.get(ip);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      console.log(`[GeoCache]  Hit for ${ip}`);
      return cached.data;
    }
    if (cached) {
      this.cache.delete(ip);
    }
    return null;
  }

  set(ip: string, data: GeoLocation): void {
    this.cache.set(ip, { data, timestamp: Date.now() });
    const city = data?.city || 'unknown';
    const country = data?.country || 'unknown';
    console.log(`[GeoCache]  Stored ${ip}: ${city}, ${country}`);
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

  clear(): void {
    this.cache.clear();
  }
}

const geoCache = new GeoCache();

// ============================================================================
// IP VALIDATION & NORMALIZATION
// ============================================================================

/**
 * Normalize IPv6-mapped IPv4 addresses
 * Converts ::ffff:127.0.0.1 → 127.0.0.1
 */
function normalizeIP(ip: string): string {
  if (!ip) return 'unknown';
  
  // Handle IPv6-mapped IPv4
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  
  return ip.trim();
}

/**
 * Check if IP is private/local (cannot be geolocated)
 */
function isPrivateIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;
  
  // Localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  
  // IPv4 private ranges
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true; // Link-local
  
  // 172.16.0.0 - 172.31.255.255
  const octets = ip.split('.');
  if (octets[0] === '172') {
    const second = parseInt(octets[1] || '0');
    if (second >= 16 && second <= 31) return true;
  }
  
  return false;
}

/**
 * Validate IP format (IPv4 and basic IPv6)
 */
function isValidIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return false;
  
  // IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part);
      return num >= 0 && num <= 255;
    });
  }
  
  // IPv6 validation (simplified)
  if (ip.includes(':')) {
    return /^[0-9a-fA-F:]+$/.test(ip);
  }
  
  return false;
}

// ============================================================================
// MOCK DATA (ONLY FOR DEVELOPMENT FALLBACK)
// ============================================================================

/**
 *  WARNING: This should ONLY be used when:
 * 1. IP is private/local (can't be geolocated)
 * 2. All providers have failed
 * 3. NODE_ENV === 'development'
 */
function getMockGeoData(ip: string): GeoLocation {
  console.log(`[Geo]  WARNING: Using mock data for IP: ${ip}`);
  console.log('[Geo] This should only happen in development with private IPs');
  
  const mockLocations: GeoLocation[] = [
    { 
      country: 'KE', 
      city: 'Nairobi', 
      countryName: 'Kenya', 
      latitude: -1.2921, 
      longitude: 36.8219, 
      timezone: 'Africa/Nairobi', 
      region: 'Nairobi County' 
    },
    { 
      country: 'US', 
      city: 'New York', 
      countryName: 'United States', 
      latitude: 40.7128, 
      longitude: -74.0060, 
      timezone: 'America/New_York', 
      region: 'New York' 
    },
    { 
      country: 'GB', 
      city: 'London', 
      countryName: 'United Kingdom', 
      latitude: 51.5074, 
      longitude: -0.1278, 
      timezone: 'Europe/London', 
      region: 'England' 
    },
  ];
  
  // Hash IP to consistently return same mock data
  const hash = ip.split(/[.:]/).reduce((acc, part) => acc + (parseInt(part) || 0), 0);
  return mockLocations[hash % mockLocations.length];
}

// ============================================================================
// GEOLOCATION PROVIDERS (REAL DATA)
// ============================================================================

/**
 * Provider 1: ip-api.com
 * - FREE, no API key required
 * - 45 requests/minute
 * - Very reliable
 */
async function fetchFromIPAPI(ip: string): Promise<GeoLocation> {
  console.log(`[ip-api.com] Fetching real data for ${ip}...`);
  
  const response = await fetch(
    `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone`,
    {
      headers: { 'User-Agent': 'PushFlow-Service/1.0' },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status === 'fail') {
    throw new Error(data.message || 'IP lookup failed');
  }

  if (data.status !== 'success') {
    throw new Error('Unexpected response format');
  }

  const result = {
    country: data.countryCode || null,
    city: data.city || null,
    countryName: data.country || null,
    latitude: data.lat || null,
    longitude: data.lon || null,
    timezone: data.timezone || null,
    region: data.regionName || data.region || null,
  };

  console.log(`[ip-api.com]  SUCCESS: ${result.city}, ${result.country}`);
  return result;
}

/**
 * Provider 2: ipapi.co
 * - Freemium (1,000 free requests/day)
 * - HTTPS support
 * - Good fallback option
 */
async function fetchFromIPAPICo(ip: string): Promise<GeoLocation> {
  console.log(`[ipapi.co] Fetching real data for ${ip}...`);
  
  const apiKey = process.env.IPAPI_CO_API_KEY;
  const url = apiKey 
    ? `https://ipapi.co/${ip}/json/?key=${apiKey}`
    : `https://ipapi.co/${ip}/json/`;

  const response = await fetch(url, { 
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'PushFlow-Service/1.0' }
  });

  if (response.status === 429) {
    throw new Error('Rate limit exceeded');
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.reason || 'API error');
  }

  const result = {
    country: data.country_code || null,
    city: data.city || null,
    countryName: data.country_name || null,
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    timezone: data.timezone || null,
    region: data.region || null,
  };

  console.log(`[ipapi.co]  SUCCESS: ${result.city}, ${result.country}`);
  return result;
}

/**
 * Provider 3: ipgeolocation.io
 * - Requires free API key (signup: https://ipgeolocation.io/)
 * - 1,000 free requests/day
 * - Very accurate
 */
async function fetchFromIPGeolocation(ip: string): Promise<GeoLocation> {
  console.log(`[ipgeolocation.io] Fetching real data for ${ip}...`);
  
  const apiKey = process.env.IPGEOLOCATION_API_KEY;
  if (!apiKey) {
    throw new Error('IPGEOLOCATION_API_KEY not configured');
  }
  
  const response = await fetch(
    `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ip}`,
    { signal: AbortSignal.timeout(10000) }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.message) {
    throw new Error(data.message);
  }

  const result = {
    country: data.country_code2 || null,
    city: data.city || null,
    countryName: data.country_name || null,
    latitude: parseFloat(data.latitude) || null,
    longitude: parseFloat(data.longitude) || null,
    timezone: data.time_zone?.name || null,
    region: data.state_prov || null,
  };

  console.log(`[ipgeolocation.io]  SUCCESS: ${result.city}, ${result.country}`);
  return result;
}

// ============================================================================
// MAIN GEOLOCATION FUNCTION (FIXED)
// ============================================================================

/**
 * Get geolocation for an IP address
 * 
 * PRODUCTION BEHAVIOR:
 * 1. Returns cached data if available
 * 2. For public IPs: Tries all providers to get REAL data
 * 3. For private IPs: Returns null (cannot be geolocated)
 * 4. Only uses mock data in development as absolute last resort
 */
export async function getGeolocation(ip: string): Promise<GeoLocation> {
  console.log(`\n[Geo]  Getting location for IP: ${ip}`);
  console.log(`[Geo] Environment: ${process.env.NODE_ENV || 'production'}`);
  
  // Step 1: Normalize IP (handle IPv6-mapped IPv4)
  const normalizedIP = normalizeIP(ip);
  console.log(`[Geo] Normalized IP: ${normalizedIP}`);
  
  // Step 2: Check cache
  const cached = geoCache.get(normalizedIP);
  if (cached) {
    console.log(`[Geo]  Returning cached data`);
    return cached;
  }

  // Step 3: Handle private/local IPs
  if (isPrivateIP(normalizedIP)) {
    console.log(`[Geo]  Private/Local IP detected (cannot be geolocated)`);
    
    //  CRITICAL FIX: Only return mock data in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Geo] Development mode: Using mock data for private IP');
      const mockData = getMockGeoData(normalizedIP);
      geoCache.set(normalizedIP, mockData);
      return mockData;
    }
    
    // In production: Return null for private IPs
    console.log('[Geo] Production mode: Returning null for private IP');
    return { country: null, city: null };
  }

  // Step 4: Validate IP format
  if (!isValidIP(normalizedIP)) {
    console.log(`[Geo]  Invalid IP format: ${normalizedIP}`);
    
    // Only use mock in development
    if (process.env.NODE_ENV === 'development') {
      const mockData = getMockGeoData(normalizedIP);
      geoCache.set(normalizedIP, mockData);
      return mockData;
    }
    
    return { country: null, city: null };
  }

  // Step 5: Fetch REAL data from providers
  console.log(`[Geo] IP is public - fetching REAL geolocation data...`);
  
  const providers = [
    { name: 'ip-api.com', fn: fetchFromIPAPI },
    { name: 'ipapi.co', fn: fetchFromIPAPICo },
    { name: 'ipgeolocation.io', fn: fetchFromIPGeolocation },
  ];

  let lastError: Error | null = null;

  // Try each provider
  for (const provider of providers) {
    try {
      console.log(`[Geo] Trying ${provider.name}...`);
      const geoData = await provider.fn(normalizedIP);
      
      // Validate we got useful data
      if (geoData.country || geoData.city) {
        console.log(`[Geo]  SUCCESS with ${provider.name}: ${geoData.city}, ${geoData.country}`);
        geoCache.set(normalizedIP, geoData);
        return geoData;
      } else {
        console.log(`[Geo]  ${provider.name} returned empty data, trying next...`);
      }
    } catch (error: any) {
      console.error(`[Geo]  ${provider.name} failed:`, error.message);
      lastError = error;
      
      // If rate limited, try next provider immediately
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.log(`[Geo] Rate limit hit, trying next provider...`);
        continue;
      }
      
      // Wait 1 second before trying next provider
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Step 6: All providers failed
  console.error(`[Geo]  ALL PROVIDERS FAILED for IP: ${normalizedIP}`);
  console.error(`[Geo] Last error:`, lastError?.message);
  
  // CRITICAL FIX: Only use mock data in development as absolute last resort
  if (process.env.NODE_ENV === 'development') {
    console.log('[Geo]  Development mode: Using mock data as fallback');
    const mockData = getMockGeoData(normalizedIP);
    geoCache.set(normalizedIP, mockData);
    return mockData;
  }
  
  // In production: Return null if all providers fail
  console.log('[Geo]  Production mode: Returning null (all providers failed)');
  return { country: null, city: null };
}

// ============================================================================
// REQUEST HELPERS
// ============================================================================

/**
 * Extract client IP from Next.js request headers
 * Tries multiple header sources in order of reliability
 */
export function getClientIP(headers: Headers): string {
  const ipSources = [
    headers.get('cf-connecting-ip'),           // CloudFlare
    headers.get('x-real-ip'),                  // Nginx
    headers.get('x-forwarded-for')?.split(',')[0].trim(), // Load balancer
    headers.get('x-client-ip'),                // Apache
    headers.get('forwarded'),                  // Standard header
  ];

  for (const ip of ipSources) {
    if (ip && ip !== 'unknown') {
      const normalized = normalizeIP(ip);
      if (isValidIP(normalized)) {
        console.log(`[IP Detection]  Found valid IP: ${normalized}`);
        return normalized;
      }
    }
  }

  console.log(`[IP Detection]  No valid public IP found in headers`);
  console.log('[IP Detection] This likely means user is on localhost/private network');
  return '127.0.0.1'; // Localhost
}

// ============================================================================
// DEVICE & BROWSER DETECTION (ACCURATE)
// ============================================================================

/**
 * Get device type with accurate tablet detection
 */
export function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  if (!userAgent) return 'desktop';
  
  const ua = userAgent.toLowerCase();
  
  // Tablet detection (MUST check before mobile)
  if (
    /ipad/.test(ua) ||
    /tablet/.test(ua) ||
    (/android/.test(ua) && !/mobile/.test(ua)) || // Android tablets don't have "mobile"
    /kindle/.test(ua) ||
    /silk/.test(ua) ||
    /playbook/.test(ua)
  ) {
    return 'tablet';
  }
  
  // Mobile detection
  if (
    /mobile/.test(ua) ||
    /android/.test(ua) ||
    /iphone/.test(ua) ||
    /ipod/.test(ua) ||
    /blackberry/.test(ua) ||
    /iemobile/.test(ua) ||
    /opera mini/.test(ua) ||
    /mobile safari/.test(ua)
  ) {
    return 'mobile';
  }
  
  return 'desktop';
}

/**
 * Get browser with version number
 */
export function getBrowser(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  
  // Check specific browsers first (order matters)
  if (/edg\//i.test(userAgent)) {
    const match = userAgent.match(/edg\/(\d+)/i);
    return match ? `Edge ${match[1]}` : 'Edge';
  }
  
  if (/opr\//i.test(userAgent) || /opera/i.test(userAgent)) {
    const match = userAgent.match(/(?:opr|opera)\/(\d+)/i);
    return match ? `Opera ${match[1]}` : 'Opera';
  }
  
  if (/chrome\//i.test(userAgent) && !/edg/i.test(userAgent)) {
    const match = userAgent.match(/chrome\/(\d+)/i);
    return match ? `Chrome ${match[1]}` : 'Chrome';
  }
  
  if (/safari\//i.test(userAgent) && !/chrome/i.test(userAgent)) {
    const match = userAgent.match(/version\/(\d+)/i);
    return match ? `Safari ${match[1]}` : 'Safari';
  }
  
  if (/firefox\//i.test(userAgent)) {
    const match = userAgent.match(/firefox\/(\d+)/i);
    return match ? `Firefox ${match[1]}` : 'Firefox';
  }
  
  if (/msie|trident/i.test(userAgent)) {
    return 'Internet Explorer';
  }
  
  return 'Unknown';
}

/**
 * Get OS with version number
 */
export function getOS(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  
  // Windows
  if (/windows nt 10\.0/i.test(userAgent)) return 'Windows 10';
  if (/windows nt 11\.0/i.test(userAgent)) return 'Windows 11';
  if (/windows nt 6\.3/i.test(userAgent)) return 'Windows 8.1';
  if (/windows nt 6\.2/i.test(userAgent)) return 'Windows 8';
  if (/windows nt 6\.1/i.test(userAgent)) return 'Windows 7';
  if (/windows/i.test(userAgent)) return 'Windows';
  
  // macOS
  if (/mac os x (\d+)[_.](\d+)/i.test(userAgent)) {
    const match = userAgent.match(/mac os x (\d+)[_.](\d+)/i);
    if (match) return `macOS ${match[1]}.${match[2]}`;
  }
  if (/mac os x/i.test(userAgent)) return 'macOS';
  
  // iOS
  if (/iphone os (\d+)/i.test(userAgent)) {
    const match = userAgent.match(/iphone os (\d+)/i);
    return match ? `iOS ${match[1]}` : 'iOS';
  }
  if (/ipad.*os (\d+)/i.test(userAgent)) {
    const match = userAgent.match(/ipad.*os (\d+)/i);
    return match ? `iPadOS ${match[1]}` : 'iPadOS';
  }
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
  
  // Android
  if (/android (\d+)/i.test(userAgent)) {
    const match = userAgent.match(/android (\d+)/i);
    return match ? `Android ${match[1]}` : 'Android';
  }
  if (/android/i.test(userAgent)) return 'Android';
  
  // Linux
  if (/linux/i.test(userAgent)) return 'Linux';
  
  return 'Unknown';
}

/**
 * Get complete subscriber metadata
 * Returns REAL geolocation data whenever possible
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
  console.log(`\n[Metadata] Gathering metadata for IP: ${ip}`);
  console.log(`[Metadata] User-Agent: ${userAgent.substring(0, 100)}...`);
  
  // Get REAL geolocation data
  const geoData = await getGeolocation(ip);
  
  const metadata = {
    country: geoData.country,
    city: geoData.city,
    device_type: getDeviceType(userAgent),
    browser: getBrowser(userAgent),
    os: getOS(userAgent)
  };
  
  console.log(`[Metadata]  Final metadata:`, metadata);
  return metadata;
}

// ============================================================================
// TESTING & UTILITIES
// ============================================================================

/**
 * Test geolocation with a known public IP
 */
export async function testGeolocation(testIP: string = '8.8.8.8'): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` TESTING GEOLOCATION`);
  console.log(`IP: ${testIP}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log('='.repeat(60));
  
  try {
    const result = await getGeolocation(testIP);
    console.log('\n RESULT:', JSON.stringify(result, null, 2));
    
    if (result.country && result.city) {
      console.log(`\n SUCCESS: Got real data for ${testIP}`);
    } else {
      console.log(`\n WARNING: Got null data for ${testIP}`);
    }
  } catch (error: any) {
    console.error('\n FAILED:', error.message);
  }
  
  console.log('='.repeat(60) + '\n');
}

/**
 * Clear the geolocation cache
 */
export function clearGeoCache(): void {
  geoCache.clear();
  console.log('[GeoCache] Cache cleared');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getGeolocation,
  getClientIP,
  getDeviceType,
  getBrowser,
  getOS,
  getSubscriberMetadata,
  testGeolocation,
  clearGeoCache,
};