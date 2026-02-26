// // app/api/pricing-plans/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';

// // Use service role for public endpoint (no auth required)
// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// export async function GET(req: NextRequest) {
//   try {
//     // Get only active plans, ordered by display_order
//     const { data: plans, error } = await supabase
//       .from('pricing_plans')
//       .select('*')
//       .eq('is_active', true)
//       .order('display_order', { ascending: true });

//     if (error) throw error;

//     return NextResponse.json({
//       success: true,
//       plans: plans || [],
//     });
//   } catch (error: any) {
//     console.error(' Error fetching pricing plans:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to fetch pricing plans' },
//       { status: 500 }
//     );
//   }
// }


// app/api/pricing-plans/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// VPS-compatible (Nginx / Caddy / Apache) — zero Vercel/Cloudflare dependency.
// Geo-detects the visitor's currency via ip-api.com (free, no key, 45 req/min).
// Falls back to USD if the lookup fails or the IP is private.
// Supports every ISO 4217 currency / country on Earth.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Complete ISO 3166-1 alpha-2 → ISO 4217 currency map ─────────────────────
// Every UN-recognized state + widely-used territories
const COUNTRY_CURRENCY: Record<string, string> = {
  // ── North America ──────────────────────────────────────────────────────────
  US: 'USD', CA: 'CAD', MX: 'MXN',
  GT: 'GTQ', BZ: 'BZD', HN: 'HNL', SV: 'USD', NI: 'NIO', CR: 'CRC', PA: 'PAB',
  CU: 'CUP', JM: 'JMD', HT: 'HTG', DO: 'DOP', PR: 'USD', TT: 'TTD',
  BB: 'BBD', LC: 'XCD', VC: 'XCD', GD: 'XCD', AG: 'XCD', DM: 'XCD', KN: 'XCD',
  BS: 'BSD', TC: 'USD', KY: 'KYD', BM: 'BMD',
  VG: 'USD', VI: 'USD', AW: 'AWG', CW: 'ANG', SX: 'ANG', BQ: 'USD',
  MF: 'EUR', GP: 'EUR', MQ: 'EUR', PM: 'EUR', GL: 'DKK',

  // ── South America ──────────────────────────────────────────────────────────
  BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', VE: 'VES', PE: 'PEN',
  EC: 'USD', BO: 'BOB', PY: 'PYG', UY: 'UYU', GY: 'GYD', SR: 'SRD',
  GF: 'EUR', FK: 'FKP',

  // ── Western Europe ─────────────────────────────────────────────────────────
  GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR',
  PT: 'EUR', NL: 'EUR', BE: 'EUR', LU: 'EUR', AT: 'EUR',
  CH: 'CHF', LI: 'CHF',
  MC: 'EUR', AD: 'EUR', SM: 'EUR', VA: 'EUR',
  MT: 'EUR', CY: 'EUR', GR: 'EUR',
  FI: 'EUR', SE: 'SEK', NO: 'NOK', DK: 'DKK', IS: 'ISK',
  FO: 'DKK', GG: 'GBP', JE: 'GBP', IM: 'GBP',

  // ── Central & Eastern Europe ───────────────────────────────────────────────
  PL: 'PLN', CZ: 'CZK', SK: 'EUR', HU: 'HUF', RO: 'RON', BG: 'BGN',
  HR: 'EUR', SI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR',
  BY: 'BYN', UA: 'UAH', MD: 'MDL',
  RS: 'RSD', ME: 'EUR', MK: 'MKD', AL: 'ALL', BA: 'BAM', XK: 'EUR',
  TR: 'TRY',

  // ── Russia & Central Asia ──────────────────────────────────────────────────
  RU: 'RUB', KZ: 'KZT', UZ: 'UZS', TM: 'TMT', KG: 'KGS', TJ: 'TJS',
  AZ: 'AZN', AM: 'AMD', GE: 'GEL',

  // ── Middle East ────────────────────────────────────────────────────────────
  SA: 'SAR', AE: 'AED', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
  JO: 'JOD', IQ: 'IQD', IR: 'IRR', SY: 'SYP', LB: 'LBP', IL: 'ILS',
  PS: 'ILS', YE: 'YER',

  // ── South Asia ─────────────────────────────────────────────────────────────
  IN: 'INR', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR', BT: 'BTN',
  MV: 'MVR', AF: 'AFN',

  // ── Southeast Asia ─────────────────────────────────────────────────────────
  TH: 'THB', VN: 'VND', ID: 'IDR', MY: 'MYR', PH: 'PHP', SG: 'SGD',
  MM: 'MMK', KH: 'KHR', LA: 'LAK', BN: 'BND', TL: 'USD',

  // ── East Asia ──────────────────────────────────────────────────────────────
  CN: 'CNY', JP: 'JPY', KR: 'KRW', TW: 'TWD', HK: 'HKD', MO: 'MOP',
  MN: 'MNT', KP: 'KPW',

  // ── Oceania ────────────────────────────────────────────────────────────────
  AU: 'AUD', NZ: 'NZD', PG: 'PGK', FJ: 'FJD', SB: 'SBD', VU: 'VUV',
  WS: 'WST', TO: 'TOP', PF: 'XPF', NC: 'XPF',
  CK: 'NZD', NU: 'NZD', KI: 'AUD', NR: 'AUD', TV: 'AUD',
  PW: 'USD', FM: 'USD', MH: 'USD', GU: 'USD', MP: 'USD', AS: 'USD',

  // ── Sub-Saharan Africa — East ──────────────────────────────────────────────
  KE: 'KES', TZ: 'TZS', UG: 'UGX', RW: 'RWF', BI: 'BIF',
  ET: 'ETB', SO: 'SOS', DJ: 'DJF', ER: 'ERN', SS: 'SSP', SD: 'SDG',

  // ── Sub-Saharan Africa — West ──────────────────────────────────────────────
  NG: 'NGN', GH: 'GHS',
  SN: 'XOF', CI: 'XOF', BF: 'XOF', ML: 'XOF', NE: 'XOF', TG: 'XOF', BJ: 'XOF', GW: 'XOF',
  GN: 'GNF', SL: 'SLL', LR: 'LRD', GM: 'GMD', MR: 'MRU', CV: 'CVE',

  // ── Sub-Saharan Africa — Central ───────────────────────────────────────────
  CM: 'XAF', CF: 'XAF', TD: 'XAF', CG: 'XAF', GA: 'XAF', GQ: 'XAF',
  CD: 'CDF', ST: 'STN', AO: 'AOA',

  // ── Sub-Saharan Africa — Southern ──────────────────────────────────────────
  ZA: 'ZAR', ZW: 'ZWL', ZM: 'ZMW', MW: 'MWK', MZ: 'MZN',
  NA: 'NAD', BW: 'BWP', LS: 'LSL', SZ: 'SZL',
  MG: 'MGA', MU: 'MUR', SC: 'SCR', KM: 'KMF',
  RE: 'EUR', YT: 'EUR',

  // ── North Africa ───────────────────────────────────────────────────────────
  EG: 'EGP', LY: 'LYD', TN: 'TND', DZ: 'DZD', MA: 'MAD',

  // ── Remote territories ─────────────────────────────────────────────────────
  SH: 'SHP', IO: 'USD', TF: 'EUR', HM: 'AUD', GS: 'FKP', PN: 'NZD',
  AC: 'SHP', TA: 'SHP',
};

// ─── Extract real client IP (VPS / Nginx / Caddy) ────────────────────────────
function getClientIP(req: NextRequest): string {
  // Nginx: proxy_set_header X-Real-IP $remote_addr;
  // Caddy: sets X-Forwarded-For automatically
  const xRealIp      = req.headers.get('x-real-ip');
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const trueClientIp  = req.headers.get('true-client-ip');    // Some CDNs
  const cfConnecting  = req.headers.get('cf-connecting-ip');  // Cloudflare (optional)

  if (xRealIp)       return xRealIp.trim();
  if (cfConnecting)  return cfConnecting.trim();
  if (trueClientIp)  return trueClientIp.trim();
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();

  return '127.0.0.1';
}

// ─── IP → geo lookup via ip-api.com ──────────────────────────────────────────
// Free tier: 1,000 req/day (http only), no API key required.
// For higher volume, set IPAPI_KEY env var to use the pro endpoint (https).
async function detectGeo(ip: string): Promise<{ currency: string; country: string }> {
  const FALLBACK = { currency: 'USD', country: 'US' };

  // Skip RFC-1918 / loopback — dev environments
  if (
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('169.254.')
  ) {
    return FALLBACK;
  }

  try {
    const key = process.env.IPAPI_KEY; // optional pro key
    const url = key
      ? `https://pro.ip-api.com/json/${ip}?fields=status,countryCode&key=${key}`
      : `http://ip-api.com/json/${ip}?fields=status,countryCode`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(3000), // 3 s max
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return FALLBACK;

    const data: { status: string; countryCode?: string } = await res.json();

    if (data.status === 'success' && data.countryCode) {
      const country  = data.countryCode.toUpperCase();
      const currency = COUNTRY_CURRENCY[country] ?? 'USD';
      return { currency, country };
    }
  } catch {
    // Timeout or network error — fail silently
  }

  return FALLBACK;
}

// ─── GET /api/pricing-plans ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    // Manual override params for testing or frontend currency switcher
    const overrideCountry  = req.nextUrl.searchParams.get('country')?.toUpperCase();
    const overrideCurrency = req.nextUrl.searchParams.get('currency')?.toUpperCase();

    let resolvedCurrency: string;
    let resolvedCountry: string;

    if (overrideCurrency) {
      resolvedCurrency = overrideCurrency;
      resolvedCountry  = overrideCountry ?? 'US';
    } else if (overrideCountry) {
      resolvedCountry  = overrideCountry;
      resolvedCurrency = COUNTRY_CURRENCY[overrideCountry] ?? 'USD';
    } else {
      const ip  = getClientIP(req);
      const geo = await detectGeo(ip);
      resolvedCurrency = geo.currency;
      resolvedCountry  = geo.country;
    }

    // ── 1. Active plans ───────────────────────────────────────────────────────
    const { data: plans, error: plansErr } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (plansErr) throw plansErr;

    if (!plans?.length) {
      return NextResponse.json({
        success: true,
        plans: [],
        currency: resolvedCurrency,
        country: resolvedCountry,
      });
    }

    // ── 2. All active per-plan prices in one query ────────────────────────────
    const planIds = plans.map((p) => p.plan_id);
    const { data: allPrices, error: pricesErr } = await supabase
      .from('plan_prices')
      .select('*')
      .in('plan_id', planIds)
      .eq('is_active', true);

    if (pricesErr) throw pricesErr;

    // ── 3. Resolve best price per plan ───────────────────────────────────────
    //   Priority: detectedCurrency → USD → first available → plan.price (legacy)
    const resolvedPlans = plans.map((plan) => {
      const planPrices  = (allPrices ?? []).filter((p) => p.plan_id === plan.plan_id);
      const preferred   = planPrices.find((p) => p.currency === resolvedCurrency);
      const usdFallback = planPrices.find((p) => p.currency === 'USD');
      const anyFallback = planPrices[0] ?? null;
      const best        = preferred ?? usdFallback ?? anyFallback;

      return {
        ...plan,
        // What the frontend should display ↓
        resolved_currency:  best?.currency        ?? 'USD',
        resolved_symbol:    best?.currency_symbol ?? '$',
        resolved_monthly:   best?.monthly_price   ?? plan.price        ?? 0,
        resolved_yearly:    best?.yearly_price    ?? plan.yearly_price  ?? 0,
        // Let the frontend build a currency switcher if desired ↓
        available_prices:   planPrices,
      };
    });

    return NextResponse.json({
      success: true,
      plans: resolvedPlans,
      currency: resolvedCurrency,
      country: resolvedCountry,
    });
  } catch (error: any) {
    console.error('[pricing-plans] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message ?? 'Failed to fetch pricing plans' },
      { status: 500 }
    );
  }
}