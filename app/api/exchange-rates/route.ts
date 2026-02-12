// app/api/exchange-rates/route.ts
import { NextResponse } from 'next/server';
import { getExchangeRates } from '@/lib/currency/currency-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rates = await getExchangeRates();
    
    return NextResponse.json({
      success: true,
      rates,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(' Error fetching exchange rates:', error);
    
    // Return fallback rates on error
    return NextResponse.json({
      success: false,
      error: error.message,
      rates: {
        NGN: 1580,
        KES: 129,
        GHS: 15.5,
        ZAR: 18.5,
        USD: 1,
      },
      timestamp: new Date().toISOString(),
    }, { status: 200 }); // Still return 200 with fallback data
  }
}