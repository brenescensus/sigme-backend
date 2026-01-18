

//  app/api/websites/[id]/route.ts
// Individual website operations

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

  //  GET - Get specific website

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      website: data,
    });
  } catch (error) {
    console.error('[Website GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH - Update website (partial update)
============================================================ */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateWebsite(req, params);
}

/* ============================================================
   PUT - Update website (full update)
============================================================ */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateWebsite(req, params);
}

/* ============================================================
   Shared update logic
============================================================ */
async function updateWebsite(
  req: NextRequest,
  params: Promise<{ id: string }>
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, url, domain, status,description } = body;

    // Build update object only with provided fields
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (domain !== undefined) updates.domain = domain;
    if (status !== undefined) updates.status = status;
    if (description !== undefined) updates.description = description; // Add this


    const { data, error } = await supabase
      .from('websites')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Website not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      website: data,
    });
  } catch (error) {
    console.error('[Website UPDATE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/* ============================================================
   DELETE - Soft delete website
============================================================ */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('websites')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Website not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Website deleted successfully',
    });
  } catch (error) {
    console.error('[Website DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}