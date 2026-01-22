import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/auth-middleware';

// Coupon codes with their discounts
const COUPONS: Record<string, { discount: number; type: 'percent' | 'fixed'; description: string }> = {
  'LAUNCH50': { discount: 50, type: 'percent', description: '50% off first month' },
  'SAVE20': { discount: 20, type: 'percent', description: '20% off' },
  'WELCOME10': { discount: 10, type: 'fixed', description: '$10 off' },
};

export const POST = withAuth(
  async (req: NextRequest, user: AuthUser) => {
    try {
      const { coupon_code, plan_price } = await req.json();

      const coupon = COUPONS[coupon_code.toUpperCase()];
      
      if (!coupon) {
        return NextResponse.json(
          { error: 'Invalid coupon code' },
          { status: 400 }
        );
      }

      let finalPrice = plan_price;
      if (coupon.type === 'percent') {
        finalPrice = plan_price * (1 - coupon.discount / 100);
      } else {
        finalPrice = Math.max(0, plan_price - coupon.discount);
      }

      return NextResponse.json({
        success: true,
        coupon: {
          code: coupon_code.toUpperCase(),
          ...coupon,
        },
        original_price: plan_price,
        final_price: finalPrice,
        savings: plan_price - finalPrice,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Failed to validate coupon', details: error.message },
        { status: 500 }
      );
    }
  }
);