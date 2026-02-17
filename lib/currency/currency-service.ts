// lib/currency/currency-service.ts

interface ExchangeRates {
  [currency: string]: number;
}

interface CurrencyResponse {
  rates: ExchangeRates;
  base: string;
  timestamp: number;
}

// Cache exchange rates for 1 hour
let cachedRates: CurrencyResponse | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Fetch current exchange rates from USD to other currencies
 * Using exchangerate-api.com (free tier: 1,500 requests/month)
 * Alternative: openexchangerates.org, currencyapi.com
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (cachedRates && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('💰 Using cached exchange rates');
    return cachedRates.rates;
  }

  try {
    // Free API - no key required for basic usage
    // For production, sign up at https://www.exchangerate-api.com/
    const API_KEY = process.env.EXCHANGE_RATE_API_KEY || 'YOUR_API_KEY';
    const BASE_URL = API_KEY !== 'YOUR_API_KEY' 
      ? `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`
      : 'https://api.exchangerate-api.com/v4/latest/USD'; // Fallback free endpoint

    console.log('🔄 Fetching fresh exchange rates...');
    
    const response = await fetch(BASE_URL, {
      next: { revalidate: 3600 }, // Cache for 1 hour in Next.js
    });

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Normalize response format (different APIs have different structures)
    const rates: ExchangeRates = data.conversion_rates || data.rates || {};

    cachedRates = {
      rates,
      base: 'USD',
      timestamp: now,
    };
    cacheTimestamp = now;

    console.log('Exchange rates updated:', {
      NGN: rates.NGN,
      KES: rates.KES,
      GHS: rates.GHS,
      ZAR: rates.ZAR,
      timestamp: new Date(now).toISOString(),
    });

    return rates;
  } catch (error) {
    console.error(' Failed to fetch exchange rates:', error);
    
    // Fallback to approximate rates if API fails
    console.log(' Using fallback exchange rates');
    return getFallbackRates();
  }
}

/**
 * Fallback rates in case API is unavailable
 * These should be updated periodically
 */
function getFallbackRates(): ExchangeRates {
  return {
    NGN: 1580,  // Nigerian Naira
    KES: 129,   // Kenyan Shilling
    GHS: 15.5,  // Ghanaian Cedi
    ZAR: 18.5,  // South African Rand
    USD: 1,
  };
}

/**
 * Convert amount from USD to target currency
 */
export async function convertCurrency(
  amountUSD: number,
  targetCurrency: string
): Promise<number> {
  const rates = await getExchangeRates();
  const rate = rates[targetCurrency];

  if (!rate) {
    throw new Error(`Exchange rate not found for currency: ${targetCurrency}`);
  }

  return Math.round(amountUSD * rate);
}

/**
 * Get a specific exchange rate
 */
export async function getExchangeRate(currency: string): Promise<number> {
  const rates = await getExchangeRates();
  const rate = rates[currency];

  if (!rate) {
    throw new Error(`Exchange rate not found for currency: ${currency}`);
  }

  return rate;
}

/**
 * Clear the exchange rate cache (useful for testing)
 */
export function clearExchangeRateCache(): void {
  cachedRates = null;
  cacheTimestamp = 0;
  console.log('🗑️ Exchange rate cache cleared');
}