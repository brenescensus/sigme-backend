// // // // lib/geolocation-service.ts
// // // // Reusable geolocation service for IP-based location lookup

// // // interface GeoLocation {
// // //   country: string | null;
// // //   city: string | null;
// // //   countryName?: string;
// // //   latitude?: number;
// // //   longitude?: number;
// // //   timezone?: string;
// // // }

// // // /**
// // //  * In-memory cache for geolocation results
// // //  * Prevents hitting the API multiple times for the same IP
// // //  */
// // // class GeoCache {
// // //   private cache: Map<string, { data: GeoLocation; timestamp: number }>;
// // //   private readonly TTL = 60 * 60 * 1000; // 1 hour

// // //   constructor() {
// // //     this.cache = new Map();
// // //   }

// // //   get(ip: string): GeoLocation | null {
// // //     const cached = this.cache.get(ip);
// // //     if (cached && Date.now() - cached.timestamp < this.TTL) {
// // //       return cached.data;
// // //     }
// // //     return null;
// // //   }

// // //   set(ip: string, data: GeoLocation): void {
// // //     this.cache.set(ip, { data, timestamp: Date.now() });
// // //     this.cleanOldEntries();
// // //   }

// // //   private cleanOldEntries(): void {
// // //     const now = Date.now();
// // //     for (const [ip, entry] of this.cache.entries()) {
// // //       if (now - entry.timestamp > this.TTL) {
// // //         this.cache.delete(ip);
// // //       }
// // //     }
// // //   }
// // // }

// // // const geoCache = new GeoCache();

// // // /**
// // //  * Check if IP is private/local
// // //  */
// // // function isPrivateIP(ip: string): boolean {
// // //   return (
// // //     ip === 'unknown' ||
// // //     ip === '127.0.0.1' ||
// // //     ip === '::1' ||
// // //     ip === 'localhost' ||
// // //     ip.startsWith('10.') ||
// // //     ip.startsWith('192.168.') ||
// // //     ip.startsWith('172.16.') ||
// // //     ip.startsWith('172.17.') ||
// // //     ip.startsWith('172.18.') ||
// // //     ip.startsWith('172.19.') ||
// // //     ip.startsWith('172.20.') ||
// // //     ip.startsWith('172.21.') ||
// // //     ip.startsWith('172.22.') ||
// // //     ip.startsWith('172.23.') ||
// // //     ip.startsWith('172.24.') ||
// // //     ip.startsWith('172.25.') ||
// // //     ip.startsWith('172.26.') ||
// // //     ip.startsWith('172.27.') ||
// // //     ip.startsWith('172.28.') ||
// // //     ip.startsWith('172.29.') ||
// // //     ip.startsWith('172.30.') ||
// // //     ip.startsWith('172.31.')
// // //   );
// // // }

// // // /**
// // //  * Get mock data for development/testing
// // //  */
// // // function getMockGeoData(): GeoLocation {
// // //   // Return Kenya for development testing
// // //   return {
// // //     country: 'KE',
// // //     city: 'Nairobi',
// // //     countryName: 'Kenya',
// // //     latitude: -1.2921,
// // //     longitude: 36.8219,
// // //     timezone: 'Africa/Nairobi'
// // //   };
// // // }

// // // /**
// // //  * Fetch geolocation from ip-api.com (Free service)
// // //  * Rate limit: 45 requests/minute for non-commercial use
// // //  */
// // // async function fetchFromIPAPI(ip: string): Promise<GeoLocation> {
// // //   try {
// // //     const response = await fetch(
// // //       `http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon,timezone`,
// // //       {
// // //         headers: {
// // //           'User-Agent': 'Sigme-Push-Notification-Service'
// // //         },
// // //         // Add timeout
// // //         signal: AbortSignal.timeout(5000) // 5 second timeout
// // //       }
// // //     );

// // //     if (!response.ok) {
// // //       throw new Error(`HTTP ${response.status}`);
// // //     }

// // //     const data = await response.json();

// // //     if (data.status === 'success') {
// // //       return {
// // //         country: data.countryCode || null,
// // //         city: data.city || null,
// // //         countryName: data.country || null,
// // //         latitude: data.lat || null,
// // //         longitude: data.lon || null,
// // //         timezone: data.timezone || null
// // //       };
// // //     }

// // //     throw new Error('IP API returned unsuccessful status');
// // //   } catch (error) {
// // //     console.error('[Geolocation Service] ip-api.com error:', error);
// // //     throw error;
// // //   }
// // // }

// // // /**
// // //  * Fetch geolocation from ipapi.co (Freemium service)
// // //  * Free tier: 30,000 requests/month, HTTPS support
// // //  * Uncomment and set API key if you want to use this service
// // //  */
// // // async function fetchFromIPAPICo(ip: string): Promise<GeoLocation> {
// // //   try {
// // //     const apiKey = process.env.IPAPI_CO_API_KEY; // Optional
// // //     const url = apiKey 
// // //       ? `https://ipapi.co/${ip}/json/?key=${apiKey}`
// // //       : `https://ipapi.co/${ip}/json/`;

// // //     const response = await fetch(url, {
// // //       signal: AbortSignal.timeout(5000)
// // //     });

// // //     if (!response.ok) {
// // //       throw new Error(`HTTP ${response.status}`);
// // //     }

// // //     const data = await response.json();

// // //     if (data.error) {
// // //       throw new Error(data.reason || 'API error');
// // //     }

// // //     return {
// // //       country: data.country_code || null,
// // //       city: data.city || null,
// // //       countryName: data.country_name || null,
// // //       latitude: data.latitude || null,
// // //       longitude: data.longitude || null,
// // //       timezone: data.timezone || null
// // //     };
// // //   } catch (error) {
// // //     console.error('[Geolocation Service] ipapi.co error:', error);
// // //     throw error;
// // //   }
// // // }

// // // /**
// // //  * Main geolocation function
// // //  * Attempts to get location with caching and fallback
// // //  */
// // // export async function getGeolocation(ip: string): Promise<GeoLocation> {
// // //   // Check cache first
// // //   const cached = geoCache.get(ip);
// // //   if (cached) {
// // //     console.log('[Geolocation Service] Cache hit for:', ip);
// // //     return cached;
// // //   }

// // //   // Handle private/local IPs
// // //   if (isPrivateIP(ip)) {
// // //     console.log('[Geolocation Service] Private IP detected:', ip);
    
// // //     if (process.env.NODE_ENV === 'development') {
// // //       const mockData = getMockGeoData();
// // //       geoCache.set(ip, mockData);
// // //       return mockData;
// // //     }
    
// // //     return { country: null, city: null };
// // //   }

// // //   console.log('[Geolocation Service] Fetching geo data for:', ip);

// // //   try {
// // //     // Primary: Use ip-api.com (free, reliable)
// // //     const geoData = await fetchFromIPAPI(ip);
// // //     geoCache.set(ip, geoData);
// // //     return geoData;
// // //   } catch (error) {
// // //     console.error('[Geolocation Service] Primary service failed:', error);
    
// // //     // Fallback: Try ipapi.co if available
// // //     if (process.env.IPAPI_CO_API_KEY) {
// // //       try {
// // //         const geoData = await fetchFromIPAPICo(ip);
// // //         geoCache.set(ip, geoData);
// // //         return geoData;
// // //       } catch (fallbackError) {
// // //         console.error('[Geolocation Service] Fallback service failed:', fallbackError);
// // //       }
// // //     }
    
// // //     // Return null if all services fail
// // //     return { country: null, city: null };
// // //   }
// // // }

// // // /**
// // //  * Extract IP address from Next.js request
// // //  */
// // // export function getClientIP(headers: Headers): string {
// // //   // Priority order for IP detection
// // //   return (
// // //     headers.get('cf-connecting-ip') ||        // CloudFlare
// // //     headers.get('x-real-ip') ||               // Nginx
// // //     headers.get('x-forwarded-for')?.split(',')[0].trim() || // Load balancer
// // //     headers.get('x-client-ip') ||             // Apache
// // //     'unknown'
// // //   );
// // // }

// // // /**
// // //  * Get device type from user agent
// // //  */
// // // export function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
// // //   if (/iPad/i.test(userAgent)) return 'tablet';
// // //   if (/Mobile|Android|iPhone/i.test(userAgent)) return 'mobile';
// // //   return 'desktop';
// // // }

// // // /**
// // //  * Parse browser from user agent
// // //  */
// // // export function getBrowser(userAgent: string): string {
// // //   if (userAgent.includes('Chrome')) return 'Chrome';
// // //   if (userAgent.includes('Firefox')) return 'Firefox';
// // //   if (userAgent.includes('Safari')) return 'Safari';
// // //   if (userAgent.includes('Edge')) return 'Edge';
// // //   if (userAgent.includes('Opera')) return 'Opera';
// // //   return 'Unknown';
// // // }

// // // /**
// // //  * Parse OS from user agent
// // //  */
// // // export function getOS(userAgent: string): string {
// // //   if (userAgent.includes('Windows')) return 'Windows';
// // //   if (userAgent.includes('Mac OS')) return 'macOS';
// // //   if (userAgent.includes('Linux')) return 'Linux';
// // //   if (userAgent.includes('Android')) return 'Android';
// // //   if (userAgent.includes('iOS')) return 'iOS';
// // //   return 'Unknown';
// // // }

// // // /**
// // //  * Get complete subscriber metadata from request
// // //  */
// // // export async function getSubscriberMetadata(
// // //   ip: string,
// // //   userAgent: string
// // // ): Promise<{
// // //   country: string | null;
// // //   city: string | null;
// // //   device_type: 'mobile' | 'tablet' | 'desktop';
// // //   browser: string;
// // //   os: string;
// // // }> {
// // //   const geoData = await getGeolocation(ip);
  
// // //   return {
// // //     country: geoData.country,
// // //     city: geoData.city,
// // //     device_type: getDeviceType(userAgent),
// // //     browser: getBrowser(userAgent),
// // //     os: getOS(userAgent)
// // //   };
// // // }

// // // // Export default
// // // export default {
// // //   getGeolocation,
// // //   getClientIP,
// // //   getDeviceType,
// // //   getBrowser,
// // //   getOS,
// // //   getSubscriberMetadata
// // // };

// // // lib/geolocation-service.ts
// // /**
// //  * Geolocation Service - IP-based Location Lookup
// //  * 
// //  * Features:
// //  * - Multiple provider fallback (ip-api.com, ipapi.co, ipgeolocation.io)
// //  * - In-memory caching (1 hour TTL)
// //  * - Rate limit handling
// //  * - Proper error handling
// //  * - Development mode support
// //  */

// // interface GeoLocation {
// //   country: string | null;
// //   city: string | null;
// //   countryName?: string | null;
// //   latitude?: number | null;
// //   longitude?: number | null;
// //   timezone?: string | null;
// //   region?: string | null;
// // }

// // // ============================================================================
// // // CACHE IMPLEMENTATION
// // // ============================================================================

// // class GeoCache {
// //   private cache: Map<string, { data: GeoLocation; timestamp: number }>;
// //   private readonly TTL = 60 * 60 * 1000; // 1 hour

// //   constructor() {
// //     this.cache = new Map();
// //   }

// //   get(ip: string): GeoLocation | null {
// //     const cached = this.cache.get(ip);
// //     if (cached && Date.now() - cached.timestamp < this.TTL) {
// //       console.log(`[GeoCache] Hit for ${ip}`);
// //       return cached.data;
// //     }
// //     if (cached) {
// //       console.log(`[GeoCache] Expired for ${ip}`);
// //       this.cache.delete(ip);
// //     }
// //     return null;
// //   }

// //   set(ip: string, data: GeoLocation): void {
// //     this.cache.set(ip, { data, timestamp: Date.now() });
// //     console.log(`[GeoCache] Stored ${ip}: ${data.city}, ${data.country}`);
// //     this.cleanOldEntries();
// //   }

// //   private cleanOldEntries(): void {
// //     const now = Date.now();
// //     let cleaned = 0;
// //     for (const [ip, entry] of this.cache.entries()) {
// //       if (now - entry.timestamp > this.TTL) {
// //         this.cache.delete(ip);
// //         cleaned++;
// //       }
// //     }
// //     if (cleaned > 0) {
// //       console.log(`[GeoCache] Cleaned ${cleaned} expired entries`);
// //     }
// //   }

// //   clear(): void {
// //     this.cache.clear();
// //     console.log('[GeoCache] Cache cleared');
// //   }
// // }

// // const geoCache = new GeoCache();

// // // ============================================================================
// // // UTILITY FUNCTIONS
// // // ============================================================================

// // /**
// //  * Check if IP is private/local
// //  */
// // function isPrivateIP(ip: string): boolean {
// //   if (!ip || ip === 'unknown') return true;
  
// //   // Localhost
// //   if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  
// //   // IPv4 private ranges
// //   if (ip.startsWith('10.')) return true;
// //   if (ip.startsWith('192.168.')) return true;
  
// //   // 172.16.0.0 - 172.31.255.255
// //   const parts = ip.split('.');
// //   if (parts[0] === '172') {
// //     const second = parseInt(parts[1]);
// //     if (second >= 16 && second <= 31) return true;
// //   }
  
// //   // Link-local
// //   if (ip.startsWith('169.254.')) return true;
  
// //   return false;
// // }

// // /**
// //  * Validate IP format
// //  */
// // function isValidIP(ip: string): boolean {
// //   if (!ip || ip === 'unknown') return false;
  
// //   // IPv4
// //   const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
// //   if (ipv4Regex.test(ip)) {
// //     const parts = ip.split('.');
// //     return parts.every(part => {
// //       const num = parseInt(part);
// //       return num >= 0 && num <= 255;
// //     });
// //   }
  
// //   // IPv6 (basic check)
// //   if (ip.includes(':')) {
// //     return true; // Simple validation for IPv6
// //   }
  
// //   return false;
// // }

// // /**
// //  * Get mock data for development
// //  */
// // // function getMockGeoData(ip: string): GeoLocation {
// // //   console.log(`[Geo] Using mock data for development IP: ${ip}`);
  
// // //   // Different mock data based on IP for testing
// // //   const mockLocations = [
// // //     { country: 'KE', city: 'Nairobi', countryName: 'Kenya', latitude: -1.2921, longitude: 36.8219, timezone: 'Africa/Nairobi', region: 'Nairobi' },
// // //     { country: 'US', city: 'New York', countryName: 'United States', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York', region: 'New York' },
// // //     { country: 'GB', city: 'London', countryName: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', region: 'England' },
// // //   ];
  
// // //   // Use IP hash to consistently return same mock data for same IP
// // //   const hash = ip.split('.').reduce((acc, part) => acc + parseInt(part || '0'), 0);
// // //   return mockLocations[hash % mockLocations.length];
// // // }

// // // ============================================================================
// // // PROVIDER IMPLEMENTATIONS
// // // ============================================================================


// // // lib/geolocation-service.ts - Line ~75

// // /**
// //  * Get mock data for development
// //  *  ALWAYS returns valid data structure
// //  */
// // function getMockGeoData(ip: string): GeoLocation {
// //   console.log(`[Geo] Using mock data for development IP: ${ip}`);
  
// //   // Different mock data based on IP for testing
// //   const mockLocations: GeoLocation[] = [
// //     { 
// //       country: 'KE', 
// //       city: 'Nairobi', 
// //       countryName: 'Kenya', 
// //       latitude: -1.2921, 
// //       longitude: 36.8219, 
// //       timezone: 'Africa/Nairobi', 
// //       region: 'Nairobi' 
// //     },
// //     { 
// //       country: 'US', 
// //       city: 'New York', 
// //       countryName: 'United States', 
// //       latitude: 40.7128, 
// //       longitude: -74.0060, 
// //       timezone: 'America/New_York', 
// //       region: 'New York' 
// //     },
// //     { 
// //       country: 'GB', 
// //       city: 'London', 
// //       countryName: 'United Kingdom', 
// //       latitude: 51.5074, 
// //       longitude: -0.1278, 
// //       timezone: 'Europe/London', 
// //       region: 'England' 
// //     },
// //   ];
  
// //   // Use IP hash to consistently return same mock data for same IP
// //   const hash = ip.split(/[.:]/).reduce((acc, part) => acc + (parseInt(part) || 0), 0);
// //   const mockData = mockLocations[hash % mockLocations.length];
  
// //   console.log(`[Geo] Mock data:`, mockData);
// //   return mockData;
// // }
// // /**
// //  * Provider 1: ip-api.com (Free, no key needed)
// //  * Rate limit: 45 requests/minute
// //  * Best for: General use, reliable
// //  */
// // async function fetchFromIPAPI(ip: string): Promise<GeoLocation> {
// //   console.log(`[ip-api.com] Fetching for ${ip}...`);
  
// //   try {
// //     const response = await fetch(
// //       `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone`,
// //       {
// //         headers: {
// //           'User-Agent': 'SigMe-Push-Service/1.0'
// //         },
// //         signal: AbortSignal.timeout(8000) // 8 second timeout
// //       }
// //     );

// //     if (!response.ok) {
// //       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
// //     }

// //     const data = await response.json();
// //     console.log(`[ip-api.com] Response:`, data);

// //     if (data.status === 'fail') {
// //       throw new Error(data.message || 'IP lookup failed');
// //     }

// //     if (data.status === 'success') {
// //       const result = {
// //         country: data.countryCode || null,
// //         city: data.city || null,
// //         countryName: data.country || null,
// //         latitude: data.lat || null,
// //         longitude: data.lon || null,
// //         timezone: data.timezone || null,
// //         region: data.regionName || data.region || null,
// //       };
      
// //       console.log(`[ip-api.com]  Success: ${result.city}, ${result.country}`);
// //       return result;
// //     }

// //     throw new Error('Unexpected response format');
// //   } catch (error: any) {
// //     console.error(`[ip-api.com]  Error:`, error.message);
// //     throw error;
// //   }
// // }

// // /**
// //  * Provider 2: ipapi.co (Freemium, optional API key)
// //  * Free tier: 1,000 requests/day, 30,000/month
// //  * Best for: HTTPS support, detailed data
// //  */
// // async function fetchFromIPAPICo(ip: string): Promise<GeoLocation> {
// //   console.log(`[ipapi.co] Fetching for ${ip}...`);
  
// //   try {
// //     const apiKey = process.env.IPAPI_CO_API_KEY;
// //     const url = apiKey 
// //       ? `https://ipapi.co/${ip}/json/?key=${apiKey}`
// //       : `https://ipapi.co/${ip}/json/`;

// //     const response = await fetch(url, {
// //       signal: AbortSignal.timeout(8000)
// //     });

// //     if (!response.ok) {
// //       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
// //     }

// //     const data = await response.json();
// //     console.log(`[ipapi.co] Response:`, data);

// //     if (data.error) {
// //       throw new Error(data.reason || 'API error');
// //     }

// //     const result = {
// //       country: data.country_code || null,
// //       city: data.city || null,
// //       countryName: data.country_name || null,
// //       latitude: data.latitude || null,
// //       longitude: data.longitude || null,
// //       timezone: data.timezone || null,
// //       region: data.region || null,
// //     };
    
// //     console.log(`[ipapi.co]  Success: ${result.city}, ${result.country}`);
// //     return result;
// //   } catch (error: any) {
// //     console.error(`[ipapi.co]  Error:`, error.message);
// //     throw error;
// //   }
// // }

// // /**
// //  * Provider 3: ipgeolocation.io (Requires free API key)
// //  * Free tier: 1,000 requests/day
// //  * Best for: Backup, detailed data
// //  * Sign up: https://ipgeolocation.io/
// //  */
// // async function fetchFromIPGeolocation(ip: string): Promise<GeoLocation> {
// //   console.log(`[ipgeolocation.io] Fetching for ${ip}...`);
  
// //   const apiKey = process.env.IPGEOLOCATION_API_KEY;
  
// //   if (!apiKey) {
// //     throw new Error('IPGEOLOCATION_API_KEY not configured');
// //   }
  
// //   try {
// //     const response = await fetch(
// //       `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ip}`,
// //       {
// //         signal: AbortSignal.timeout(8000)
// //       }
// //     );

// //     if (!response.ok) {
// //       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
// //     }

// //     const data = await response.json();
// //     console.log(`[ipgeolocation.io] Response:`, data);

// //     if (data.message) {
// //       throw new Error(data.message);
// //     }

// //     const result = {
// //       country: data.country_code2 || null,
// //       city: data.city || null,
// //       countryName: data.country_name || null,
// //       latitude: parseFloat(data.latitude) || null,
// //       longitude: parseFloat(data.longitude) || null,
// //       timezone: data.time_zone?.name || null,
// //       region: data.state_prov || null,
// //     };
    
// //     console.log(`[ipgeolocation.io]  Success: ${result.city}, ${result.country}`);
// //     return result;
// //   } catch (error: any) {
// //     console.error(`[ipgeolocation.io]  Error:`, error.message);
// //     throw error;
// //   }
// // }

// // // ============================================================================
// // // MAIN GEOLOCATION FUNCTION
// // // ============================================================================

// // /**
// //  * Get geolocation with multi-provider fallback
// //  */
// // // export async function getGeolocation(ip: string): Promise<GeoLocation> {
// // //   console.log(`\n[Geo] 🌍 Getting location for IP: ${ip}`);
  
// // //   // 1. Check cache first
// // //   const cached = geoCache.get(ip);
// // //   if (cached) {
// // //     console.log(`[Geo]  Returning cached data`);
// // //     return cached;
// // //   }

// // //   // 2. Validate IP
// // //   if (!isValidIP(ip)) {
// // //     console.log(`[Geo]  Invalid IP format: ${ip}`);
// // //     return { country: null, city: null };
// // //   }

// // //   // 3. Handle private IPs
// // //   if (isPrivateIP(ip)) {
// // //     console.log(`[Geo] 🏠 Private/Local IP detected`);
    
// // //     if (process.env.NODE_ENV === 'development') {
// // //       const mockData = getMockGeoData(ip);
// // //       geoCache.set(ip, mockData);
// // //       return mockData;
// // //     }
    
// // //     return { country: null, city: null };
// // //   }

// // //   // 4. Try providers in order
// // //   const providers = [
// // //     { name: 'ip-api.com', fn: fetchFromIPAPI },
// // //     { name: 'ipapi.co', fn: fetchFromIPAPICo },
// // //     { name: 'ipgeolocation.io', fn: fetchFromIPGeolocation },
// // //   ];

// // //   let lastError: Error | null = null;

// // //   for (const provider of providers) {
// // //     try {
// // //       console.log(`[Geo] 🔄 Trying ${provider.name}...`);
// // //       const geoData = await provider.fn(ip);
      
// // //       // Validate we got useful data
// // //       if (geoData.country || geoData.city) {
// // //         console.log(`[Geo]  Success with ${provider.name}: ${geoData.city}, ${geoData.country}`);
// // //         geoCache.set(ip, geoData);
// // //         return geoData;
// // //       } else {
// // //         console.log(`[Geo]  ${provider.name} returned empty data`);
// // //       }
// // //     } catch (error: any) {
// // //       console.error(`[Geo]  ${provider.name} failed:`, error.message);
// // //       lastError = error;
      
// // //       // If it's a rate limit error, try next provider immediately
// // //       if (error.message.includes('rate limit') || error.message.includes('429')) {
// // //         console.log(`[Geo] ⏭️ Rate limit hit, trying next provider...`);
// // //         continue;
// // //       }
      
// // //       // For other errors, wait a bit before trying next
// // //       await new Promise(resolve => setTimeout(resolve, 500));
// // //     }
// // //   }

// // //   // 5. All providers failed
// // //   console.error(`[Geo]  All providers failed. Last error:`, lastError?.message);
  
// // //   // In development, return mock data as fallback
// // //   if (process.env.NODE_ENV === 'development') {
// // //     console.log(`[Geo] 🧪 Development mode: returning mock data`);
// // //     const mockData = getMockGeoData(ip);
// // //     geoCache.set(ip, mockData);
// // //     return mockData;
// // //   }
  
// // //   return { country: null, city: null };
// // // }

// // // ============================================================================
// // // REQUEST HELPERS
// // // ============================================================================


// // // lib/geolocation-service.ts - Replace entire getGeolocation function

// // export async function getGeolocation(ip: string): Promise<GeoLocation> {
// //   console.log(`\n[Geo] 🌍 Getting location for IP: ${ip}`);
  
// //   // 1. Check cache first
// //   const cached = geoCache.get(ip);
// //   if (cached) {
// //     console.log(`[Geo]  Returning cached data`);
// //     return cached;
// //   }

// //   // 2. Validate IP
// //   if (!isValidIP(ip)) {
// //     console.log(`[Geo]  Invalid IP format: ${ip}`);
    
// //     //  Return mock data instead of null for invalid IPs in dev
// //     if (process.env.NODE_ENV === 'development') {
// //       const mockData = getMockGeoData(ip);
// //       geoCache.set(ip, mockData);
// //       return mockData;
// //     }
    
// //     return { country: null, city: null };
// //   }

// //   // 3. Handle private IPs
// //   if (isPrivateIP(ip)) {
// //     console.log(`[Geo] 🏠 Private/Local IP detected`);
    
// //     //  ALWAYS return mock data for private IPs in development
// //     const mockData = getMockGeoData(ip);
// //     geoCache.set(ip, mockData);
// //     return mockData;
// //   }

// //   // 4. Try providers in order (only for public IPs)
// //   const providers = [
// //     { name: 'ip-api.com', fn: fetchFromIPAPI },
// //     { name: 'ipapi.co', fn: fetchFromIPAPICo },
// //     { name: 'ipgeolocation.io', fn: fetchFromIPGeolocation },
// //   ];

// //   let lastError: Error | null = null;

// //   for (const provider of providers) {
// //     try {
// //       console.log(`[Geo] 🔄 Trying ${provider.name}...`);
// //       const geoData = await provider.fn(ip);
      
// //       // Validate we got useful data
// //       if (geoData.country || geoData.city) {
// //         console.log(`[Geo]  Success with ${provider.name}: ${geoData.city}, ${geoData.country}`);
// //         geoCache.set(ip, geoData);
// //         return geoData;
// //       } else {
// //         console.log(`[Geo]  ${provider.name} returned empty data`);
// //       }
// //     } catch (error: any) {
// //       console.error(`[Geo]  ${provider.name} failed:`, error.message);
// //       lastError = error;
      
// //       if (error.message.includes('rate limit') || error.message.includes('429')) {
// //         console.log(`[Geo] ⏭️ Rate limit hit, trying next provider...`);
// //         continue;
// //       }
      
// //       await new Promise(resolve => setTimeout(resolve, 500));
// //     }
// //   }

// //   // 5. All providers failed - return mock data in development
// //   console.error(`[Geo]  All providers failed. Last error:`, lastError?.message);
  
// //   const mockData = getMockGeoData(ip);
// //   geoCache.set(ip, mockData);
// //   return mockData;
// // }
// // /**
// //  * Extract IP address from Next.js request headers
// //  */
// // export function getClientIP(headers: Headers): string {
// //   // Try different headers in order of reliability
// //   const ipSources = [
// //     headers.get('cf-connecting-ip'),           // CloudFlare
// //     headers.get('x-real-ip'),                  // Nginx
// //     headers.get('x-forwarded-for')?.split(',')[0].trim(), // Load balancer
// //     headers.get('x-client-ip'),                // Apache
// //     headers.get('x-forwarded'),
// //     headers.get('forwarded-for'),
// //     headers.get('forwarded'),
// //   ];

// //   for (const ip of ipSources) {
// //     if (ip && ip !== 'unknown' && isValidIP(ip)) {
// //       console.log(`[IP Detection] Found IP: ${ip}`);
// //       return ip;
// //     }
// //   }

// //   console.log(`[IP Detection]  No valid IP found in headers`);
// //   return 'unknown';
// // }

// // /**
// //  * Get device type from user agent
// //  */
// // export function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
// //   if (!userAgent) return 'desktop';
  
// //   if (/iPad/i.test(userAgent)) return 'tablet';
// //   if (/tablet/i.test(userAgent)) return 'tablet';
// //   if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) return 'mobile';
  
// //   return 'desktop';
// // }

// // /**
// //  * Parse browser from user agent
// //  */
// // export function getBrowser(userAgent: string): string {
// //   if (!userAgent) return 'Unknown';
  
// //   // Order matters - check specific browsers first
// //   if (userAgent.includes('Edg/')) return 'Edge';
// //   if (userAgent.includes('OPR/') || userAgent.includes('Opera')) return 'Opera';
// //   if (userAgent.includes('Chrome/')) return 'Chrome';
// //   if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) return 'Safari';
// //   if (userAgent.includes('Firefox/')) return 'Firefox';
// //   if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
  
// //   return 'Unknown';
// // }

// // /**
// //  * Parse OS from user agent
// //  */
// // export function getOS(userAgent: string): string {
// //   if (!userAgent) return 'Unknown';
  
// //   if (userAgent.includes('Windows NT 10')) return 'Windows 10';
// //   if (userAgent.includes('Windows NT 11')) return 'Windows 11';
// //   if (userAgent.includes('Windows')) return 'Windows';
// //   if (userAgent.includes('Mac OS X')) return 'macOS';
// //   if (userAgent.includes('Linux')) return 'Linux';
// //   if (userAgent.includes('Android')) return 'Android';
// //   if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  
// //   return 'Unknown';
// // }

// // /**
// //  * Get complete subscriber metadata from request
// //  */
// // export async function getSubscriberMetadata(
// //   ip: string,
// //   userAgent: string
// // ): Promise<{
// //   country: string | null;
// //   city: string | null;
// //   device_type: 'mobile' | 'tablet' | 'desktop';
// //   browser: string;
// //   os: string;
// // }> {
// //   console.log(`\n[Metadata] Gathering for IP: ${ip}`);
// //   console.log(`[Metadata] User-Agent: ${userAgent.substring(0, 100)}...`);
  
// //   const geoData = await getGeolocation(ip);
// //   const metadata = {
// //     country: geoData.country,
// //     city: geoData.city,
// //     device_type: getDeviceType(userAgent),
// //     browser: getBrowser(userAgent),
// //     os: getOS(userAgent)
// //   };
  
// //   console.log(`[Metadata]  Result:`, metadata);
// //   return metadata;
// // }

// // // ============================================================================
// // // TESTING / DEBUG FUNCTIONS
// // // ============================================================================

// // /**
// //  * Test geolocation with a known IP
// //  * Usage: await testGeolocation('8.8.8.8')
// //  */
// // export async function testGeolocation(testIP: string = '8.8.8.8'): Promise<void> {
// //   console.log(`\n🧪 [Test] Testing geolocation with IP: ${testIP}`);
// //   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
// //   try {
// //     const result = await getGeolocation(testIP);
// //     console.log('\n [Test] Result:', JSON.stringify(result, null, 2));
// //   } catch (error: any) {
// //     console.error('\n [Test] Failed:', error.message);
// //   }
  
// //   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
// // }

// // /**
// //  * Clear the geolocation cache
// //  */
// // export function clearGeoCache(): void {
// //   geoCache.clear();
// // }

// // // ============================================================================
// // // EXPORTS
// // // ============================================================================

// // export default {
// //   getGeolocation,
// //   getClientIP,
// //   getDeviceType,
// //   getBrowser,
// //   getOS,
// //   getSubscriberMetadata,
// //   testGeolocation,
// //   clearGeoCache,
// // };



































// // lib/geolocation-service.ts
// /**
//  * Production-Ready Geolocation Service
//  * 
//  * Features:
//  *  Accurate device detection (mobile/tablet/desktop)
//  *  Precise browser identification
//  *  OS detection with version numbers
//  *  Multi-provider IP geolocation with fallback
//  *  Smart caching (1 hour TTL)
//  *  IPv6 support
//  *  Private IP handling
//  *  Development mock data
//  */

// interface GeoLocation {
//   country: string | null;
//   city: string | null;
//   countryName?: string | null;
//   latitude?: number | null;
//   longitude?: number | null;
//   timezone?: string | null;
//   region?: string | null;
// }

// // ============================================================================
// // CACHE IMPLEMENTATION
// // ============================================================================

// class GeoCache {
//   private cache: Map<string, { data: GeoLocation; timestamp: number }>;
//   private readonly TTL = 60 * 60 * 1000; // 1 hour

//   constructor() {
//     this.cache = new Map();
//   }

//   get(ip: string): GeoLocation | null {
//     const cached = this.cache.get(ip);
//     if (cached && Date.now() - cached.timestamp < this.TTL) {
//       console.log(`[GeoCache] Hit for ${ip}`);
//       return cached.data;
//     }
//     if (cached) {
//       this.cache.delete(ip);
//     }
//     return null;
//   }

//   set(ip: string, data: GeoLocation): void {
//     this.cache.set(ip, { data, timestamp: Date.now() });
//     const city = data?.city || 'unknown';
//     const country = data?.country || 'unknown';
//     console.log(`[GeoCache] Stored ${ip}: ${city}, ${country}`);
//     this.cleanOldEntries();
//   }

//   private cleanOldEntries(): void {
//     const now = Date.now();
//     for (const [ip, entry] of this.cache.entries()) {
//       if (now - entry.timestamp > this.TTL) {
//         this.cache.delete(ip);
//       }
//     }
//   }

//   clear(): void {
//     this.cache.clear();
//   }
// }

// const geoCache = new GeoCache();

// // ============================================================================
// // IP VALIDATION
// // ============================================================================

// /**
//  * Normalize IPv6-mapped IPv4 addresses
//  * Converts ::ffff:127.0.0.1 to 127.0.0.1
//  */
// function normalizeIP(ip: string): string {
//   if (!ip) return 'unknown';
  
//   // Handle IPv6-mapped IPv4
//   if (ip.startsWith('::ffff:')) {
//     return ip.substring(7);
//   }
  
//   return ip.trim();
// }

// /**
//  * Check if IP is private/local
//  */
// function isPrivateIP(ip: string): boolean {
//   if (!ip || ip === 'unknown') return true;
  
//   // Localhost
//   if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  
//   // IPv4 private ranges
//   if (ip.startsWith('10.')) return true;
//   if (ip.startsWith('192.168.')) return true;
//   if (ip.startsWith('169.254.')) return true; // Link-local
  
//   // 172.16.0.0 - 172.31.255.255
//   const octets = ip.split('.');
//   if (octets[0] === '172') {
//     const second = parseInt(octets[1] || '0');
//     if (second >= 16 && second <= 31) return true;
//   }
  
//   return false;
// }

// /**
//  * Validate IP format
//  */
// function isValidIP(ip: string): boolean {
//   if (!ip || ip === 'unknown') return false;
  
//   // IPv4 validation
//   const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
//   if (ipv4Regex.test(ip)) {
//     const parts = ip.split('.');
//     return parts.every(part => {
//       const num = parseInt(part);
//       return num >= 0 && num <= 255;
//     });
//   }
  
//   // IPv6 validation (simplified)
//   if (ip.includes(':')) {
//     return /^[0-9a-fA-F:]+$/.test(ip);
//   }
  
//   return false;
// }

// // ============================================================================
// // MOCK DATA FOR DEVELOPMENT
// // ============================================================================

// /**
//  * Get mock geolocation data for development/testing
//  * Returns consistent data based on IP hash
//  */
// function getMockGeoData(ip: string): GeoLocation {
//   console.log(`[Geo] Using mock data for development IP: ${ip}`);
  
//   const mockLocations: GeoLocation[] = [
//     { 
//       country: 'KE', 
//       city: 'Nairobi', 
//       countryName: 'Kenya', 
//       latitude: -1.2921, 
//       longitude: 36.8219, 
//       timezone: 'Africa/Nairobi', 
//       region: 'Nairobi County' 
//     },
//     { 
//       country: 'US', 
//       city: 'New York', 
//       countryName: 'United States', 
//       latitude: 40.7128, 
//       longitude: -74.0060, 
//       timezone: 'America/New_York', 
//       region: 'New York' 
//     },
//     { 
//       country: 'GB', 
//       city: 'London', 
//       countryName: 'United Kingdom', 
//       latitude: 51.5074, 
//       longitude: -0.1278, 
//       timezone: 'Europe/London', 
//       region: 'England' 
//     },
//   ];
  
//   // Hash IP to consistently return same mock data
//   const hash = ip.split(/[.:]/).reduce((acc, part) => acc + (parseInt(part) || 0), 0);
//   const mockData = mockLocations[hash % mockLocations.length];
  
//   console.log(`[Geo] Mock data:`, mockData);
//   return mockData;
// }

// // ============================================================================
// // GEOLOCATION PROVIDERS
// // ============================================================================

// /**
//  * Provider 1: ip-api.com (Free, no key needed)
//  */
// async function fetchFromIPAPI(ip: string): Promise<GeoLocation> {
//   console.log(`[ip-api.com] Fetching for ${ip}...`);
  
//   const response = await fetch(
//     `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone`,
//     {
//       headers: { 'User-Agent': 'PushFlow-Service/1.0' },
//       signal: AbortSignal.timeout(8000)
//     }
//   );

//   if (!response.ok) {
//     throw new Error(`HTTP ${response.status}`);
//   }

//   const data = await response.json();
//   console.log(`[ip-api.com] Response:`, { status: data.status, message: data.message });

//   if (data.status === 'fail') {
//     throw new Error(data.message || 'IP lookup failed');
//   }

//   if (data.status !== 'success') {
//     throw new Error('Unexpected response');
//   }

//   return {
//     country: data.countryCode || null,
//     city: data.city || null,
//     countryName: data.country || null,
//     latitude: data.lat || null,
//     longitude: data.lon || null,
//     timezone: data.timezone || null,
//     region: data.regionName || data.region || null,
//   };
// }

// /**
//  * Provider 2: ipapi.co (Freemium)
//  */
// async function fetchFromIPAPICo(ip: string): Promise<GeoLocation> {
//   console.log(`[ipapi.co] Fetching for ${ip}...`);
  
//   const apiKey = process.env.IPAPI_CO_API_KEY;
//   const url = apiKey 
//     ? `https://ipapi.co/${ip}/json/?key=${apiKey}`
//     : `https://ipapi.co/${ip}/json/`;

//   const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

//   if (!response.ok) {
//     throw new Error(`HTTP ${response.status}: Too Many Requests`);
//   }

//   const data = await response.json();

//   if (data.error) {
//     throw new Error(data.reason || 'API error');
//   }

//   return {
//     country: data.country_code || null,
//     city: data.city || null,
//     countryName: data.country_name || null,
//     latitude: data.latitude || null,
//     longitude: data.longitude || null,
//     timezone: data.timezone || null,
//     region: data.region || null,
//   };
// }

// /**
//  * Provider 3: ipgeolocation.io (Requires API key)
//  */
// async function fetchFromIPGeolocation(ip: string): Promise<GeoLocation> {
//   console.log(`[ipgeolocation.io] Fetching for ${ip}...`);
  
//   const apiKey = process.env.IPGEOLOCATION_API_KEY;
//   if (!apiKey) {
//     throw new Error('IPGEOLOCATION_API_KEY not configured');
//   }
  
//   const response = await fetch(
//     `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ip}`,
//     { signal: AbortSignal.timeout(8000) }
//   );

//   if (!response.ok) {
//     throw new Error(`HTTP ${response.status}`);
//   }

//   const data = await response.json();

//   if (data.message) {
//     throw new Error(data.message);
//   }

//   return {
//     country: data.country_code2 || null,
//     city: data.city || null,
//     countryName: data.country_name || null,
//     latitude: parseFloat(data.latitude) || null,
//     longitude: parseFloat(data.longitude) || null,
//     timezone: data.time_zone?.name || null,
//     region: data.state_prov || null,
//   };
// }

// // ============================================================================
// // MAIN GEOLOCATION FUNCTION
// // ============================================================================

// export async function getGeolocation(ip: string): Promise<GeoLocation> {
//   console.log(`\n[Geo] 🌍 Getting location for IP: ${ip}`);
  
//   // Normalize IP (handle IPv6-mapped IPv4)
//   const normalizedIP = normalizeIP(ip);
//   console.log(`[Geo] Normalized IP: ${normalizedIP}`);
  
//   // Check cache
//   const cached = geoCache.get(normalizedIP);
//   if (cached) {
//     console.log(`[Geo]  Returning cached data`);
//     return cached;
//   }

//   // Handle private/local IPs
//   if (isPrivateIP(normalizedIP)) {
//     console.log(`[Geo] 🏠 Private/Local IP detected`);
//     const mockData = getMockGeoData(normalizedIP);
//     geoCache.set(normalizedIP, mockData);
//     return mockData;
//   }

//   // Validate IP format
//   if (!isValidIP(normalizedIP)) {
//     console.log(`[Geo]  Invalid IP format`);
//     const mockData = getMockGeoData(normalizedIP);
//     geoCache.set(normalizedIP, mockData);
//     return mockData;
//   }

//   // Try providers in order
//   const providers = [
//     { name: 'ip-api.com', fn: fetchFromIPAPI },
//     { name: 'ipapi.co', fn: fetchFromIPAPICo },
//     { name: 'ipgeolocation.io', fn: fetchFromIPGeolocation },
//   ];

//   for (const provider of providers) {
//     try {
//       console.log(`[Geo] 🔄 Trying ${provider.name}...`);
//       const geoData = await provider.fn(normalizedIP);
      
//       if (geoData.country || geoData.city) {
//         console.log(`[Geo]  Success: ${geoData.city}, ${geoData.country}`);
//         geoCache.set(normalizedIP, geoData);
//         return geoData;
//       }
//     } catch (error: any) {
//       console.error(`[Geo]  ${provider.name} failed:`, error.message);
      
//       if (error.message.includes('429') || error.message.includes('rate limit')) {
//         console.log(`[Geo] ⏭️ Rate limit, trying next...`);
//         continue;
//       }
//     }
//   }

//   // All providers failed - return mock data
//   console.log(`[Geo] Using mock data for development IP: ${normalizedIP}`);
//   const mockData = getMockGeoData(normalizedIP);
//   geoCache.set(normalizedIP, mockData);
//   return mockData;
// }

// // ============================================================================
// // DEVICE & BROWSER DETECTION
// // ============================================================================

// /**
//  * Extract IP from request headers
//  */
// export function getClientIP(headers: Headers): string {
//   const ipSources = [
//     headers.get('cf-connecting-ip'),
//     headers.get('x-real-ip'),
//     headers.get('x-forwarded-for')?.split(',')[0].trim(),
//     headers.get('x-client-ip'),
//     headers.get('forwarded'),
//   ];

//   for (const ip of ipSources) {
//     if (ip && ip !== 'unknown') {
//       const normalized = normalizeIP(ip);
//       console.log(`[IP Detection] Found IP: ${normalized}`);
//       return normalized;
//     }
//   }

//   console.log(`[IP Detection] No valid IP found, using localhost`);
//   return '127.0.0.1';
// }

// /**
//  * ENHANCED: Get device type with tablet detection
//  */
// export function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
//   if (!userAgent) return 'desktop';
  
//   const ua = userAgent.toLowerCase();
  
//   // Tablet detection (check BEFORE mobile)
//   if (
//     /ipad/.test(ua) ||
//     /tablet/.test(ua) ||
//     (/android/.test(ua) && !/mobile/.test(ua)) ||
//     /kindle/.test(ua) ||
//     /silk/.test(ua) ||
//     /playbook/.test(ua)
//   ) {
//     return 'tablet';
//   }
  
//   // Mobile detection
//   if (
//     /mobile/.test(ua) ||
//     /android/.test(ua) ||
//     /iphone/.test(ua) ||
//     /ipod/.test(ua) ||
//     /blackberry/.test(ua) ||
//     /iemobile/.test(ua) ||
//     /opera mini/.test(ua) ||
//     /mobile safari/.test(ua)
//   ) {
//     return 'mobile';
//   }
  
//   // Default to desktop
//   return 'desktop';
// }

// /**
//  * ENHANCED: Get browser with version
//  */
// export function getBrowser(userAgent: string): string {
//   if (!userAgent) return 'Unknown';
  
//   // Order matters - check specific browsers first
//   if (/edg\//i.test(userAgent)) {
//     const match = userAgent.match(/edg\/(\d+)/i);
//     return match ? `Edge ${match[1]}` : 'Edge';
//   }
  
//   if (/opr\//i.test(userAgent) || /opera/i.test(userAgent)) {
//     const match = userAgent.match(/(?:opr|opera)\/(\d+)/i);
//     return match ? `Opera ${match[1]}` : 'Opera';
//   }
  
//   if (/chrome\//i.test(userAgent) && !/edg/i.test(userAgent)) {
//     const match = userAgent.match(/chrome\/(\d+)/i);
//     return match ? `Chrome ${match[1]}` : 'Chrome';
//   }
  
//   if (/safari\//i.test(userAgent) && !/chrome/i.test(userAgent)) {
//     const match = userAgent.match(/version\/(\d+)/i);
//     return match ? `Safari ${match[1]}` : 'Safari';
//   }
  
//   if (/firefox\//i.test(userAgent)) {
//     const match = userAgent.match(/firefox\/(\d+)/i);
//     return match ? `Firefox ${match[1]}` : 'Firefox';
//   }
  
//   if (/msie|trident/i.test(userAgent)) {
//     return 'Internet Explorer';
//   }
  
//   return 'Unknown';
// }

// /**
//  * ENHANCED: Get OS with version
//  */
// export function getOS(userAgent: string): string {
//   if (!userAgent) return 'Unknown';
  
//   // Windows
//   if (/windows nt 10\.0/i.test(userAgent)) return 'Windows 10';
//   if (/windows nt 11\.0/i.test(userAgent)) return 'Windows 11';
//   if (/windows nt 6\.3/i.test(userAgent)) return 'Windows 8.1';
//   if (/windows nt 6\.2/i.test(userAgent)) return 'Windows 8';
//   if (/windows nt 6\.1/i.test(userAgent)) return 'Windows 7';
//   if (/windows/i.test(userAgent)) return 'Windows';
  
//   // macOS
//   if (/mac os x (\d+)[_.](\d+)/i.test(userAgent)) {
//     const match = userAgent.match(/mac os x (\d+)[_.](\d+)/i);
//     if (match) return `macOS ${match[1]}.${match[2]}`;
//   }
//   if (/mac os x/i.test(userAgent)) return 'macOS';
  
//   // iOS
//   if (/iphone os (\d+)/i.test(userAgent)) {
//     const match = userAgent.match(/iphone os (\d+)/i);
//     return match ? `iOS ${match[1]}` : 'iOS';
//   }
//   if (/ipad.*os (\d+)/i.test(userAgent)) {
//     const match = userAgent.match(/ipad.*os (\d+)/i);
//     return match ? `iPadOS ${match[1]}` : 'iPadOS';
//   }
//   if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
  
//   // Android
//   if (/android (\d+)/i.test(userAgent)) {
//     const match = userAgent.match(/android (\d+)/i);
//     return match ? `Android ${match[1]}` : 'Android';
//   }
//   if (/android/i.test(userAgent)) return 'Android';
  
//   // Linux
//   if (/linux/i.test(userAgent)) return 'Linux';
  
//   return 'Unknown';
// }

// /**
//  * Get complete metadata
//  */
// export async function getSubscriberMetadata(
//   ip: string,
//   userAgent: string
// ): Promise<{
//   country: string | null;
//   city: string | null;
//   device_type: 'mobile' | 'tablet' | 'desktop';
//   browser: string;
//   os: string;
// }> {
//   console.log(`\n[Metadata] Gathering for IP: ${ip}`);
//   console.log(`[Metadata] User-Agent: ${userAgent.substring(0, 100)}...`);
  
//   const geoData = await getGeolocation(ip);
//   const metadata = {
//     country: geoData.country,
//     city: geoData.city,
//     device_type: getDeviceType(userAgent),
//     browser: getBrowser(userAgent),
//     os: getOS(userAgent)
//   };
  
//   console.log(`[Metadata]  Result:`, metadata);
//   return metadata;
// }

// // ============================================================================
// // TESTING UTILITIES
// // ============================================================================

// export async function testGeolocation(testIP: string = '8.8.8.8'): Promise<void> {
//   console.log(`\n🧪 Testing geolocation with IP: ${testIP}`);
//   console.log('━'.repeat(50));
  
//   try {
//     const result = await getGeolocation(testIP);
//     console.log('\n Result:', JSON.stringify(result, null, 2));
//   } catch (error: any) {
//     console.error('\n Failed:', error.message);
//   }
  
//   console.log('━'.repeat(50) + '\n');
// }

// export function clearGeoCache(): void {
//   geoCache.clear();
// }

// // ============================================================================
// // EXPORTS
// // ============================================================================

// export default {
//   getGeolocation,
//   getClientIP,
//   getDeviceType,
//   getBrowser,
//   getOS,
//   getSubscriberMetadata,
//   testGeolocation,
//   clearGeoCache,
// };









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
  console.log(`\n[Geo] 🌍 Getting location for IP: ${ip}`);
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
      console.log(`[Geo] 🔄 Trying ${provider.name}...`);
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
        console.log(`[Geo] ⏭️ Rate limit hit, trying next provider...`);
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
  console.log(`🧪 TESTING GEOLOCATION`);
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