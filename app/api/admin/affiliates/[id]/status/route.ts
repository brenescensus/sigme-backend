// app/api/admin/affiliates/[id]/status/route.ts
// Admin: Approve/Reject/Suspend affiliate

import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, logAdminActivity } from '@/lib/admin-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const PATCH = withAdmin(async (
  req: NextRequest,
  adminUser,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    // FIXED: Await params before destructuring
    const { id } = await context.params;
    const body = await req.json();
    const { status, notes } = body;
    const adminId = adminUser.id;

    if (!['active', 'rejected', 'suspended'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
      notes,
      updated_at: new Date().toISOString()
    };

    if (status === 'active') {
      updateData.approved_by = adminId;
      updateData.approved_at = new Date().toISOString();
    }

    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log admin activity
    await logAdminActivity(
      adminId,
      `affiliate_${status}`,
      'affiliate',
      id,
      { status, notes }
    );

    return NextResponse.json({
      success: true,
      message: `Affiliate ${status} successfully`,
      affiliate
    });

  } catch (error: any) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});