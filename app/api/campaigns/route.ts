import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - List campaigns
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();


    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('websiteId');
    const status = searchParams.get('status');

    if (!websiteId) {
      return NextResponse.json(
        { error: 'websiteId parameter is required' },
        { status: 400 }
      );
    }

    // Verify website ownership
    const { data: website } = await supabase
      .from('websites')
      .select('id')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    let query = supabase
      .from('campaigns')
      .select('*')
      .eq('website_id', websiteId);

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaigns: data,
    });
  } catch (error: any) {
    console.error('[Campaigns GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create campaign
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();


    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { websiteId, name, title, body: notifBody, iconUrl, imageUrl, clickUrl, scheduledFor } = body;

    if (!websiteId || !name || !title || !notifBody) {
      return NextResponse.json(
        { error: 'Required: websiteId, name, title, body' },
        { status: 400 }
      );
    }

    // Verify website ownership
    const { data: website } = await supabase
      .from('websites')
      .select('id')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found or access denied' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        website_id: websiteId,
        name,
        title,
        body: notifBody,
        icon_url: iconUrl,
        image_url: imageUrl,
        click_url: clickUrl,
        status: scheduledFor ? 'scheduled' : 'draft',
        scheduled_for: scheduledFor,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaign: data,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Campaigns POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}